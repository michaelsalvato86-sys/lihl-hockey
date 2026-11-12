import os, re
os.chdir(os.path.dirname(os.path.abspath(__file__)))
s = open('announcer.js', encoding='utf-8').read()

PRO = {
 'goal': "He found the one gap and used it.|That one never had a chance of being stopped.|Clean hands, clean finish.|The whole bench saw that coming a mile away.|That is textbook, the shot was placed, not thrown.|Credit the pass that set that up.|He waited for the goalie to move and then went the other way.|You do not get many looks like that, and he cashed it in.",
 'tie': "Nobody can relax now, it is a fresh game.|The crowd has found its voice again.|That goal came from sustained pressure.|Both benches just got a reminder how fast this turns.|They never stopped believing they could get one back.|Balanced again, and the next goal matters a lot.|That one was earned, shift after shift.|It was only a matter of time with that pressure.",
 'clutch': "Time and score now, every shift counts.|That goal carries real weight at this point.|They will be thinking about defense first from here.|The other bench has to answer, and quickly.|A goal like that settles the nerves on one side.|Now watch how they manage the puck.|Late goals change how everyone plays.|That is the cushion they were looking for.",
 'save': "He stayed big and let the puck hit him.|That was all positioning, no panic.|He got his glove into the right spot early.|Rebound control there, nothing loose.|He looked the shot all the way in.|Good tracking through the traffic.|Smart, patient goaltending.|He made that look routine.",
 'bigsave': "That was a goal five seconds ago, and he stopped it.|Absolutely stood on his head there.|The whole building held its breath.|Credit to him for staying with the play after the pass.|That is a save that keeps a team in the game.|He read the release perfectly.|That one deserves a replay.|The shooter cannot believe it.",
 'chance': "That is a dangerous spot to shoot from.|He had time to pick a corner there.|Nobody was within a stick length of him.|The pass hit him in stride, that is half the battle.|That is a high-percentage look.|A step quicker and that is a goal.|Good puck movement created that.|They worked that play perfectly.",
 'breakaway': "One on one with the goalie, this is the moment.|He has speed, he has room, let us see what he does.|Everything is on the shooter now.|Nobody is catching him from behind.|The goalie has to commit and hope.|It is just him and the net.|A breakaway tests nerve as much as skill.|He has all the time in the world, or so it feels.",
 'check': "That hit separated him from the puck.|He finished his check all the way through.|He picked his spot and used his size.|Heads up out there, that was a big one.|You have to respect a clean, hard hit.|He did not want to see that coming.|That was a message sent early.|Good body position there, he rode him off the puck.",
 'pen': "That is a penalty that changes the game plan.|He gave the other side a chance to get something going.|A lazy stick and now they are shorthanded.|Discipline matters in a game this tight.|The power play gets a chance to set up.|That one was a little careless.|Now they will need a big kill.|You cannot afford that against a good power play.",
 'pp': "The power play needs puck movement, not just shots.|Watch for the seam pass across the slot.|The penalty kill has to stay disciplined.|Plenty of room to work with an extra skater.|A goal here would swing the whole period.|Pressure the points and make them scramble.|It all starts with winning the first clear.|Two minutes can feel very long to the shorthanded side.",
 'shot': "Get the puck on net and see what happens.|A little traffic in front always helps.|He is looking to create a rebound there.|Shooting from the point, hoping for a tip.|That one was labeled for the glove side.|Keep shooting, the goalie has to fight through screens.|Quick release, hard to read.|Any shot can get through with bodies in front.",
 'draw': "Those faceoffs decide who has the puck first.|Good center, he pulled that straight back.|Possession starts right here.|The winger was ready for that one.|A clean win and they get a set play.|Lots of little details in a faceoff.|He tied up the stick and won the battle.|A loss there and they are chasing.",
 'pend': "A lot of hockey left to play.|Both teams will regroup in the room.|Plenty of chances, now it is about finishing.|The next period will tell us who wants it more.|A couple of adjustments will make all the difference.|The tempo has been good, no letdown please.|Coaches will have plenty to say.|Everything is still in front of them.",
 'quiet': "A bit of a breather, but this can turn in a second.|Both teams feeling each other out.|The crowd is settling in.|Slower pace for the moment, waiting for a mistake.|Nobody wants to give the other side a gift.|Look at the positioning, tight on both ends.|Good structure from both clubs.|Sometimes the quiet shifts say the most.",
 'rebound': "Rebounds are where the goals come from.|He did not control that one, and there are bodies at the net.|Second chances are dangerous chances.|The goalie has to find that puck fast.|Crash the net and good things happen.|That is a loose puck in a bad area.|Somebody has to clear that rebound.|Lots of sticks swinging at it in the crease.",
}
LOCK = {
 'goal': "Dirty. Absolutely dirty.|Shot it like it owed him money.|The goalie is still looking for that puck.|He picked the top shelf like he was getting a snack.|Somebody buy that man a beverage.|That one had a little attitude on it.|Pure filth right there.|And the building agrees, that was unreal.",
 'tie': "Well, now we have a game.|Somebody woke up in the dressing room.|They said no, you are not getting away with that.|Back to square one, and the bench is loud.|Scoreboard fixed itself.|That is how you answer.|The momentum just did a U-turn.|They were not going to lose quietly.",
 'clutch': "Big time goals, big time ice.|That is a dagger, you can see it on their faces.|Now try and catch him.|Ice in the veins on that one.|That one hurts the other bench.|Clock is going to be their best friend.|They smell blood now.|Do not blink at this point.",
 'save': "Stoned him!|Not today, buddy.|He was just lurking there like a wall.|The shooter got a face full of equipment.|Goalie said you shall not pass.|That puck had nowhere to go but his glove.|Just routine for a guy built like that.|He made that look boring.",
 'bigsave': "Robbery! Absolute robbery!|The shooter is going to be mad about that one all week.|That goalie is a magician.|Somebody check his pads for a trapdoor.|He is in the head of every shooter now.|That save was filthy in the best way.|Full extension, full attitude.|That is going to be on the highlight reel.",
 'chance': "Wide open, that is a gift basket.|The defense took a coffee break.|Somebody call a search party for the defender.|He had more room than a minivan parking lot.|That is how you get a goal, a lot of space and a little nerve.|If he hits that, it is going in the vault.|Look at all that room, he could have had a sandwich.|The goalie should be nervous.",
 'breakaway': "He is gone! Nobody is catching him!|One on one, and the goalie looks lonely.|This is the moment every kid dreams of.|He has the whole ice to himself.|Sweaty palms time.|The defender is just a spectator now.|Do not miss, do not miss.|Here comes the move, or maybe not.",
 'check': "That one will feel good tomorrow, for exactly one person.|Welcome to the neighborhood.|He saw stars and maybe the zamboni.|That was a freight train with skates on.|Somebody check if he is still in the building.|That hit had a postal code.|He did not enjoy that, I can tell.|There is the tax for holding the puck too long.",
 'pen': "Keep the stick down, boys.|The sin bin has a free seat.|That is a two minute vacation.|You could see that one coming from the parking lot.|That is how you ruin your own night.|Maybe watch the hands next time.|Free power play, courtesy of him.|The referee had no choice.",
 'pp': "Time to get creative with the extra man.|The penalty kill is about to earn their paycheck.|All that room, all that time.|Move the puck, make them chase.|Two minutes of fun for the power play.|The kill needs someone to be a hero.|A goal here and the whole bench goes nuts.|They have the advantage, now use it.",
 'shot': "Throw it at the net and see what happens.|Bar down energy right there.|He wound up like he meant it.|Put some mustard on it.|The goalie is not going to love that one.|He let it fly with nothing to lose.|Fire at will.|Every shot is a possibility.",
 'draw': "Cheating on that draw, but I respect it.|The center really wanted that one.|Won it clean, nobody saw a thing.|He pulled that back like a magician.|Winner winner, puck is mine.|Somebody cheated, probably both of them.|A faceoff is just a fight with a prize.|And the battle goes to the quick hands.",
 'pend': "Go grab a drink, we will be right back.|Time for a quick breather and a snack.|Coaches will yell, players will nod.|What a period, and there is more to come.|The ice crew is about to earn its keep.|Fresh ice, fresh legs, fresh chances.|Nobody is going home early.|Take a lap, we will see you in a few.",
 'quiet': "Feels like a chess match out there.|Everybody is playing it safe, this might not last.|Good time to check on your snacks.|Slow stretch, but this game is full of surprises.|The calm before the next big hit.|Both teams waiting for someone to blink.|Not much going on, enjoy it.|Even the crowd is catching its breath.",
 'rebound': "Loose puck, somebody grab it!|That is a pinball in the crease.|Everybody and their cousin is swinging at it.|Rebounds are where the chaos lives.|Goalie is trying to find the puck in the pile.|Pretty sure that puck has a mind of its own.|Crash the net, bring a helmet.|That is a chance if somebody wants it.",
}


def add(block_start, extra):
    global s
    i = s.index(block_start)
    # limit to this block's col section: find "col: {" after block_start then until the closing "      }"
    c = s.index("      col: {", i)
    e = s.index("\n      }", c)
    seg = s[c:e]
    def fix(m):
        cat = m.group(1)
        if cat in extra:
            return "        %s: S('%s|%s')," % (cat, m.group(2), extra[cat].replace("'", "\\'"))
        return m.group(0)
    seg2 = re.sub(r"        (\w+): S\('(.*)'\),", fix, seg)
    s = s[:c] + seg2 + s[e:]


add("    pro: {", PRO)
add("    locker: {", LOCK)

# prefer American English voices
a = "(/en-US|en-GB/i.test(v.lang) ? 2 : 0)"
assert s.count(a) == 1
s = s.replace(a, "(/^en[-_]US/i.test(v.lang) ? 8 : /^en[-_]GB/i.test(v.lang) ? -4 : /^en/i.test(v.lang) ? 0 : -9)", 1)
open('announcer.js', 'w', encoding='utf-8').write(s)
print('ok')
