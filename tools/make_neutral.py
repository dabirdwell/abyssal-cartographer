"""Makes a copy of the game that names no publisher and claims no license.

Usage: make_neutral.py index.html out.html

Why this exists: the publisher of Shadowdark RPG says, in its own FAQ on its third-party license, that tools for
game masters needed its special permission. This script produces a build that does not lean on that license:
the publisher's name and the license line are gone, the native rules are called "old-school", and the two places
that restated that game's own tables (hoard ratings by name, luck tokens) are put in plain generic words.
It also drops the name of the other game from the second rules button, which becomes "5e": the fifth-edition rules
document allows "5E compatible" and "compatible with fifth edition", and asks for no other mention of its owner.

What it does NOT change, and a lawyer or the publisher would still want to look at:
  - the layout of a creature's stat line (AC, HP, ATK, MV near, S D C I W Ch, AL, LV)
  - the ladder of difficulties (9, 12, 15, 18) and the one-real-hour torch
  - the word "delver"

The dungeon generator is untouched: the same code builds the same dungeon in both builds.
Every replacement must match exactly, so this either applies cleanly to a build or stops and says where."""
import re, sys
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from patchlib import Patch
src, out = sys.argv[1], sys.argv[2]
p = Patch(src)

p.rep('Compatible with Shadowdark RPG, with classic 5e stats included.', 'Old-school stats for rules-light dungeon games, with classic 5e stats included.')
p.rep('title="Shadowdark RPG, a fantasy game built for exactly this kind of dungeon crawl">Shadowdark</button>',
      'title="Light old-school rules: one twenty-sided die, six abilities, a torch that burns a real hour. They suit most rules-light dungeon games.">Old-school</button>')
p.rep('The creature numbers are a close conversion from Shadowdark, not the official books.', 'The creature numbers are a close conversion from the old-school numbers, not the official books.')
p.sub(r'\n  <span>This is an independent product published under the Shadowdark RPG Third-Party License[^<]*</span>', '')
p.rep('<span class="hint">Shadowdark levels 0 to 9</span>', '<span class="hint">Levels 0 to 9</span>')
p.rep('(S.sys==="sd"?"Shadowdark":"5e")+\' stats)', '(S.sys==="sd"?"old-school":"5e")+\' stats)')
p.rep('Shadowdark rates a hoard Poor (0), Normal (1), Fabulous (3) or Legendary (10); the rating is yours to overrule.',
      'A poor haul scores nothing, a fair one 1, a rich one 3 and a legendary one 10; the rating is yours to overrule.')
p.sub(r"const LICENSE_LINE='[^']*';", "const LICENSE_LINE='';")
p.rep("' (a Shadowdark house rule, optional in 5e)'", "' (a house rule, optional in 5e)'")
p.rep('"Shadowdark RPG. A short reminder, with the book as the authority: checks are', '"a light old-school dungeon game, and these are all of its rules: checks are')
p.rep("Experience comes from treasure carried out, by hoard tier (a normal hoard 1 XP, a fabulous one 3, a legendary one 10), not from kills, and 10 XP is a level. Luck tokens let a player reroll once. Creatures check morale",
      "Experience comes from treasure carried out, not from kills: a fair haul is 1 point, a rich one 3, a legendary one 10, and 10 points is a level. Creatures check morale")
p.rep('Shadowdark counts hoards rather than coins: a fair haul is worth a point, a fabulous one more,', 'This game counts hoards rather than coins: a fair haul is worth a point, a rich one more,')
p.rep("In Shadowdark that is a short business, a few rolls and a name, and the publisher\\'s own quickstart will walk anyone through it.",
      "In a rules-light game that is a short business, a few rolls and a name, and the free starter rules of whichever game your table picks will walk anyone through it.", count=2)
p.rep(' In fifth edition this is a house rule borrowed from Shadowdark; keep it if you like the pressure.', ' In fifth edition this is a house rule; keep it if you like the pressure.')
p.rep('<p>Shadowdark counts hoards, not coins.', '<p>This game counts hoards, not coins.')
p.rep('"Dungeons &amp; Dragons 5th edition":"Shadowdark RPG")', '"Dungeons &amp; Dragons 5th edition":"Old-school rules")')
p.rep('Switch to Shadowdark at the top if that is your game.', 'Switch to Old-school at the top if you play a rules-light dungeon game.')
# comments in the source name no publisher either
p.rep('bestiary (Shadowdark native, original text)', 'bestiary (old-school native, original text)')
p.rep('stat text: Shadowdark native, 5e projection', 'stat text: old-school native, 5e projection')
p.rep('/* Shadowdark awards XP by treasure hoard tier, not gold count', '/* Experience is awarded by treasure hoard tier, not gold count')
p.rep("/* In 5e mode, Shadowdark's words step aside. Text only. */", '/* In 5e mode, the old-school words step aside. Text only. */')

# The fifth-edition rules document (SRD 5.1) asks for no mention of its owner beyond the credit line, and names two
# phrases a work may use: "compatible with fifth edition" and "5E compatible". The neutral build keeps to those.
p.rep('title="Dungeons &amp; Dragons 5th edition. The creature numbers', 'title="Fifth edition rules. The creature numbers')
p.rep('">D&amp;D 5e</button>', '">5e</button>')
p.rep('"Dungeons & Dragons 5th edition, the SRD rules you know.', '"fifth edition, the SRD rules you know.')
p.rep('"Dungeons &amp; Dragons 5th edition":"Old-school rules")', '"Fifth edition":"Old-school rules")')
p.rep('AI game masters know D&amp;D best, so it is the default here.', 'AI game masters know fifth edition best, so it is the default here.')
p.rep('Switch to D&amp;D 5e at the top if you would rather play that', 'Switch to 5e at the top if you would rather play that')
p.rep('in D&D 5e a torch is lit', 'in fifth edition a torch is lit')

left = sorted(set(re.findall(r'.{0,60}(?:Shadowdark|Arcane Library|D&amp;D|D&D|Dungeons &amp; Dragons|Dungeons & Dragons).{0,60}', p.s)))
if left: sys.exit('NEUTRAL STOP: the publisher is still named here:\n' + '\n'.join(left))
p.path = out
p.save()
