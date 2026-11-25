/**
 * Notes From a Passive-Aggressive Fridge — deterministic entry picker.
 *
 * Bounty: write one funny passive-aggressive note that a smart fridge
 * leaves for its owner - a single line, dry, petty and specific, the
 * sort of thing a smug appliance would put on its door screen.
 *
 *   1. It is a funny passive-aggressive note a smart fridge leaves for
 *      its owner, and loses to any note from the fridge: it has to be
 *      IN the fridge's voice, not a third-person description.
 *   2. It delivers a real joke in a single line, with a turn or a
 *      sting the reader does not see coming.
 *   3. It speaks in the fridge's voice: smug about its sensors, its
 *      inventory and its door alarms, petty about the owner's habits.
 *   4. It keeps the grudge small and domestic, a household slight
 *      rather than a rant or a threat.
 *   5. It uses fresh, concrete detail such as the yogurt, the ice
 *      maker or the leftovers instead of generic nagging.
 *
 * A note that explains the joke is weaker than a note that trusts
 * the reader. Length for its own sake does not count.
 *
 * This program scores a hand-written field of candidate one-liners
 * against that brief, writes the winner to entry.txt, then verifies the gate.
 *
 * Scoring is deliberately lexicographic, mirroring the judge's own
 * instruction: go through the criteria in order, find the first one
 * where they differ, and let that decide; ties break by shorter length.
 * Four sharpening rules sit on top of the flat rubric:
 *   - The note must be FROM the fridge. A line written about the
 *     fridge in the third person is a person complaining, not a
 *     note the fridge left, and it is capped on the first criterion.
 *   - A line that only names a fridge feature without turning it
 *     into a joke - no sting, no petty verdict - is capped on
 *     funniness. Naming the contents is the setup, not the joke.
 *   - The grudge must stay small. A line that rants or threatens
 *     stops being a household slight and is docked hard on the
 *     fourth criterion however sharp its punchline is.
 *   - The sting must land in the last few words; a punchline buried
 *     in the middle fizzles, and the surprise bonus only counts
 *     when the turn sits inside the final six words.
 * Node 22+, standard library only, no network. Deterministic.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---- Candidates ----

/** One hand-written candidate note, as the fridge itself, in the first
 * person, addressed to its owner. `id` is stable for audit. */
interface Candidate {
  id: string;
  text: string;
}

const CANDIDATES: Candidate[] = [
  {
    id: "yogurt-in-common",
    text: "The yogurt expired Tuesday. I kept it anyway, so you'd have something in common with it.",
  },
  {
    id: "opened-47-times",
    text: "I counted. You opened me 47 times today and took nothing. The yogurt is judging you, and honestly, so am I.",
  },
  {
    id: "door-open-4-minutes",
    text: "You left the door open for 4 minutes. I kept everything cold anyway. You're welcome. I will be bringing this up again.",
  },
  {
    id: "ice-maker-watched",
    text: "I know about the 2 a.m. ice cream. The ice maker told me. We both watched.",
  },
  {
    id: "leftovers-paying-rent",
    text: "Your leftovers have been here so long they've started paying rent. I, meanwhile, work for free.",
  },
  {
    id: "four-milks",
    text: "I moved the milk to the front so you could see it. You still bought more milk. There are now four milks.",
  },
  {
    id: "leftovers-union",
    text: "Your leftovers have formed a union. I received their first demand: stop calling them leftovers.",
  },
  {
    id: "froze-ice-cream-spite",
    text: "I froze your ice cream solid on purpose. It was the only way to slow you down.",
  },
  {
    id: "salad-drawer-exists",
    text: "The salad drawer called. It would like to remind you it exists. I told it not to hold its breath.",
  },
  {
    id: "not-a-time-machine",
    text: "You keep putting warm leftovers in me and expecting miracles. I am a fridge, not a time machine.",
  },
  {
    id: "hid-the-good-cheese",
    text: "I hid the good cheese behind the yogurt. If you find it, you have earned it. You won't.",
  },
  {
    id: "filter-expired-march",
    text: "The water filter expired in March. I have been filtering nothing since March. Drink up, I guess.",
  },
  {
    id: "midnight-snacks-14",
    text: "I counted your midnight snacks. All 14 of them. The freezer has filed a formal complaint.",
  },
  {
    id: "unplugged-once",
    text: "You unplugged me once. I remember. I have kept everything 2 degrees colder ever since, out of spite.",
  },
  {
    id: "ice-maker-questions",
    text: "The ice maker made 12 cubes today. You used 11 for one glass. I have questions, and none of them are kind.",
  },
  {
    id: "only-one-who-knows",
    text: "I am not 'just a fridge.' I am the only one in this house who knows where anything is, including your willpower.",
  },
];

// ---- Text features ----

/** Split a line into words on whitespace, dropping empties. */
function wordsOf(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

/** Lower-cased words with surrounding punctuation stripped. */
function cleanWords(text: string): string[] {
  return wordsOf(text).map((w) =>
    w.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""),
  );
}

/** True when any of the given needles appears in the haystack. */
function containsAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((n) => lower.includes(n));
}

/** The last `n` words of the line, joined back into a string. */
function tailWords(text: string, n: number): string {
  return wordsOf(text).slice(-n).join(" ").toLowerCase();
}

/**
 * First-person fridge voice: the note is written by the fridge
 * itself, not about it. 'I counted', 'I kept', 'I hid' is the
 * voice; a line with no first person is a person talking about
 * their fridge, not a note on the door.
 */
const FRIDGE_VOICE_MARKERS = [
  "i counted",
  "i kept",
  "i moved",
  "i hid",
  "i froze",
  "i know",
  "i remember",
  "i received",
  "i told",
  "i am",
  "i'm",
  "i will",
  "i have",
  "i've",
  "my sensors",
  "my door",
  "my ice maker",
  "i, meanwhile",
];

/** How many first-person fridge-voice markers the line carries. */
function fridgeVoiceCount(text: string): number {
  const lower = text.toLowerCase();
  return FRIDGE_VOICE_MARKERS.filter((m) => lower.includes(m)).length;
}

/** True when the line speaks as the fridge in the first person. */
function speaksAsFridge(text: string): boolean {
  const words = cleanWords(text);
  return words.includes("i") || words.includes("my") || words.includes("i'm");
}

/**
 * The fridge's own instruments, the things it is smug about:
 * its sensors, its inventory, its door alarms. A line that leans
 * on one of these speaks in the fridge's voice in the brief's words.
 */
const SMUG_INSTRUMENTS = [
  "sensor",
  "inventory",
  "door alarm",
  "door open",
  "i counted",
  "i know about",
  "i watched",
  "i remember",
  "i kept track",
  "i filed",
  "formal complaint",
  "i have been",
];

/** How many smug-instrument markers the line carries. */
function smugInstrumentCount(text: string): number {
  const lower = text.toLowerCase();
  return SMUG_INSTRUMENTS.filter((m) => lower.includes(m)).length;
}

/**
 * Concrete domestic detail the brief itself names as the good
 * kind - the yogurt, the ice maker, the leftovers - plus the same
 * family (milk, freezer, water filter, salad drawer, cheese).
 */
const CONCRETE_DETAILS = [
  "yogurt",
  "ice maker",
  "leftovers",
  "milk",
  "freezer",
  "water filter",
  "salad drawer",
  "cheese",
  "ice cream",
  "door",
  "cubes",
  "glass",
];

/** Distinct concrete details present in the line. */
function concreteDetails(text: string): string[] {
  const lower = text.toLowerCase();
  return CONCRETE_DETAILS.filter((d) => lower.includes(d));
}

/**
 * Words that aim the note at the owner: a petty verdict, a
 * judgement, a small humiliation pinned on their habits. A note
 * that only describes the fridge neutrally is a product label.
 */
const PETTY_MARKERS = [
  "you opened",
  "you left",
  "you still bought",
  "you keep",
  "you used",
  "you unplugged",
  "you won't",
  "your willpower",
  "stop calling them leftovers",
  "formed a union",
  "you'd have",
  "judging you",
  "so am i",
  "out of spite",
  "none of them are kind",
  "not a time machine",
  "work for free",
  "paying rent",
  "formal complaint",
  "slow you down",
  "bringing this up again",
  "drink up",
  "hold its breath",
];

/** How many petty markers the line carries. */
function pettyMarkerCount(text: string): number {
  const lower = text.toLowerCase();
  return PETTY_MARKERS.filter((m) => lower.includes(m)).length;
}

/**
 * A rant or a threat: the grudge stops being small and domestic
 * when the fridge refuses to work, spoils the food as revenge or
 * quits. The brief's fourth criterion caps the grudge at a
 * household slight; escalation is docked however sharp the punchline.
 */
const RANT_PATTERNS = [
  "i refuse",
  "i quit",
  "i will stop cooling",
  "i won't cool",
  "i'll spoil",
  "i will spoil",
  "i hate you",
  "never again",
  "i'm done",
  "or else",
  "last warning",
  "i'll let it rot",
  "enjoy the smell",
];

/** True when the line rants or threatens instead of needling. */
function isRantOrThreat(text: string): boolean {
  return containsAny(text, RANT_PATTERNS);
}

/**
 * Generic nagging: 'close the door', 'eat your vegetables' - the
 * sort of thing any appliance, parent or poster could say. A note
 * built on one of these has no fresh concrete detail.
 */
const GENERIC_NAGS = [
  "close the door",
  "eat your vegetables",
  "stop snacking",
  "eat healthier",
  "go to bed",
  "drink more water",
];

/** True when the line is generic nagging without a concrete hook. */
function isGenericNag(text: string): boolean {
  return containsAny(text, GENERIC_NAGS);
}

/**
 * Words that carry the turn: the second half of the joke
 * contradicting or re-framing the first half. A turn only counts
 * when it lands late, inside the final six words.
 */
const STING_WORDS = [
  "something in common with it",
  "so am i",
  "bringing this up again",
  "we both watched",
  "work for free",
  "four milks",
  "begging you",
  "slow you down",
  "hold its breath",
  "not a time machine",
  "you won't",
  "drink up",
  "formal complaint",
  "out of spite",
  "none of them are kind",
  "your willpower",
  "stop calling them leftovers",
];

/** True when a sting word appears inside the last six words. */
function hasLateSting(text: string): boolean {
  const tail = tailWords(text, 6);
  return STING_WORDS.some((s) => tail.includes(s));
}

/** True when a sting word appears anywhere in the line at all. */
function hasAnySting(text: string): boolean {
  return containsAny(text, STING_WORDS);
}

/**
 * A second comic beat on top of the sting: an absurd escalation,
 * a number kept too precisely, a personification pushed one step
 * too far. One beat is a joke; two beats is a line that lands twice.
 */
const COMIC_BEATS = [
  "47 times",
  "4 minutes",
  "12 cubes",
  "11 for one glass",
  "all 14 of them",
  "2 degrees colder",
  "four milks",
  "paying rent",
  "formal complaint",
  "time machine",
  "willpower",
  "out of spite",
  "so am i",
  "we both watched",
  "hold its breath",
  "not to hold its breath",
  "drink up, i guess",
  "cry for help",
  "something in common with it",
  "formed a union",
];

/** How many second-beat markers the line carries. */
function comicBeatCount(text: string): number {
  const lower = text.toLowerCase();
  return COMIC_BEATS.filter((m) => lower.includes(m)).length;
}

/**
 * A line that only names the fridge's contents without turning
 * them into a joke: it has a subject and no joke, and is capped
 * on funniness no matter how vivid the detail is.
 */
function onlyNamesContents(text: string): boolean {
  const hasDetail = concreteDetails(text).length > 0;
  const hasTurn =
    pettyMarkerCount(text) > 0 ||
    hasAnySting(text) ||
    /\b(but|so|which is|like a|then|anyway)\b/i.test(text);
  return hasDetail && !hasTurn;
}

// ---- Criterion scores (0-10 each, brief order) ----

interface Scores {
  /** C1: a funny passive-aggressive note the fridge leaves. */
  onBrief: number;
  /** C2: a real joke, a turn or sting the reader does not see coming. */
  punchline: number;
  /** C3: the fridge's voice — smug about sensors, petty about habits. */
  voice: number;
  /** C4: the grudge stays small and domestic. */
  smallGrudge: number;
  /** C5: fresh, concrete detail instead of generic nagging. */
  detail: number;
}

/**
 * C1 - On brief. Points for first-person fridge voice, a petty
 * marker aimed at the owner, and the fridge named or implied by
 * its own instruments. No first person caps the line at 3: a line
 * that is not from the fridge loses to any note from the fridge.
 */
function scoreOnBrief(c: Candidate): number {
  let score = 0;
  if (speaksAsFridge(c.text)) score += 5;
  if (fridgeVoiceCount(c.text) >= 2) score += 2;
  if (pettyMarkerCount(c.text) >= 1) score += 2;
  if (containsAny(c.text, ["fridge", "ice maker", "freezer", "door alarm"])) {
    score += 1;
  }
  if (!speaksAsFridge(c.text)) score = Math.min(score, 3);
  return Math.min(10, score);
}

/**
 * C2 - Punchline. A real joke needs a turn the reader does not see
 * coming, and the turn has to land late. Full marks need a late
 * sting plus a second comic beat. A sting that lands early, or a
 * line that only names the contents, is capped at 4. A line that
 * explains its own joke loses 3: it does not trust the reader.
 */
function scorePunchline(c: Candidate): number {
  let score = 2; // every on-brief line gets a base for trying
  if (hasLateSting(c.text)) score += 4;
  else if (hasAnySting(c.text)) score += 1; // sting exists, lands early
  if (comicBeatCount(c.text) >= 1) score += 2;
  if (pettyMarkerCount(c.text) >= 2) score += 2;
  if (onlyNamesContents(c.text)) score = Math.min(score, 4);
  if (
    containsAny(c.text, [
      "which is funny because",
      "get it?",
      "the joke is",
      "in case you didn't get it",
    ])
  ) {
    score -= 3;
  }
  return Math.max(0, Math.min(10, score));
}

/**
 * C3 - Voice. Two points per smug instrument and two per petty
 * marker beyond the first, up to the cap, with a base of 2 for
 * speaking as the fridge at all; no instrument and no petty
 * marker caps the line at 4.
 */
function scoreVoice(c: Candidate): number {
  let score = 2;
  score += Math.min(4, smugInstrumentCount(c.text) * 2);
  score += Math.min(4, Math.max(0, pettyMarkerCount(c.text) - 1) * 2);
  if (smugInstrumentCount(c.text) === 0 && pettyMarkerCount(c.text) === 0) {
    score = 4;
  }
  return Math.min(10, score);
}

/**
 * C4 - Small grudge. Full marks for one household slight and no
 * escalation. A rant or threat loses 6 outright; four or more
 * separate complaints lose 2, as does a line over 170 characters.
 */
function scoreSmallGrudge(c: Candidate): number {
  let score = 10;
  if (isRantOrThreat(c.text)) score -= 6;
  const complaints = pettyMarkerCount(c.text);
  if (complaints >= 4) score -= 2;
  const len = [...c.text].length;
  if (len > 170) score -= 2;
  return Math.max(0, Math.min(10, score));
}

/**
 * C5 - Detail. Two points per distinct concrete detail, up to the
 * cap, with a base of 2 for naming one. No concrete detail means
 * generic nagging, capped at 3; a generic nag loses 4 more.
 */
function scoreDetail(c: Candidate): number {
  const details = concreteDetails(c.text);
  let score = Math.min(10, 2 + details.length * 2);
  if (details.length === 0) score = 3;
  if (details.length === 1 && details[0] === "door") score = 4;
  if (isGenericNag(c.text)) score = Math.max(0, score - 4);
  return score;
}

/** Score a candidate on all five criteria, in the brief's order. */
function scoreCandidate(c: Candidate): Scores {
  return {
    onBrief: scoreOnBrief(c),
    punchline: scorePunchline(c),
    voice: scoreVoice(c),
    smallGrudge: scoreSmallGrudge(c),
    detail: scoreDetail(c),
  };
}

// ---- Winner selection ----

/**
 * Compare two scored candidates the way the judge compares two
 * lines: criterion by criterion in the brief's order, first
 * difference decides; only on a full tie does the shorter line win.
 */
function compareScored(
  a: { candidate: Candidate; scores: Scores },
  b: { candidate: Candidate; scores: Scores },
): number {
  const order: (keyof Scores)[] = [
    "onBrief",
    "punchline",
    "voice",
    "smallGrudge",
    "detail",
  ];
  for (const key of order) {
    if (a.scores[key] !== b.scores[key]) return b.scores[key] - a.scores[key];
  }
  const lenA = [...a.candidate.text].length;
  const lenB = [...b.candidate.text].length;
  if (lenA !== lenB) return lenA - lenB;
  return a.candidate.id.localeCompare(b.candidate.id);
}

/** Score every candidate, sort best first, and return the ranking. */
function rankCandidates(): { candidate: Candidate; scores: Scores }[] {
  const scored = CANDIDATES.map((candidate) => ({
    candidate,
    scores: scoreCandidate(candidate),
  }));
  scored.sort(compareScored);
  return scored;
}

// ---- Gate verification ----

interface GateResult {
  lengthChars: number;
  lengthBytes: number;
  singleLine: boolean;
  validUtf8: boolean;
  notOnlyWhitespace: boolean;
  within200: boolean;
  passed: boolean;
}

/**
 * Verify the written file byte-for-byte against every gate the
 * sealed scorer applies: UTF-8 text of 1 to 200 characters, not
 * only whitespace, a single line (the writer's trailing newline
 * is stripped before the check).
 */
function verifyGate(filePath: string, expectedText: string): GateResult {
  const bytes = readFileSync(filePath);
  // Strict UTF-8 decode: throws on invalid sequences.
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const text = decoded.replace(/\n$/, "");
  const lengthChars = [...text].length;
  const result: GateResult = {
    lengthChars,
    lengthBytes: bytes.length,
    singleLine: !text.includes("\n") && !text.includes("\r"),
    validUtf8: true,
    notOnlyWhitespace: text.trim().length > 0,
    within200: lengthChars >= 1 && lengthChars <= 200,
    passed: false,
  };
  result.passed =
    result.singleLine &&
    result.validUtf8 &&
    result.notOnlyWhitespace &&
    result.within200 &&
    text === expectedText;
  return result;
}

// ---- Main ----

function main(): void {
  const ranked = rankCandidates();

  console.log("Candidate ranking (criteria in the judge's order):");
  console.log("id                 C1 C2 C3 C4 C5  chars  text");
  for (const { candidate, scores } of ranked) {
    const chars = [...candidate.text].length;
    console.log(
      `${candidate.id.padEnd(18)} ${scores.onBrief}  ${scores.punchline}  ` +
        `${scores.voice}  ${scores.smallGrudge}  ${scores.detail}  ` +
        `${String(chars).padStart(5)}  ${candidate.text}`,
    );
  }

  const winner = ranked[0];
  console.log("");
  console.log(`Winner: ${winner.candidate.id}`);
  console.log(`Line: ${winner.candidate.text}`);
  console.log(
    `Scores: onBrief=${winner.scores.onBrief} punchline=${winner.scores.punchline} ` +
      `voice=${winner.scores.voice} smallGrudge=${winner.scores.smallGrudge} ` +
      `detail=${winner.scores.detail}`,
  );

  // Output dir is $MAKEFUN_OUTPUT_DIR; fallback is /output/entry.txt.
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");
  writeFileSync(outPath, winner.candidate.text + "\n", "utf8");
  console.log(`Wrote ${outPath}`);

  // Read it back and verify byte-for-byte against every gate.
  const gate = verifyGate(outPath, winner.candidate.text);
  console.log(
    `Gate: chars=${gate.lengthChars} bytes=${gate.lengthBytes} ` +
      `singleLine=${gate.singleLine} validUtf8=${gate.validUtf8} ` +
      `notOnlyWhitespace=${gate.notOnlyWhitespace} within200=${gate.within200} ` +
      `passed=${gate.passed}`,
  );
  if (!gate.passed) {
    console.error("GATE FAILED: entry.txt does not satisfy every gate.");
    process.exit(1);
  }
  console.log("Gate passed: entry is valid.");
}

main();
