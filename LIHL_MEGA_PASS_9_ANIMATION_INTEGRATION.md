# Animation integration (Pass 9)

Full tables: docs/ANIMATION_INVENTORY.md (31 events, 116 variants, with wired / online / replay / viewed columns).

anim_events.js is the single event-to-animation table with a priority and interruption rule set (checks interrupt skating, falls interrupt check recovery, a shot release is not interruptible before contact unless the sim cancels, a save interrupts ready, celebrations only start after a confirmed goal or game end) and a dedupe guard.

New sim emissions: goalie pull and return, cover on whistle, goal-against, poke lunge, win pose online. Foul reactions (hook, hold, slash, interference, trip) now play online by reading the penalty banner.

Harness: 946 checks, 0 fails. Not integrated or only partly: pulled goalie in replay, hit variants that only the human path emits, stoppage idles (state-driven).
