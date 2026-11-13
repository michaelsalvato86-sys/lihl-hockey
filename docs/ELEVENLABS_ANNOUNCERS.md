# ElevenLabs announcers for LIHL

Current announcers (announcer.js): Pete Marlowe (play-by-play) and Dana Reyes (color), lines are text templates like "{p} shoots!" read by the browser voice.

## Voice Design prompts (paste into ElevenLabs > Voices > Add a new voice > Voice Design)

Play-by-play, Pete Marlowe:
"A male professional hockey play-by-play announcer in his 40s, warm, fast and clear, North American broadcast accent, builds excitement on shots and goals, calm on routine plays, big raised voice for goals. Studio quality, no background noise."

Color, Dana Reyes:
"A female hockey color commentator in her 30s, confident and knowledgeable, conversational, slightly lower pitch, dry humor, explains plays in a few words. Studio quality, no background noise."

Optional extra voice (wrestler-style Locker Room mode):
"A booming 1980s professional wrestling promo voice, gravelly, theatrical, huge energy, long drawn out vowels, shouts and growls. Studio quality."
(Use a made-up character voice, not a real person.)

Settings: Stability 30 to 40 percent, Style exaggeration 50 to 70 percent, Speaker boost on. Model: Eleven Turbo v2.5 or Multilingual v2.

## How it will be wired (not built yet)
1. Save your API key in C:\Users\Quantum\.elevenlabs_key (a file, never in chat or git).
2. Send the two voice IDs (the long ID shown under each voice in your library).
3. A generator script reads the line templates, fills them with every skater last name and team, calls the API once, and saves small mp3 files under audio/ann/. About 1,500 to 3,000 clips; cost depends on your plan characters.
4. announcer.js plays the mp3 for a line and falls back to browser speech if a clip is missing. No key ever ships to players.
