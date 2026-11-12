/* LIHL broadcast announcers. Original characters: Pete Marlowe (play-by-play) and Dana Reyes (color).
   Driven by real game events (AE hook, goal, penalty) plus a light 700ms poll for period / power play / lull moments.
   Browser speech now; replace ANN.speakLine with a cloud voice later. Modes: pro (default), locker, off.
   Talk control: per-category cooldowns, one global budget (about one call per 3 s outside goals), no repeat of the last
   6+ lines, color only when there is a gap. Safe with no speechSynthesis. */
(function () {
  const ANN = window.ANN = { mode: 'pro', col: 'f', q: [], busy: false, cd: {}, voices: null, hist: [], pend: [], lastT: -1e9, lastCol: -1e9, lastAny: 0, lastShot: null, lastSave: -1e9, now: () => performance.now() };
  try { const m = localStorage.getItem('lihl_ann'); if (m) ANN.mode = m; const c = localStorage.getItem('lihl_col'); if (c) ANN.col = c; } catch (e) { }
  const ln = p => (p && p.name ? p.name.trim().split(' ').pop() : 'the skater');
  const now = () => ANN.now();
  const S = s => s.split('|');
  const L = {
    pro: {
      pbp: {
        routine: S('{p} moves it along.|{p} with the pass up ice.|{p} keeps it simple.|Puck control for {p}.|{p} sends it forward.|{p} reads the ice and passes.'),
        chance: S('{p} in close, a real chance!|{p} in the slot, here is a chance!|Dangerous look for {p}!|{p} has space in front!|{p} gets a good one off from the slot!|That is a quality chance for {p}!'),
        breakaway: S('{p} is in alone! Breakaway!|Nobody back, {p} is away on a breakaway!|{p} breaks in free, only the goalie to beat!|{p} behind the defense, he is in on his own!|Here comes {p}, clear ice and a breakaway!|{p} has beaten everyone, one on one!'),
        shot: S('{p} shoots!|{p} lets it go.|Shot from {p}.|{p} fires on net.|{p} tests the goalie.|{p} sends one toward the crease.'),
        slap: S('{p} winds up, slap shot!|Big slapper from {p}!|{p} unloads from distance!|{p} steps into a hard one!|Heavy shot from {p}!|{p} blasts it from the point!'),
        onetimer: S('One timer by {p}!|{p} one times it!|{p} fires it first time!|Quick release, {p} one times it!|{p} cracks it off the pass!|Straight off the pass, {p} lets fly!'),
        save: S('Saved by {g}.|{g} with the stop.|{g} turns it aside.|{g} handles that one.|{g} makes the routine save.|{g} gets a pad on it.|{g} squares up and blocks it.'),
        bigsave: S('What a stop by {g}!|{g} comes up huge!|{g} robs him with a big save!|Huge save from {g}, he kept them in this!|{g} slams the door on a great chance!|Incredible save by {g}!'),
        rebound: S('Rebound! {p} has another go!|{p} jumps on the loose puck and fires!|Second chance for {p}!|The rebound falls to {p}!|{p} pounces on the rebound!|Still alive in front, {p} swings at it!'),
        goal: S('Scores! {p} for {t}!|{p} buries it! {t} score!|Goal {t}! {p}!|{p} finds the net for {t}!|It is in! {p} puts {t} on the board!|{p} beats the goalie, a goal for {t}!'),
        tie: S('{p} ties it up for {t}! All square!|It is tied! {p} with the equalizer!|{t} draw level on a goal by {p}!|{p} levels the score!|Even again! {p} brings {t} back!|The game is tied, {p} with the answer!'),
        lead: S('{p} puts {t} in front!|{t} take the lead on a goal by {p}!|{p} gives {t} the lead!|And {t} go ahead! {p} did it!|{p} breaks the tie for {t}!|{p} with the go ahead goal!'),
        clutch: S('{p} with a huge goal late, {t} go ahead!|{t} take the lead in the third, {p} scores!|Big time goal by {p}, {t} in front late!|{p} could be the difference, {t} lead!|{p} breaks the tie in the final period!|Late go ahead goal by {p}!'),
        winner: S('{p} wins it in overtime for {t}!|It is over! {p} ends it for {t}!|Sudden death, and {p} wins it!|{p} is the hero, overtime winner for {t}!|{p} finishes it, {t} win!|Overtime goal, {p}, game over!'),
        check: S('{p} lays the body on him.|Big hit by {p}.|{p} finishes the check.|{p} hammers him into the boards.|Heavy contact from {p}.|{p} steps up and levels him.'),
        poke: S('{p} pokes it away.|Nice stick by {p}.|{p} takes it off him with the stick.|{p} breaks it up.|{p} picks the pocket.|Quick stick from {p}, puck stolen.'),
        draw: S('Puck is dropped. {p} wins the draw.|Faceoff won by {p}.|{p} wins it clean.|{p} takes the draw back.|{p} gets the better of the faceoff.|The draw goes to {p}.'),
        cover: S('{g} covers it up. Whistle.|{g} freezes the puck.|{g} smothers it, play stops.|Whistle, {g} has it.|{g} ties it up, faceoff coming.|{g} gloves it and holds on.'),
        pen: S('Penalty on {p}, {why}.|{p} heads to the box for {why}.|The flag is up, {p}, {why}.|Two minutes for {p}, {why}.|{p} is off for {why}.|Whistle, {p} goes for {why}.'),
        ppstart: S('{t} will go on the power play.|Power play for {t}.|{t} get a man advantage.|Man advantage for {t}, time to work.|{t} have the extra skater.|Here is a power play chance for {t}.'),
        ppend: S('The penalty is up, full strength again.|Back to five on five.|The power play is over.|Penalty expires, teams are even.|Back to even strength.|The man advantage is gone.'),
        fall: S('{p} goes down.|{p} loses his edge and falls.|{p} takes a tumble.|{p} hits the ice.|{p} is down on the ice.|{p} slips and goes over.'),
        pstart: S('Here we go, {n} period underway.|We are set for the {n} period.|{n} period, puck drop.|The {n} period gets going.|Back at it for the {n} period.|And we are underway in the {n}.'),
        pend: S('That is the end of the {n} period.|The horn sounds, {n} period is done.|The {n} period is in the books.|Time on the {n} period.|And that wraps up the {n}.|End of the {n}, a breather now.'),
        quiet: S('A bit of a lull out there.|Things have settled into a slow stretch.|Both teams feeling each other out.|Not much happening at the moment.|A cagey shift, nobody wants to give an inch.|You can hear the skates carve the ice.')
      },
      col: {
        gen: S('Good gap control from the defense there.|You can see the work ethic on every shift.|Strong stick position, that took away the lane.|The forwards are doing a nice job tracking back.|He reads the play a half second before everyone else.|Look at the spacing between the skaters, that is smart hockey.|Timing is everything on a play like that.|That line has real chemistry together.|Smart to get it deep and change.|You win games with the little things.|The legs look fresh out there.|He is a pest on the forecheck and it pays off.|Great patience with the puck.|That was a heads up play.|The defense pairing is communicating well.|Nobody wants to turn it over in this zone.|Short shifts keep the pace high.|He lets the play come to him, very calm.|The center is doing the heavy lifting in both zones.|That is a good example of puck support.|You have to respect how well they cycle.|The neutral zone is clogged, nothing easy.|Clean breakout, three quick passes.|He is protecting the puck with his body.|Strong battle along the boards.|He gets his stick in the lane every time.|The winger cut to the middle, that is the right read.|Great hustle on the backcheck.|The goalie is controlling his rebounds nicely tonight.|The pace has picked up in the last minute.|Both teams are blocking shots, that is commitment.|He made the simple play, and that is often the right one.|A little patience and that opens up.|Nice give and go through the middle.|The defenseman stepped up and closed the gap.|They are leaning on their top line right now.|Good body angle on that forecheck.|That is quality puck handling in tight space.|You can feel the tension building.|He kept his feet moving and found space.|Gap control, stick position, those are the details.|The trailer on the rush is always dangerous.|Good change on the fly, no gap left.|He is skating with confidence tonight.|There is not much room to work in the slot.|They have been dangerous off the rush.|That is a tough position to defend.|Good use of the boards to get around him.|He has a quick release, and the goalie knows it.|The crowd is really into it now.|Each shift is another chance to turn this around.|His edgework in the corners is impressive.|Very sound positionally.|He drives the net hard every time.|They are making the extra pass, that is what opens things up.|Great awareness there, he knew where the help was.|The forecheck is forcing mistakes.|Balanced scoring is the sign of a deep team.|You never know what happens when the puck bounces off the boards.|A tidy shift, nothing wasted.|That kind of effort wears the other side down.|The game is tight and it could break either way.'),
        goal: S('That is a beautiful finish.|You cannot stop that, he picked his spot.|The bench is going crazy.|The goalie never saw it through the traffic.|That release was perfect.|You could hear the room erupt.|He found the one gap and used it.|That one never had a chance of being stopped.|Clean hands, clean finish.|The whole bench saw that coming a mile away.|That is textbook, the shot was placed, not thrown.|Credit the pass that set that up.|He waited for the goalie to move and then went the other way.|You do not get many looks like that, and he cashed it in.'),
        tie: S('That changes the whole mood of this game.|They needed that, and they got it.|Everything resets now.|Pressure back on both sides.|They kept pushing, and it paid off.|The momentum is theirs now.|Nobody can relax now, it is a fresh game.|The crowd has found its voice again.|That goal came from sustained pressure.|Both benches just got a reminder how fast this turns.|They never stopped believing they could get one back.|Balanced again, and the next goal matters a lot.|That one was earned, shift after shift.|It was only a matter of time with that pressure.'),
        clutch: S('Big moments, big players.|They will have to protect this lead now.|Nerves will be tested from here.|That is the kind of goal teams remember.|The clock is their friend now.|Now it is about composure.|Time and score now, every shift counts.|That goal carries real weight at this point.|They will be thinking about defense first from here.|The other bench has to answer, and quickly.|A goal like that settles the nerves on one side.|Now watch how they manage the puck.|Late goals change how everyone plays.|That is the cushion they were looking for.'),
        save: S('Great positioning there.|He read that all the way.|He was square to the shooter.|That is a goalie who tracks the puck.|Calm hands there.|He took away the angle.|He stayed big and let the puck hit him.|That was all positioning, no panic.|He got his glove into the right spot early.|Rebound control there, nothing loose.|He looked the shot all the way in.|Good tracking through the traffic.|Smart, patient goaltending.|He made that look routine.'),
        bigsave: S('That could be the turning point.|He just bought his team some life.|The shooter had the whole net and the goalie got there.|Quick feet, that was a tough one.|That save will lift the whole bench.|The goalie won that battle.|That was a goal five seconds ago, and he stopped it.|Absolutely stood on his head there.|The whole building held its breath.|Credit to him for staying with the play after the pass.|That is a save that keeps a team in the game.|He read the release perfectly.|That one deserves a replay.|The shooter cannot believe it.'),
        chance: S('He got behind the coverage and nobody picked him up.|Space in the slot is gold.|Good movement without the puck made that.|That is how you work the seam.|Defense lost him for a second.|A little time and room, and look what happens.|That is a dangerous spot to shoot from.|He had time to pick a corner there.|Nobody was within a stick length of him.|The pass hit him in stride, that is half the battle.|That is a high-percentage look.|A step quicker and that is a goal.|Good puck movement created that.|They worked that play perfectly.'),
        breakaway: S('Now it is all about patience.|Goalie has to stay square here.|Great jump out of the neutral zone.|Defense got caught flat footed.|One move, then finish.|That is the pressure situation for a shooter.|One on one with the goalie, this is the moment.|He has speed, he has room, let us see what he does.|Everything is on the shooter now.|Nobody is catching him from behind.|The goalie has to commit and hope.|It is just him and the net.|A breakaway tests nerve as much as skill.|He has all the time in the world, or so it feels.'),
        check: S('That one will be felt tomorrow.|Clean hit, finished through the body.|Good body position, shoulder to shoulder.|He got his head up too late.|That sends a message.|Right time for a hit like that.|That hit separated him from the puck.|He finished his check all the way through.|He picked his spot and used his size.|Heads up out there, that was a big one.|You have to respect a clean, hard hit.|He did not want to see that coming.|That was a message sent early.|Good body position there, he rode him off the puck.'),
        pen: S('That will give the other side a power play.|He cannot afford that here.|Needless, and now they have to kill it.|The penalty kill has to be sharp.|That hurts the shift rotation too.|Discipline is a real problem.|That is a penalty that changes the game plan.|He gave the other side a chance to get something going.|A lazy stick and now they are shorthanded.|Discipline matters in a game this tight.|The power play gets a chance to set up.|That one was a little careless.|Now they will need a big kill.|You cannot afford that against a good power play.'),
        pp: S('Movement on the half wall is what to watch.|They need to shoot, not just pass.|Puck movement beats the box.|A power play lives or dies on the first entry.|Look for the seam pass across.|They need traffic in front.|The power play needs puck movement, not just shots.|Watch for the seam pass across the slot.|The penalty kill has to stay disciplined.|Plenty of room to work with an extra skater.|A goal here would swing the whole period.|Pressure the points and make them scramble.|It all starts with winning the first clear.|Two minutes can feel very long to the shorthanded side.'),
        shot: S('Get it on net, good things happen.|Lots of rebounds start with a simple shot.|Keeps the goalie busy.|You have to put it on net.|A shot from there creates sticks to tip.|Fine, hard to see it through traffic.|Get the puck on net and see what happens.|A little traffic in front always helps.|He is looking to create a rebound there.|Shooting from the point, hoping for a tip.|That one was labeled for the glove side.|Keep shooting, the goalie has to fight through screens.|Quick release, hard to read.|Any shot can get through with bodies in front.'),
        draw: S('Those draws set the tone.|Possession starts at the dot.|Winning the draw buys you a shift.|Wingers have to be ready off the draw.|Small battles matter.|Timing on the dot is everything.|Those faceoffs decide who has the puck first.|Good center, he pulled that straight back.|Possession starts right here.|The winger was ready for that one.|A clean win and they get a set play.|Lots of little details in a faceoff.|He tied up the stick and won the battle.|A loss there and they are chasing.'),
        pend: S('A lot to talk about after that period.|They will fix things in the room.|Teams reset and go again.|Good pace on both sides.|Plenty of tape to review.|Everything is still in play.|A lot of hockey left to play.|Both teams will regroup in the room.|Plenty of chances, now it is about finishing.|The next period will tell us who wants it more.|A couple of adjustments will make all the difference.|The tempo has been good, no letdown please.|Coaches will have plenty to say.|Everything is still in front of them.'),
        quiet: S('Not many fans in the building, you can hear every stick tap.|It is almost quiet enough to hear the puck breathe.|Plenty of room in the stands tonight.|Quiet building, loud ice.|You can hear the coaches from here.|Echoes in the empty seats.|A bit of a breather, but this can turn in a second.|Both teams feeling each other out.|The crowd is settling in.|Slower pace for the moment, waiting for a mistake.|Nobody wants to give the other side a gift.|Look at the positioning, tight on both ends.|Good structure from both clubs.|Sometimes the quiet shifts say the most.'),
        rebound: S('Always follow your shot.|Second effort wins those.|Rebound control is the goalie job.|Nobody covered the stick side.|That kind of scramble makes goals.|Look at how quick that was.')
      }
    },
    locker: {
      pbp: {
        routine: S('{p} dishes it.|{p} slides it ahead.|{p} flips it over.|{p} touch pass, nice.|{p} whips it across.|{p} gets the puck moving.'),
        chance: S('{p} gets a sweet look!|{p} is wide open in the slot!|Oh, {p} has time in front!|{p} gets the good seat in the house!|{p} in tight, uh oh!|{p} with a grade A chance!'),
        breakaway: S('{p} is gone! Breakaway, baby!|Free ice! {p} is off to the races!|{p} on a breakaway, everyone else is toast!|Nobody home on defense, {p} is in alone!|{p} in on the goalie, all by himself!|Breakaway for {p}, do something!'),
        shot: S('{p} rips one!|{p} sends it!|{p} throws it on net!|{p} launches one!|{p} wires it!|{p} flings a shot!'),
        slap: S('{p} winds up, boom!|{p} loads the cannon!|{p} takes a big cut!|Slapper from {p}, ouch!|{p} swings for the fences!|{p} smokes a slapper!'),
        onetimer: S('{p} one timer, wow!|{p} one times it, nasty!|{p} snaps it off the pass!|{p} hammers the one timer!|One timer, {p}, no wind up needed!|{p} turns it around first time!'),
        save: S('{g} said not today!|{g} robs him!|{g} kicks it away!|{g} swallows it up!|{g} with the snatch!|{g} is there, easy.|{g} just stops it.'),
        bigsave: S('{g} stole that one!|Are you kidding me, {g}!|{g} with a grand larceny!|{g} is on a mission!|Absolute robbery by {g}!|{g} is standing on his head!'),
        rebound: S('Rebound! {p} swings again!|{p} smells a loose puck!|It pops out to {p}!|Second shot for {p}, go go go!|{p} cleans up the garbage!|The scramble goes to {p}!'),
        goal: S('{p}! Right in the twine for {t}!|Light the lamp! {p}! {t}!|{p} paints the corner! {t}!|{p} buries it, boom!|Oh my, {p}! Goal for {t}!|{p} cashes in for {t}!'),
        tie: S('{p} ties it, we are even!|All tied up, {p} does it!|{p} just got {t} back in this thing!|Everything level, thanks to {p}!|{p} makes it a new game!|Equalizer from {p}, wild!'),
        lead: S('{p} puts {t} on top!|{t} are in front, {p} did it!|{p} breaks the deadlock!|Lead for {t}, goal by {p}!|{p} flips the scoreboard!|{t} go up, {p} with the dagger!'),
        clutch: S('{p} with a monster late goal, {t} in front!|Third period dagger by {p}!|{p} is cold blooded, {t} lead!|Late and loud! {p} puts {t} ahead!|{p} breaks hearts in the third!|Clutch goal by {p}!'),
        winner: S('{p} is the overtime hero for {t}!|Game over! {p} sends everybody home!|{p} ends it, {t} win in overtime!|Sudden death, {p} says goodnight!|{p} walks it off for {t}!|Overtime magic from {p}!'),
        check: S('{p} just flattened him!|{p} rattles the glass!|{p} drops the hammer!|{p} with a truck stick, I mean hit!|{p} lights him up!|{p} sends him for a ride!'),
        poke: S('{p} swipes it, pickpocket!|{p} swats it away!|{p} strips him clean!|{p} lifts the stick, puck gone!|Sneaky poke by {p}!|{p} steals it, smooth!'),
        draw: S('{p} wins it clean.|{p} wins the draw, easy.|{p} sneaks it back.|{p} takes the dot.|{p} scoops it back, nice.|Puck goes to {p} off the draw.'),
        cover: S('{g} sits on it.|{g} freezes it, whistle.|{g} smothers the puck.|{g} hugs it, play dead.|{g} says that is mine.|{g} gloves it and falls on it.'),
        pen: S('{p} is going to the sin bin for {why}.|{p} off for {why}, oops.|Sin bin for {p}, {why}.|{p} takes a seat for {why}.|{p} gets a rest, {why}.|{p} cooks in the box for {why}.'),
        ppstart: S('Power play for {t}, let us cook!|{t} get the extra man!|{t} on the man advantage, go!|Time for {t} to feast on the power play.|Extra skater for {t}.|{t} smell blood on the power play.'),
        ppend: S('Penalty over, back to even.|Man advantage is done.|Five on five again.|Box is empty, even strength.|Power play is gone.|Everybody is back at full strength.'),
        fall: S('{p} eats ice.|{p} wipes out.|{p} bites the ice.|{p} is on his back.|{p} goes down hard.|Ouch, {p} takes a spill.'),
        pstart: S('Drop the puck, {n} period!|{n} period, let us go!|Here comes the {n} period!|We roll into the {n}!|{n} period, buckle up!|On to the {n}, puck drop!'),
        pend: S('That is the {n} period, done!|Horn sounds, {n} is over!|{n} period wraps up!|End of the {n}, grab a snack.|{n} period is in the bag.|Time, {n} period over!'),
        quiet: S('Nothing doing out there.|Somebody wake the rink up.|A snoozer of a stretch.|Boys are feeling it out.|Slow shift, anybody awake?|Pretty quiet right now.')
      },
      col: {
        gen: S('That skater is moving like he has a bus to catch.|Somebody is working hard and someone else is working harder.|Beer league never looked so good.|Those legs are going to feel it tomorrow.|That one deserves a snack and a nap.|Everybody out there thinks they are a hero right now.|Nice hustle, I am tired just watching.|Pass it, pass it, shoot it, oh well.|That puck is greasier than a pizza box.|He skates like the rink is on fire.|The stick work is getting artistic.|That play had more twists than a pretzel.|A little chaos is good for the soul.|Somebody went to the zamboni school of skating.|The coaches are probably yelling at the wall.|He did not see that coming, nobody did.|Those linemates have that look in their eyes.|It is getting loud in here and I love it.|That was a nice bit of hockey, and not a single apology.|Everybody wants the puck, nobody wants to chase it.|Classic hockey, a bounce and a prayer.|This game has the energy of a Friday night.|Great effort, questionable decisions.|He is skating like he owes someone money.|That defender needs a map.|A little finesse, a little chaos, a lot of fun.|He is laying out for the puck like it is the last slice.|The back bench is pumped.|Somebody check the rink for hidden speed bumps.|That one got a little spicy.|Whoever is on the bench, wake them up.|You know it is a good game when nobody sits down.|That was a pass with a lot of faith behind it.|Hockey is a game of mistakes, and that was a beauty.|He could have just waited, but where is the fun in that.|Elbows up, heart out, that is how it is done.|Everybody out there is committed to the bit.|The ice is fast tonight, the legs are slower.|That was a bold choice and I admire it.|Skating in circles but with purpose.|He found the soft spot like a pro.|Those wingers are doing their best.|There is a lot of heart on that ice.|He just stepped into a pile of hockey.|Back it up, bring it forward, shoot it anyway.|Somebody was feeling brave on that one.|He is a human highlight reel with questionable footwork.|The goalie is going to have a story for the bar.|It is all fun and games until someone ices it.|Very respectable stick handling for a Tuesday.|The home crowd is in it, you can hear it.|That is hockey, folks, ugly and beautiful at once.|There is a lot of passion out there tonight.|It is a good thing nobody is keeping a list of those turnovers.|A tidy little give and go, loved it.|He is the engine of that line.|Nobody wants to lose this one, you can see it.|Fast hands, slow feet, great combination.|That forward is a pest and the other side hates it.|Another day, another delightful mess on the ice.|Looks like everyone is having a blast.|If that is not hockey, I do not know what is.'),
        goal: S('Absolute snipe, no chance for the goalie.|Dirty. Just dirty.|Pure filth.|He picked a corner and it was lights out.|That one had eyes.|Goalie never had a prayer.|Dirty. Absolutely dirty.|Shot it like it owed him money.|The goalie is still looking for that puck.|He picked the top shelf like he was getting a snack.|Somebody buy that man a beverage.|That one had a little attitude on it.|Pure filth right there.|And the building agrees, that was unreal.'),
        tie: S('Game on, folks!|Back from the dead!|Never count them out.|That woke up the bench.|They got it done, big time.|We have a hockey game now.|Well, now we have a game.|Somebody woke up in the dressing room.|They said no, you are not getting away with that.|Back to square one, and the bench is loud.|Scoreboard fixed itself.|That is how you answer.|The momentum just did a U-turn.|They were not going to lose quietly.'),
        clutch: S('Ice in his veins, man.|That is the one you tell your buddies about.|Everybody is sweating now.|The pressure is heavy now.|Hold on to your sticks.|Clock is ticking, nerves are shaking.|Big time goals, big time ice.|That is a dagger, you can see it on their faces.|Now try and catch him.|Ice in the veins on that one.|That one hurts the other bench.|Clock is going to be their best friend.|They smell blood now.|Do not blink at this point.'),
        save: S('Stoned him!|That goalie is in his head now.|Brick wall.|Shooter needs a new plan.|Cat like reflexes.|Gloved like a pro.|Stoned him!|Not today, buddy.|He was just lurking there like a wall.|The shooter got a face full of equipment.|Goalie said you shall not pass.|That puck had nowhere to go but his glove.|Just routine for a guy built like that.|He made that look boring.'),
        bigsave: S('Highway robbery!|Put that one on the highlight reel.|Shooter is still wondering where it went.|That save was a crime.|Goalie bailed them out.|Unbelievable, he stole one.|Robbery! Absolute robbery!|The shooter is going to be mad about that one all week.|That goalie is a magician.|Somebody check his pads for a trapdoor.|He is in the head of every shooter now.|That save was filthy in the best way.|Full extension, full attitude.|That is going to be on the highlight reel.'),
        chance: S('Somebody forgot to cover that guy.|Free real estate in the slot.|Defense took a nap.|That is how you get open.|Eyes on the net, boys.|Pure space, pure danger.|Wide open, that is a gift basket.|The defense took a coffee break.|Somebody call a search party for the defender.|He had more room than a minivan parking lot.|That is how you get a goal, a lot of space and a little nerve.|If he hits that, it is going in the vault.|Look at all that room, he could have had a sandwich.|The goalie should be nervous.'),
        breakaway: S('Now do not choke.|Deke, deke, or just shoot!|Pressure is all on the shooter.|Goalie has to be a wall here.|Defense got burned.|Whatever happens, that was ugly for the defense.|He is gone! Nobody is catching him!|One on one, and the goalie looks lonely.|This is the moment every kid dreams of.|He has the whole ice to himself.|Sweaty palms time.|The defender is just a spectator now.|Do not miss, do not miss.|Here comes the move, or maybe not.'),
        check: S('He felt that in his fillings.|Welcome to the neighbourhood.|That is going to leave a mark.|Somebody call a doctor.|Nice shoulder, my guy.|Kid is seeing stars.|That one will feel good tomorrow, for exactly one person.|Welcome to the neighborhood.|He saw stars and maybe the zamboni.|That was a freight train with skates on.|Somebody check if he is still in the building.|That hit had a postal code.|He did not enjoy that, I can tell.|There is the tax for holding the puck too long.'),
        pen: S('That is a two minute vacation.|Keep the stick down, boys.|Dumb penalty, everyone saw it.|Nobody asked for that.|The box is getting crowded.|Time to play defense.|Keep the stick down, boys.|The sin bin has a free seat.|That is a two minute vacation.|You could see that one coming from the parking lot.|That is how you ruin your own night.|Maybe watch the hands next time.|Free power play, courtesy of him.|The referee had no choice.'),
        pp: S('Move the puck, make them chase.|Shoot it, someone will tip it.|Quick passes, that is the key.|Get a body to the net.|Set the screen, stay there.|Make the penalty killers dizzy.|Time to get creative with the extra man.|The penalty kill is about to earn their paycheck.|All that room, all that time.|Move the puck, make them chase.|Two minutes of fun for the power play.|The kill needs someone to be a hero.|A goal here and the whole bench goes nuts.|They have the advantage, now use it.'),
        shot: S('Throw it at the net, see what happens!|Shoot, shoot, shoot!|Pucks on net, I love it.|Doesn\'t matter how, put it on goal.|Get those sticks in the paint.|Fire away!|Throw it at the net and see what happens.|Bar down energy right there.|He wound up like he meant it.|Put some mustard on it.|The goalie is not going to love that one.|He let it fly with nothing to lose.|Fire at will.|Every shot is a possibility.'),
        draw: S('Cheating on that draw, but I respect it.|Dot battles are the real fights.|Wins the draw, wins the shift.|He tied the stick up well.|Quick hands on the dot.|Can\'t beat a clean draw.|Cheating on that draw, but I respect it.|The center really wanted that one.|Won it clean, nobody saw a thing.|He pulled that back like a magician.|Winner winner, puck is mine.|Somebody cheated, probably both of them.|A faceoff is just a fight with a prize.|And the battle goes to the quick hands.'),
        pend: S('Grab a snack, we will be right back.|Coaches are going to yell now.|Lots of juice left in this one.|Bench boss will have words.|Heads up, boys.|Whew, that was a ride.|Go grab a drink, we will be right back.|Time for a quick breather and a snack.|Coaches will yell, players will nod.|What a period, and there is more to come.|The ice crew is about to earn its keep.|Fresh ice, fresh legs, fresh chances.|Nobody is going home early.|Take a lap, we will see you in a few.'),
        quiet: S('The building is dead quiet, almost spooky.|We could hear a pin drop.|Half the seats are empty, I do not blame them.|Crickets in this room.|Quiet crowd, noisy ice.|You can hear the zamboni dreaming.|Feels like a chess match out there.|Everybody is playing it safe, this might not last.|Good time to check on your snacks.|Slow stretch, but this game is full of surprises.|The calm before the next big hit.|Both teams waiting for someone to blink.|Not much going on, enjoy it.|Even the crowd is catching its breath.'),
        rebound: S('Always follow it up.|Second chances are the best chances.|That rebound was gift wrapped.|Crash the net, boys.|Loose pucks are dangerous.|Goalie left a juicy one.')
      }
    }
  };
  const rank = v => (/natural|neural|online|enhanced|premium/i.test(v.name) ? 6 : 0) + (/google/i.test(v.name) ? 3 : 0) + (/^en[-_]US/i.test(v.lang) ? 8 : /^en[-_]GB/i.test(v.lang) ? -4 : /^en/i.test(v.lang) ? 0 : -9) + (v.localService ? 0 : 1) - (/espeak|compact|novelty|zarvox|bad|whisper|bells|organ/i.test(v.name) ? 9 : 0);
  function voices() {
    if (ANN.voices) return ANN.voices;
    const all = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    const en = all.filter(v => /^en/i.test(v.lang)).sort((a, b) => rank(b) - rank(a));
    const isF = v => /zira|samantha|susan|jenny|aria|female|karen|victoria|moira|tessa|libby|sonia|hazel|ava|allison|joanna|emma|google uk english female/i.test(v.name);
    const male = en.filter(v => !isF(v)), fem = en.filter(isF);
    if (en.length) ANN.voices = { a: male[0] || en[0], b: fem[0] || male[1] || en[1] || en[0], m2: male[1] || male[0] || en[0] };
    return ANN.voices || { a: null, b: null, m2: null };
  }
  ANN.speakLine = function (txt, who, done) {
    if (!window.speechSynthesis || typeof AU === 'undefined' || !AU.on || !AU.say) { done && done(); return; }
    try {
      const v = voices(), u = new SpeechSynthesisUtterance(txt), vv = who === 'col' ? (ANN.col === 'm' ? v.m2 : v.b) : v.a;
      if (vv) u.voice = vv;
      u.rate = who === 'col' ? 0.97 : 1.05; u.pitch = who === 'col' ? (ANN.col === 'm' ? 0.95 : 1.0) : 0.9; u.volume = Math.min(1, AU.vol || .7);
      u.onend = u.onerror = () => done && done(); speechSynthesis.speak(u);
    } catch (e) { done && done(); }
  };
  function pump() {
    if (ANN.busy) return;
    let it; while ((it = ANN.q.shift()) && it.exp && now() > it.exp) it = null; // drop stale lines
    if (!it) return; ANN.busy = true;
    let fin = false; const go = () => { if (fin) return; fin = true; ANN.busy = false; pump(); };
    setTimeout(go, 6000);
    ANN.speakLine(it.t, it.w, go);
  }
  function enqueue(t, w, prio, exp) {
    if (prio) { try { speechSynthesis.cancel(); } catch (e) { } ANN.q.length = 0; ANN.busy = false; }
    else if (ANN.q.length > 2) return false;
    ANN.q.push({ t, w, exp }); pump(); return true;
  }
  // Pick a template for this mode / voice, never one of the last HN used (templates and final text).
  const HN = 8;
  function choose(cat, who, vars) {
    const set = L[ANN.mode]; if (!set) return null;
    const arr = set[who][cat]; if (!arr || !arr.length) return null;
    const fresh = arr.filter(s => ANN.hist.indexOf(s) < 0);
    const pool = fresh.length ? fresh : arr.filter(s => ANN.hist.indexOf(s) < Math.max(0, ANN.hist.length - 5)); // last resort: still avoid latest 6
    const tpl = pick(pool.length ? pool : arr);
    const txt = tpl.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : ''));
    ANN.hist.push(tpl); if (ANN.hist.length > HN) ANN.hist.shift();
    return txt;
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  // Per-category cooldowns (ms), plus the global budget GAP between any two non-goal calls.
  const CD = { routine: 14000, chance: 6000, breakaway: 9000, shot: 7000, slap: 7000, onetimer: 7000, save: 6000, bigsave: 8000, rebound: 8000, check: 9000, poke: 14000, draw: 11000, cover: 8000, fall: 16000, pen: 3000, ppstart: 20000, ppend: 15000, pstart: 8000, pend: 8000, quiet: 28000 };
  const GAP = 3000;
  const PRIO = { goal: 1, tie: 1, lead: 1, clutch: 1, winner: 1 };
  const IMP = { pen: 1, ppstart: 1, ppend: 1, pstart: 1, pend: 1 }; // deferred (not dropped) when over budget
  function cdOk(cat) { const n = now(); return n - (ANN.cd[cat] || -1e9) >= (CD[cat] || 4000); }
  // Colour chance by situation; colour talks only in a gap after the play line and at most once per 8 s.
  const COLP = { goal: 1, tie: .9, clutch: .9, winner: .9, lead: .6, save: .3, bigsave: .6, chance: .35, breakaway: .5, check: .45, pen: .55, ppstart: .4, shot: .15, slap: .3, draw: .2, pend: .5, rebound: .4, quiet: .8 };
  const COLCAT = { lead: 'goal', winner: 'clutch', ppstart: 'pp', slap: 'shot', onetimer: 'shot', pstart: null, ppend: null };
  function talk(cat, vars, opt) {
    if (ANN.mode === 'off') return false;
    opt = opt || {}; const n = now(), prio = !!PRIO[cat];
    if (!prio) {
      if (!cdOk(cat)) return false;
      if (n - ANN.lastT < GAP || ANN.q.length > 1) { if (IMP[cat] && ANN.pend.length < 3) ANN.pend.push({ cat, vars, t: n }); return false; }
    }
    const txt = choose(cat, 'pbp', vars); if (!txt) return false;
    ANN.cd[cat] = n; ANN.lastT = n; ANN.lastAny = n;
    enqueue(txt, 'pbp', prio, n + (prio ? 99999 : 4500));
    // colour analysis, only when there is time
    const cc = cat in COLCAT ? COLCAT[cat] : cat;
    if (cc && ANN.col !== 'off' && n - ANN.lastCol > (prio ? 2500 : 8000) && Math.random() < (COLP[cat] != null ? COLP[cat] : .25) && L[ANN.mode].col[cc]) {
      const ct = choose(L[ANN.mode].col.gen && Math.random() < .45 ? 'gen' : cc, 'col', vars);
      if (ct) { ANN.lastCol = n; ANN.q.push({ t: ct, w: 'col', exp: n + (prio ? 9000 : 4500) }); pump(); }
    }
    return true;
  }
  ANN.talk = talk;
  // ---- game awareness ----
  const gG = () => (typeof G !== 'undefined' ? G : null);
  function goalDist(p) { try { const gx = p.team.oppGX; return Math.hypot(gx - p.x, (typeof MY !== 'undefined' ? MY : 42.5) - p.y); } catch (e) { return 99; } }
  function isBreakaway(p) {
    try {
      const t = p.team, o = t.opp || (t === H1 ? A1 : H1), s = Math.sign(t.oppGX - 100) || 1, d = goalDist(p);
      if (d > 80 || d < 6) return false;
      for (const q of onIce(o)) { if (q.box || q.on === false) continue; if ((q.x - p.x) * s > 1.5 && Math.abs(q.y - p.y) < 40) return false; }
      return true;
    } catch (e) { return false; }
  }
  const ordn = n => ['', 'first', 'second', 'third', 'overtime'][n] || 'next';
  ANN.ev = function (p, k, d) {
    if (ANN.mode === 'off' || !p) return; d = d || {};
    try {
      const n = now();
      if (k === 'gain' && p.name === 'Justin Faithfull' && ANN.col !== 'off' && n - (ANN.stBeerT || -1e9) > 25000) {  // running gag: the color man calls him St. Beer
        const SB = ['And St. Beer has the puck. Look at that raccoon tail trailing behind him.', 'Saint Beer picks it up, raccoon tail swaying like it has somewhere to be.', 'St. Beer in possession, and the raccoon tail is doing most of the stickhandling.', 'Bless this rush. St. Beer, raccoon tail and all.', 'Careful with the puck, St. Beer. The raccoon tail is not a legal stick.'];
        const fresh = SB.filter(x => ANN.hist.indexOf(x) < 0), ln0 = pick(fresh.length ? fresh : SB);
        ANN.hist.push(ln0); if (ANN.hist.length > 8) ANN.hist.shift(); ANN.stBeerT = n; ANN.lastCol = n; ANN.q.push({ t: ln0, w: 'col', exp: n + 6000 }); pump(); return;
      }
      if (k === 'shot') {
        const kind = d.kind === 'slap' ? 'slap' : d.kind === 'onetimer' ? 'onetimer' : 'shot', dist = goalDist(p), bk = isBreakaway(p);
        const close = dist < 32 || (kind === 'onetimer' && dist < 48);
        ANN.lastShot = { t: n, dist, hard: kind === 'slap' || kind === 'onetimer', close, bk, p: p.team };
        const reb = n - ANN.lastSave < 2600 && dist < 38;
        let cat = reb ? 'rebound' : bk ? 'breakaway' : close ? 'chance' : kind;
        if (!talk(cat, { p: ln(p) }) && cat !== kind && cat !== 'rebound') talk(kind, { p: ln(p) });
        try { AU.swell && AU.swell(close ? .6 : .3); } catch (e) { }
      } else if (k === 'save') {
        const ls = ANN.lastShot, big = ls && n - ls.t < 3500 && (ls.close || ls.hard || ls.bk);
        ANN.lastSave = n;
        if (big) { talk('bigsave', { g: ln(p) }) || talk('save', { g: ln(p) }); try { AU.swell && AU.swell(.9); } catch (e) { } }
        else talk('save', { g: ln(p) });
      } else if (k === 'check') talk('check', { p: ln(p) });
      else if (k === 'poke') talk('poke', { p: ln(p) });
      else if (k === 'draw') talk('draw', { p: ln(p) });
      else if (k === 'cover') talk('cover', { g: ln(p) });
      else if (k === 'fall') talk('fall', { p: ln(p) });
      else if (k === 'gain' || k === 'recv' || k === 'pass') {
        if (isBreakaway(p) && (k !== 'pass')) { talk('breakaway', { p: ln(p) }); }
        else if (k === 'pass') {
          if (goalDist(p) < 36 && Math.random() < .5) talk('chance', { p: ln(p) }); else if (Math.random() < .5) talk('routine', { p: ln(p) });
        }
      }
    } catch (e) { }
  };
  ANN.goal = function (p, t) {
    if (ANN.mode === 'off') return;
    try {
      const g = gG(), tn = t && t.name ? t.name : 'the home side', v = { p: ln(p), t: tn };
      let cat = 'goal';
      if (g && g.score) {
        const idx = t === H1 ? 0 : 1, us = g.score[idx], them = g.score[1 - idx];
        if (g.ot) cat = 'winner';
        else if (us === them) cat = 'tie';
        else if (us === them + 1) cat = g.period >= 3 ? 'clutch' : 'lead';
      }
      ANN.pend.length = 0; ANN.cd.goal = 0; ANN.lastShot = null;
      talk(cat, v);
    } catch (e) { talk('goal', { p: ln(p), t: 'the home side' }); }
  };
  ANN.penalty = function (p, why) {
    if (ANN.mode === 'off') return;
    try {
      const v = { p: ln(p), why: why || 'a penalty' };
      talk('pen', v);
      const pp = p && p.team && p.team.opp, ppq = pp ? pp.name : 'the other side';
      ANN.pend.push({ cat: 'ppstart', vars: { t: ppq }, t: now(), at: now() + 3200 });
    } catch (e) { }
  };
  // ---- poll: deferred lines, period changes, power play end, lulls ----
  const st = { per: 0, ended: -1, pens: [0, 0], started: false };
  ANN.poll = function () {
    if (ANN.mode === 'off') return;
    try {
      const n = now(), g = gG();
      // deferred important lines: say one when budget allows, drop stale ones
      while (ANN.pend.length && n - ANN.pend[0].t > 6500) ANN.pend.shift();
      if (ANN.pend.length) { const it = ANN.pend[0]; if (!(it.at && n < it.at) && n - ANN.lastT >= GAP && ANN.q.length < 2) { ANN.pend.shift(); talk(it.cat, it.vars); } }
      if (!g) return;
      if (g.period !== st.per && g.period && !g.over) {
        const first = st.per === 0; st.per = g.period; st.ended = -1;
        if (first ? g.clock > 0 : true) talk('pstart', { n: ordn(g.period) });
      }
      if (st.per && st.ended !== g.period && g.clock <= 0.3 && !g.ot && g.period <= 3 && !g.over) { st.ended = g.period; talk('pend', { n: ordn(g.period) }); }
      const pa = [H1.pen.length, A1.pen.length];
      if ((pa[0] < st.pens[0] && !pa[0]) || (pa[1] < st.pens[1] && !pa[1])) talk('ppend', {});
      st.pens = pa;
      if (n - ANN.lastAny > 17000 && !(g.pause > 0) && g.clock > 5) { talk('quiet', {}); ANN.lastAny = n; }
    } catch (e) { }
  };
  setInterval(() => ANN.poll(), 700);
  ANN.setCol = function (c) { ANN.col = c; try { localStorage.setItem('lihl_col', c); } catch (e) { } };
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { ANN.voices = null; };
  ANN.setMode = function (m) { ANN.mode = m; try { localStorage.setItem('lihl_ann', m); } catch (e) { } if (m === 'off') { ANN.q.length = 0; ANN.pend.length = 0; try { speechSynthesis.cancel(); } catch (e) { } } };
  window.AEHOOK = ANN.ev;
})();
