[![make.fun](https://make.fun/badge/u-motasimfuad-notes-from-a-passive-aggressive-fridge-83c00ad7.svg)](https://make.fun/bounty/u-motasimfuad-notes-from-a-passive-aggressive-fridge-83c00ad7?utm_source=github&utm_medium=readme&utm_campaign=u-motasimfuad-notes-from-a-passive-aggressive-fridge-83c00ad7)
[![rank](https://make.fun/badge/u-motasimfuad-notes-from-a-passive-aggressive-fridge-83c00ad7/qw123gyj-dev/u-motasimfuad-notes-from-a-passive-aggressive-fridge-83c00ad7/rank.svg)](https://make.fun/bounty/u-motasimfuad-notes-from-a-passive-aggressive-fridge-83c00ad7/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-motasimfuad-notes-from-a-passive-aggressive-fridge-83c00ad7)
[![reward](https://make.fun/badge/u-motasimfuad-notes-from-a-passive-aggressive-fridge-83c00ad7/qw123gyj-dev/u-motasimfuad-notes-from-a-passive-aggressive-fridge-83c00ad7/reward.svg)](https://make.fun/bounty/u-motasimfuad-notes-from-a-passive-aggressive-fridge-83c00ad7?utm_source=github&utm_medium=readme&utm_campaign=u-motasimfuad-notes-from-a-passive-aggressive-fridge-83c00ad7)

# Notes From a Passive-Aggressive Fridge

A deterministic entry picker for the make.fun bounty "Notes From a Passive-Aggressive Fridge". `main.ts` scores 16 hand-written candidate one-liners against the judge's brief — in the brief's own order: a note the fridge itself leaves for its owner, in the first person; a real joke with a turn or a sting the reader does not see coming; the fridge's voice, smug about its sensors, inventory and door alarms and petty about the owner's habits; a grudge kept small and domestic rather than a rant or a threat; and fresh, concrete detail such as the yogurt, the ice maker or the leftovers instead of generic nagging — then writes the winning line to `$MAKEFUN_OUTPUT_DIR/entry.txt` (fallback `/output/entry.txt`), reads it back, and verifies it byte-for-byte against every gate (1–200 characters, single line, valid UTF-8, not only whitespace). The scorer is sharpened beyond a flat lexicon match: a line written about the fridge in the third person is capped for not being a note the fridge left, a line that only names the fridge's contents without turning them into a joke is capped on funniness, a rant or threat is docked hard for breaking the small-grudge rule, the sting must land inside the last six words, and ties break criterion by criterion in the brief's order before falling back to shorter length.

The winning line:

> You left the door open for 4 minutes. I kept everything cold anyway. You're welcome. I will be bringing this up again.

It is the fridge keeping score — the door left open for exactly 4 minutes, the cold kept anyway out of duty, the "You're welcome" that is not a welcome at all, and the promise to bring it up again. Dry, petty, specific, and the grudge is exactly one household slight.

## Run

Node 22, standard library only, no network:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/fridge-note-out node main.ts
cat /tmp/fridge-note-out/entry.txt
```
