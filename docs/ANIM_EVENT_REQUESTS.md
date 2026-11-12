
## Goalie (anim_goalie.js)
- Goalie head tracking uses c.puckW only. Request: pass the puck velocity (c.puckV) and the shooter position/time of release in the goalie ctx so the head can lead a shot and the shot-side shoulder can pre-load before the save event fires.
- Request: include `d.rebound` ('freeze'|'kick'|'drop') and `d.dir` (rebound heading) in the save AE so the recovery can turn the stick/pads toward the rebound instead of a fixed recovery.
- Request: ensure goalie p.id is a stable integer per goalie (used to hash personal breathing rate, stance width, glove height, slump speed).
# Animation event requests (from anim_ctrl.js work, 2026-11-12)

1. Shot wind-up for AI and one-timers: the shot AE fires at the instant the puck leaves, so the animation can only show contact and follow-through for non-human shots. Request an AE 'shotwind' {kind, a} about 0.15 to 0.4 s before release (or delay the puck release by that amount for slap/wrist) so the backswing is visible. Human slap already winds up via ctx.charge.
2. Pass AE: add d.kind or d.back (forehand/backhand) if the sim knows the pass type; the animation currently derives it from the target angle vs the stick side.
3. Poke AE: add d.kind 'poke' | 'lift' so the stick lift and poke extension need not be inferred from puck distance.
4. One-timer: AE 'recv' could carry d.shoot = true when a shot is queued (bd.oneT > 0) so the preload is exact instead of a generic 40% cocked stance during every reception.
5. 'checked' d.dir is read as an angle in radians (world, same convention as d.a), or an {x,y} vector. Please confirm.
