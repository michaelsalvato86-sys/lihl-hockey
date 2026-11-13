# Animation inventory (event-to-animation system)

Branch p9-evt. Source of truth for the mapping: anim_events.js (AEV.EVENTS, AEV.PRIO, AEV.RULES, AEV.VARIANTS). Gallery: anim_gallery.html (dev only, serve over http).

## Summary
- Sim events: 31 (24 AE kinds emitted by the sim or HITS, 3 state-driven celebration kinds, 1 documentary goalie poke entry).
- Animation variants listed: 116 (movement 11, puck 18, shooting 11, passing 8, physical 19, goalie 29, celebration 20).
- Wired in the live page (event emitted by the real sim AND consumed by the real r3d/ANIM/GOAL path): all except the items under Harness-only below.
- Observed live in one 90 s AI-vs-AI run of the real page (5400 steps, draw3D every 3rd): 52 distinct states, 0 script errors; plus a forced-event run (goal, pull, return, game end).
- Online: events travel as raw AE through server AEHOOK -> net.js ev() -> AEV.route. Replay offline: AE now recorded and replayed (was windup and celeb only). Replay online: rbFrame replays recorded ae arrays through the same ev().
- Visual review: harness frames from passes 7 (not re-viewed here), plus live frames viewed this pass: goal banner scene, final screen, gallery page. Most variants are NOT visually reviewed in the live game.

## Events
| event | who | emitted by / condition | params | consumer animation (state labels) | class (prio) | live | online | replay |
|---|---|---|---|---|---|---|---|---|
| shotwind | skater | startAct (human shot press, AI shot decision) (drives p.act; the windup pose reads p.act, not this event) | t,kind | preparing_shot | windup (70) | yes | yes | yes (new, ae recorded) |
| passwind | skater | startAct (pass) (drives p.act) | t,kind | passing | windup (70) | yes | yes | yes (new, ae recorded) |
| actcancel | skater | tickAct when stunned, possession lost or game over (only way a windup is cancelled) | - | - | cancel (200) | yes (rare) | yes | yes (new, ae recorded) |
| shot | skater | shoot() at puck release | kind,pw,a,z,len | shot_wrist, shot_snap, shot_slap, shot_onetimer, shot_backhand, shot_quick, shot_volley | release (75) | yes | yes | yes (new, ae recorded) |
| pass | skater | pass() at puck release | a,len,sp | passing, pass_saucer, pass_drop, pass_slap, pass_onehand, pass_bank, pass_backhand | release (75) | yes | yes | yes (new, ae recorded) |
| recv | skater | pass() for the intended receiver | - | receiving_pass | recv (50) | yes | yes | yes (new, ae recorded) |
| gain | skater | puck pickup / reception resolution (clean, difficult, bobble, deflect, miss) | q,z,sp | recv_glove, recv_tip, recv_cradle, recv_kick, recv_reach, recv_backhand | recv (50) | yes | yes | yes (new, ae recorded) |
| otwind | skater | AI one-timer detect; human one-timer press | eta | one_timer_ready | windup (70) | yes | yes | yes (new, ae recorded) |
| poke | skater | step() poke-check strip of the carrier | a | poke_check, stick_lift, poke_dive | contact (80) | yes | yes | yes (new, ae recorded) |
| hitwind | skater | human hit press (builds the lunge) | a,d | hit_windup | contact (80) | human input only | yes | yes (new, ae recorded) |
| hitcommit | skater | step() hit contact frame (human lunge reaches target) | a | body_check | contact (80) | human input only | yes | yes (new, ae recorded) |
| hitmiss | skater | step() hit lunge ends with no contact | - | hit_miss | contact (80) | human input only | yes | yes (new, ae recorded) |
| check | skater | step() hit resolution; fight exchanges | a,board,power,from,nf | body_check, hit_* | contact (80) | yes | yes | yes (new, ae recorded) |
| checked | skater | step() hit resolution; fight exchanges | power,board,dir,side,from,nf | getting_checked, hit_*_victim | victim (92) | yes | yes | yes (new, ae recorded) |
| fall | skater | step() hit (hard), injury, fight loser, trip penalty reaction | side,kind,power,from,dir,board,wrestle | falling | fall (100) | yes | yes | yes (new, ae recorded) |
| hookv | skater | HITS.pen on a Hooking call (offline sim and client only) | a,dir,side | hit_hookv_victim | foul (78) | yes (penalty call, HITS) | NO (HITS not in server sim) | yes (new, ae recorded) |
| holdv | skater | HITS.pen on a Holding call | a,dir,side | hit_holdv_victim | foul (78) | yes (HITS) | NO | yes (new, ae recorded) |
| slashv | skater | HITS.pen on a Slashing call | a,dir,side | hit_slashv_victim | foul (78) | yes (HITS) | NO | yes (new, ae recorded) |
| interfv | skater | HITS.pen on an Interference call | a,dir,side,power | hit_interfv_victim | foul (78) | yes | NO | yes (new, ae recorded) |
| liftv | skater | HITS.onEvent after a poke that strips the carrier | a,dir,side | hit_liftv_victim | foul (78) | yes | client-side only via HITS.onEvent hook | yes (new, ae recorded) |
| draw | skater | faceoff drop | - | faceoff_draw | misc (30) | yes | yes | yes (new, ae recorded) |
| save | goalie | step() save resolution | kind,side,dy,h,rc,z | goalie_butterfly, goalie_glove_save, goalie_blocker_save, goalie_pad_save, goalie_stick_save, goalie_stack_pads, goalie_split_save, goalie_post_slide_vh, goalie_butterfly_slide, goalie_paddle_down, goalie_glove_squeeze, goalie_scramble | save (90) | yes | yes | yes (new, ae recorded) |
| cover | goalie | step() save followed by a freeze; deferred until the save animation is over | - | goalie_cover | cover (60) | yes (new on whistle near goalie) | yes | yes (new, ae recorded) |
| goalagainst | goalie | goal() for the scored-on goalie | v | goalie_goal_against, goalie_bang_post, goalie_tap_pads | react (55) | yes | yes | yes (new, ae recorded) |
| poke_g | goalie | goalieStep poke check at a close carrier (sent as AE kind poke on the goalie) | side,tx,ty | goalie_poke_check | gpoke (66) | yes (new, sim goalieStep) | yes | yes (new, ae recorded) |
| pull | goalie | step() when the coach pulls the goalie | dx,dz,dur | goalie_skate_bench | bench (45) | yes (new) | yes | yes (new, ae recorded) |
| return | goalie | step() when the goalie is put back | dx,dz,dur | goalie_skate_return | bench (45) | yes (new) | yes | yes (new, ae recorded) |
| idle | goalie | not emitted by the sim; anim_goalie auto-generates during stoppage (c.gw.stop) (ambient) | v | goalie_adjust_mask, goalie_water_bottle, goalie_stretch, goalie_shake_out, goalie_tap_pads | idle (10) | ambient, anim-side | n/a | n/a |
| celebrate | skater | goal() / net goal event -> CEL.onGoal sets p.celeb (state driven (p.celeb), not an AE) | p.celeb>0 | celebrating | celebrate (20) | yes | yes (goal event) | yes (p.celeb recorded) |
| dejected | skater | CEL.onGoal (scored-on skaters) / CEL.onEnd (losers) (state driven) | p.celeb<0 | dejected | celebrate (20) | yes | yes (CEL.onGoal) | yes (p.celeb recorded) |
| win | skater | finish() / net showEnd -> CEL.onEnd (state driven) | p.celeb=6.5 | celebrating | celebrate (20) | yes | yes (new, showEnd) | yes (p.celeb recorded) |

## Priority and interruption rules (enforced by AEV.admit in anim_ctrl.js and anim_goalie.js)
- fall interrupts everything (including check recovery) except a fall already in its first 0.35 s
- checked / check interrupt skating, carrying and receiving; a victim animation is not restarted while the fall is running
- a shot or pass release (t < contact) cannot be interrupted except by fall, checked or actcancel (the sim cancels with actcancel)
- while a fall is running only fall events start (nothing plays on a skater who is on the ice)
- while a celebration or dejection runs only fall starts; celebration only starts once the goal is confirmed
- goalie save interrupts ready, idle, play, peek, poke and bench; goalagainst never cuts a running save
- goalie cover is deferred until the save animation ends (route)
- incompatible layers never overlap on one player: fall x event, celebration x event, bench trip x save

Priority numbers: {"fall":100,"victim":92,"save":90,"contact":80,"foul":78,"release":75,"windup":70,"gpoke":66,"cover":60,"react":55,"recv":50,"bench":45,"misc":30,"celebrate":20,"idle":10,"cancel":200}

Dedupe: AEV.accept drops the same event kind on the same player inside a window (default 0.08 s, fall 0.35, check/checked 0.3, save 0.25, goalagainst 1.0, cover 0.5) and keeps the higher priority event when two land in one tick. Cover after a save is deferred 0.85 s so it does not overwrite the save.

## Variants
Columns: group, name, event, live state label, harness scenario (AT.sc / GS / hit pair).
| variant | group | event | state | harness scenario |
|---|---|---|---|---|
| forward_skate | movement | state | skating | skate |
| backward_skate | movement | state | backward_skating | backskate |
| crossover | movement | state | crossover_turn | crossover |
| tight_turn | movement | state | pivoting | pivot |
| hockey_stop | movement | state | stopping | stop |
| accelerate | movement | state | accelerating | accelerate |
| glide | movement | state | gliding | glide |
| turn_left | movement | state | turning_left | turn_left |
| side_shuffle | movement | state | side_shuffle | shuffle |
| bracing | movement | state | bracing | brace |
| losing_balance | movement | fall | falling | fall_stumble |
| receive | puck | recv | receiving_pass | receive |
| saucer_backhand_reception | puck | gain | recv_backhand | rc_backhand |
| settle_cradle | puck | gain | recv_cradle | rc_cradle |
| stickhandle | puck | state | stickhandling | carry |
| protect_puck | puck | state | protecting_puck | protect |
| lose_puck | puck | poke | poke_check | poke |
| loose_pickup | puck | gain | recv_reach | rc_reach |
| board_battle | puck | state | stick_battle | stick_battle |
| rebound_tip | puck | gain | recv_tip | rc_tip |
| poke | puck | poke | poke_check | poke |
| stick_lift | puck | poke | stick_lift | lift |
| diving_recovery | puck | poke | poke_dive | pk_dive |
| glove_reception | puck | gain | recv_glove | rc_glove |
| skate_kick_reception | puck | gain | recv_kick | rc_kick |
| deke_forehand_backhand | puck | state | deke_forehand_backhand | dk_fb |
| deke_toe_drag | puck | state | deke_toe_drag | dk_toe |
| deke_between_legs | puck | state | deke_between_legs | dk_btl |
| deke_spin | puck | state | deke_spin | dk_spin |
| wrist_shot | shooting | shot | shot_wrist | wrist |
| snap_shot | shooting | shot | shot_snap | snap |
| slap_shot | shooting | shot | shot_slap | slap |
| backhand_shot | shooting | shot | shot_backhand | sh_backhand |
| one_timer | shooting | shot | shot_onetimer | onetimer |
| quick_shot | shooting | shot | shot_quick | sh_quick |
| windup_wrist | shooting | shotwind | preparing_shot | wrist_act |
| windup_slap | shooting | shotwind | preparing_shot | slap_act |
| volley_shot | shooting | shot | shot_volley | sh_volley |
| one_timer_ready | shooting | otwind | one_timer_ready | otwind |
| one_timer_miss | shooting | otmiss | one_timer_miss | otmiss |
| pass_standard | passing | pass | passing | pass |
| pass_backhand | passing | pass | pass_backhand | ps_backhand |
| pass_saucer | passing | pass | pass_saucer | ps_saucer |
| pass_board | passing | pass | pass_bank | ps_bank |
| pass_drop | passing | pass | pass_drop | ps_drop |
| pass_slap | passing | pass | pass_slap | ps_slap |
| pass_onehand | passing | pass | pass_onehand | ps_onehand |
| pass_windup | passing | passwind | passing | pass_act |
| body_check | physical | check | body_check | check (pair) |
| open_ice_hit | physical | check | hit_openice_side | openice_side (pair) |
| board_hit | physical | check | hit_board | board (pair) |
| missed_check | physical | hitmiss | hit_miss | hitmiss |
| checked_victim | physical | checked | getting_checked | checked |
| hit_windup | physical | hitwind | hit_windup | hit |
| hook | physical | hookv | hit_hookv_victim | hookv (pair) |
| holding | physical | holdv | hit_holdv_victim | holdv (pair) |
| slash | physical | slashv | hit_slashv_victim | slashv (pair) |
| stick_lift_foul | physical | liftv | hit_liftv_victim | liftv (pair) |
| interference | physical | interfv | hit_interfv_victim | interfv (pair) |
| trip | physical | fall | falling | trip (pair) |
| fall_forward | physical | fall | falling | fall_fwd |
| fall_back | physical | fall | falling | fall_back |
| fall_board | physical | fall | falling | fall_board |
| fall_knees | physical | fall | falling | fall_knees |
| get_up | physical | fall | falling | fall |
| fight | physical | check | fight_punch | fight (pair) |
| penalty_reaction_hip | physical | check | hit_hip | hip (pair) |
| g_ready | goalie | state | goalie_ready | g_ready |
| g_butterfly | goalie | save | goalie_butterfly | g_butterfly |
| g_slide | goalie | save | goalie_butterfly_slide | v_bslide |
| g_glove | goalie | save | goalie_glove_save | g_glove |
| g_blocker | goalie | save | goalie_blocker_save | g_blocker |
| g_pad | goalie | save | goalie_pad_save | g_pad |
| g_stack | goalie | save | goalie_stack_pads | v_stack |
| g_split | goalie | save | goalie_split_save | v_split |
| g_post_hug_rvh | goalie | state | goalie_ready | g_rvh |
| g_vh | goalie | save | goalie_post_slide_vh | v_vh |
| g_poke | goalie | poke | goalie_poke_check | v_poke |
| g_cover | goalie | cover | goalie_cover | v_cover |
| g_rebound_control | goalie | save | goalie_pad_save | g_rebound |
| g_play_puck | goalie | play | goalie_play_puck | v_play |
| g_recovery | goalie | save | goalie_ready | g_stick |
| g_goal_against | goalie | goalagainst | goalie_goal_against | g_goal |
| g_bang_post | goalie | goalagainst | goalie_bang_post | v_bang |
| g_squeeze | goalie | save | goalie_glove_squeeze | v_squeeze |
| g_paddle | goalie | save | goalie_paddle_down | v_paddle |
| g_scramble | goalie | save | goalie_scramble | v_scramble |
| g_pump | goalie | pump | goalie_glove_pump | v_pump |
| g_peek | goalie | peek | goalie_peek | v_peek |
| g_bench_pull | goalie | pull | goalie_skate_bench | v_pull |
| g_bench_return | goalie | return | goalie_skate_return | v_return_ |
| g_idle_adjust | goalie | idle | goalie_adjust_mask | v_adjust |
| g_idle_sip | goalie | idle | goalie_water_bottle | v_sip |
| g_idle_stretch | goalie | idle | goalie_stretch | v_stretch |
| g_idle_shake | goalie | idle | goalie_shake_out | v_shake |
| g_idle_tap | goalie | idle | goalie_tap_pads | v_tap |
| cel_scorer_pump | celebration | celebrate | celebrating | cel_pump |
| cel_scorer_stickraise | celebration | celebrate | celebrating | cel_stickraise |
| cel_scorer_guitar | celebration | celebrate | celebrating | cel_guitar |
| cel_scorer_point | celebration | celebrate | celebrating | cel_point |
| cel_scorer_helmet | celebration | celebrate | celebrating | cel_helmet |
| cel_scorer_glass | celebration | celebrate | celebrating | cel_glass |
| cel_scorer_kneeslide | celebration | celebrate | celebrating | cel_kneeslide |
| cel_scorer_jumpglide | celebration | celebrate | celebrating | cel_jumpglide |
| cel_scorer_lap | celebration | celebrate | celebrating | cel_lap |
| cel_scorer_huddle | celebration | celebrate | celebrating | cel_huddle |
| cel_mate_cheer | celebration | celebrate | celebrating | cel_mateCheer |
| cel_mate_helmet | celebration | celebrate | celebrating | cel_mateHelmet |
| cel_mate_sticktap | celebration | celebrate | celebrating | cel_stickTap |
| cel_mate_fistbump | celebration | celebrate | celebrating | cel_fistbump |
| cel_mate_shoulder | celebration | celebrate | celebrating | cel_shoulder |
| cel_mate_hug | celebration | celebrate | celebrating | cel_hug |
| cel_scoredon_helmet | celebration | dejected | dejected | cel_sadHelmet |
| cel_scoredon_knees | celebration | dejected | dejected | cel_sadKnees |
| cel_scoredon_stick | celebration | dejected | dejected | cel_sadStick |
| cel_win | celebration | win | celebrating | cel_win |

## Final state (this pass)
Integrated = event reaches the animation in the real game page. Online = through net.js. Replay = offline replay and online break. Viewed = a rendered frame was actually looked at.

| area | integrated | online | replay | viewed |
|---|---|---|---|---|
| skating, puck control, shots, passes, receptions, pokes, body checks, falls (AI events) | yes, counted live (gain 39, check 10, pass 19, shot 6, poke 18, fall 1 in 90 s) | yes (raw AE) | yes (ae recorded this pass) | harness frames from pass 7 only |
| human-only hit wind-up / commit / miss | yes in code, not exercised (AI vs AI run) | yes | yes | no |
| foul reactions (hook, hold, slash, interference, lift) | yes offline (interfv, liftv seen live) | NO: HITS is not loaded in the server sim, so penalty reactions are not emitted online | yes offline | no |
| goalie save variants, cover, poke | yes (save vh, cover, poke_check seen live) | yes | yes | harness frames from pass 7 |
| goal-against (goalie tap pads / bang post), scored-on skaters dejected | yes (goalie_tap_pads, dejected seen live) | yes (goal event + goalagainst AE) | yes (celeb recorded) | no |
| scorer / mate celebrations | yes (celebrating seen live) | yes | yes | no |
| win pose at game end | yes offline (celebrating and dejected seen live at finish) | yes, new in net showEnd | n/a | end screen only (overlay covers the ice) |
| goalie bench trip and return | yes, new: sim emits pull / return, goalie stays drawn 1.8 s (benchT), goalie_skate_bench and goalie_skate_return seen live | yes (AE + AEV.mark sets benchT on the client) | not recorded (replay skips a pulled goalie) | no |
| goalie poke check moving toward the puck | yes, new: sim lunges up to 4.5 ft out for 0.45 s, visual only, no save probability change | yes (position in snapshot, AE kind poke) | yes | no |

Removed: the goalie auto poke that started whenever the puck was near (anim_goalie.js). Still state driven (not sim events): goalie play-the-puck, screen peek, stoppage idles; skater stick battle (opponent within 7 ft, slow), lunge, protect.

Harness: anim_test.html AT.assertAll 856 of 856 (838 before; 18 new AEV checks: map, priority order, interruption rules, dedupe, deferral, same-tick, no-overlap stream, celebration gate).
