import os, re
os.chdir(os.path.dirname(os.path.abspath(__file__)))

PRO = """Good gap control from the defense there.|You can see the work ethic on every shift.|Strong stick position, that took away the lane.|The forwards are doing a nice job tracking back.|He reads the play a half second before everyone else.|Look at the spacing between the skaters, that is smart hockey.|Timing is everything on a play like that.|That line has real chemistry together.|Smart to get it deep and change.|You win games with the little things.|The legs look fresh out there.|He is a pest on the forecheck and it pays off.|Great patience with the puck.|That was a heads up play.|The defense pairing is communicating well.|Nobody wants to turn it over in this zone.|Short shifts keep the pace high.|He lets the play come to him, very calm.|The center is doing the heavy lifting in both zones.|That is a good example of puck support.|You have to respect how well they cycle.|The neutral zone is clogged, nothing easy.|Clean breakout, three quick passes.|He is protecting the puck with his body.|Strong battle along the boards.|He gets his stick in the lane every time.|The winger cut to the middle, that is the right read.|Great hustle on the backcheck.|The goalie is controlling his rebounds nicely tonight.|The pace has picked up in the last minute.|Both teams are blocking shots, that is commitment.|He made the simple play, and that is often the right one.|A little patience and that opens up.|Nice give and go through the middle.|The defenseman stepped up and closed the gap.|They are leaning on their top line right now.|Good body angle on that forecheck.|That is quality puck handling in tight space.|You can feel the tension building.|He kept his feet moving and found space.|Gap control, stick position, those are the details.|The trailer on the rush is always dangerous.|Good change on the fly, no gap left.|He is skating with confidence tonight.|There is not much room to work in the slot.|They have been dangerous off the rush.|That is a tough position to defend.|Good use of the boards to get around him.|He has a quick release, and the goalie knows it.|The crowd is really into it now.|Each shift is another chance to turn this around.|His edgework in the corners is impressive.|Very sound positionally.|He drives the net hard every time.|They are making the extra pass, that is what opens things up.|Great awareness there, he knew where the help was.|The forecheck is forcing mistakes.|Balanced scoring is the sign of a deep team.|You never know what happens when the puck bounces off the boards.|A tidy shift, nothing wasted.|That kind of effort wears the other side down.|The game is tight and it could break either way."""

LOCK = """That skater is moving like he has a bus to catch.|Somebody is working hard and someone else is working harder.|Beer league never looked so good.|Those legs are going to feel it tomorrow.|That one deserves a snack and a nap.|Everybody out there thinks they are a hero right now.|Nice hustle, I am tired just watching.|Pass it, pass it, shoot it, oh well.|That puck is greasier than a pizza box.|He skates like the rink is on fire.|The stick work is getting artistic.|That play had more twists than a pretzel.|A little chaos is good for the soul.|Somebody went to the zamboni school of skating.|The coaches are probably yelling at the wall.|He did not see that coming, nobody did.|Those linemates have that look in their eyes.|It is getting loud in here and I love it.|That was a nice bit of hockey, and not a single apology.|Everybody wants the puck, nobody wants to chase it.|Classic hockey, a bounce and a prayer.|This game has the energy of a Friday night.|Great effort, questionable decisions.|He is skating like he owes someone money.|That defender needs a map.|A little finesse, a little chaos, a lot of fun.|He is laying out for the puck like it is the last slice.|The back bench is pumped.|Somebody check the rink for hidden speed bumps.|That one got a little spicy.|Whoever is on the bench, wake them up.|You know it is a good game when nobody sits down.|That was a pass with a lot of faith behind it.|Hockey is a game of mistakes, and that was a beauty.|He could have just waited, but where is the fun in that.|Elbows up, heart out, that is how it is done.|Everybody out there is committed to the bit.|The ice is fast tonight, the legs are slower.|That was a bold choice and I admire it.|Skating in circles but with purpose.|He found the soft spot like a pro.|Those wingers are doing their best.|There is a lot of heart on that ice.|He just stepped into a pile of hockey.|Back it up, bring it forward, shoot it anyway.|Somebody was feeling brave on that one.|He is a human highlight reel with questionable footwork.|The goalie is going to have a story for the bar.|It is all fun and games until someone ices it.|Very respectable stick handling for a Tuesday.|The home crowd is in it, you can hear it.|That is hockey, folks, ugly and beautiful at once.|There is a lot of passion out there tonight.|It is a good thing nobody is keeping a list of those turnovers.|A tidy little give and go, loved it.|He is the engine of that line.|Nobody wants to lose this one, you can see it.|Fast hands, slow feet, great combination.|That forward is a pest and the other side hates it.|Another day, another delightful mess on the ice.|Looks like everyone is having a blast.|If that is not hockey, I do not know what is."""


def add_gen(s, block_start, lines):
    i = s.index(block_start)
    c = s.index("      col: {", i)
    nl = s.index("\n", c) + 1
    return s[:nl] + "        gen: S('" + lines.replace("'", "\\'") + "'),\n" + s[nl:]


s = open('announcer.js', encoding='utf-8').read()
assert "gen: S(" not in s
s = add_gen(s, "    pro: {", PRO)
s = add_gen(s, "    locker: {", LOCK)
a = "const ct = choose(cc, 'col', vars);"
assert s.count(a) == 1
s = s.replace(a, "const ct = choose(L[ANN.mode].col.gen && Math.random() < .45 ? 'gen' : cc, 'col', vars);", 1)
open('announcer.js', 'w', encoding='utf-8').write(s)
print('ok', len(PRO.split('|')), len(LOCK.split('|')))

# pimp hat wiring
g = open('game.html', encoding='utf-8').read()
a = '<script src="skater3d.js"></script>'
assert g.count(a) == 1
g = g.replace(a, a + '<script src="costumes.js"></script>', 1)
open('game.html', 'w', encoding='utf-8').write(g)
p = open('tools/protect.js', encoding='utf-8').read()
a = "const JS = ['r3d.js', 'skater3d.js',"
assert p.count(a) == 1
p = p.replace(a, "const JS = ['r3d.js', 'skater3d.js', 'costumes.js',", 1)
open('tools/protect.js', 'w', encoding='utf-8').write(p)
print('wired')
