#!/usr/bin/env python3
"""Make the typefaces the game carries inside its one file.

EB Garamond (Georg Duffner and Octavio Pardo) and Alegreya Sans (Juan Pablo del Peral, Huerta Tipografica)
are under the SIL Open Font License 1.1. This script cuts each weight down to the letters the game uses, keeps true small
caps and the lining and tabular figures, and writes:
  fonts/*.woff2      the cut-down faces
  fonts/faces.css    the same faces as @font-face rules with the font data inside, ready to sit in index.html
  fonts/OFL-*.txt    the license, which must travel with the faces

Run:  /opt/homebrew/bin/python3 tools/embed_fonts.py
Needs fontTools and brotli. The source files come with TeX Live; any copy of EB Garamond and
Alegreya Sans 2.007 in .otf will do (set EB and AL below).
"""
import base64, os, shutil, sys
from fontTools import subset
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'fonts')
EB = '/usr/local/texlive/2025/texmf-dist/fonts/opentype/public/ebgaramond/'
AL = '/usr/local/texlive/2025/texmf-dist/fonts/opentype/huerta/alegreya/'
DOCS = [('/usr/local/texlive/2025/texmf-dist/doc/fonts/ebgaramond/', 'OFL-EBGaramond.txt'), ('/usr/local/texlive/2025/texmf-dist/doc/fonts/alegreya/', 'OFL-Alegreya.txt')]

# family, weight, style, source file, output name
FACES = [
    ('EB Garamond', 400, 'normal', EB + 'EBGaramond-Regular.otf', 'ebgaramond-400'),
    ('EB Garamond', 500, 'normal', EB + 'EBGaramond-Medium.otf', 'ebgaramond-500'),
    ('EB Garamond', 700, 'normal', EB + 'EBGaramond-Bold.otf', 'ebgaramond-700'),
    ('EB Garamond', 400, 'italic', EB + 'EBGaramond-Italic.otf', 'ebgaramond-400i'),
    ('Alegreya Sans', 500, 'normal', AL + 'AlegreyaSans-Medium.otf', 'alegreyasans-500'),
    ('Alegreya Sans', 700, 'normal', AL + 'AlegreyaSans-Bold.otf', 'alegreyasans-700'),
]
# Basic Latin, Latin-1, and the punctuation and signs the game's own text uses.
UNICODES = (list(range(0x20, 0x7F)) + list(range(0xA0, 0x100)) +
            [0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026, 0x2022, 0x2032, 0x2033, 0x2190, 0x2192, 0x2212, 0x0131, 0x0152, 0x0153])
FEATURES = ['kern', 'liga', 'smcp', 'c2sc', 'lnum', 'tnum', 'onum', 'pnum', 'case', 'locl', 'ccmp', 'mark', 'mkmk', 'frac']


def main():
    os.makedirs(OUT, exist_ok=True)
    css, total = [], 0
    for family, weight, style, src, name in FACES:
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = FEATURES
        opts.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
        opts.notdef_outline = True
        opts.hinting = False
        font = TTFont(src)
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=UNICODES)
        sub.subset(font)
        font.flavor = 'woff2'
        path = os.path.join(OUT, name + '.woff2')
        font.save(path)
        data = open(path, 'rb').read()
        total += len(data)
        b64 = base64.b64encode(data).decode('ascii')
        css.append('@font-face{font-family:"%s";font-weight:%d;font-style:%s;font-display:swap;src:url(data:font/woff2;base64,%s) format("woff2")}' % (family, weight, style, b64))
        print('%-18s %4d %-6s %6d bytes' % (family, weight, style, len(data)))
    head = '/* EB Garamond, Copyright 2017 The EB Garamond Project Authors, and Alegreya Sans, Copyright 2013 The Alegreya Sans Project Authors. SIL Open Font License 1.1. Cut down to the letters this game uses. */\n'
    open(os.path.join(OUT, 'faces.css'), 'w', encoding='utf-8').write(head + '\n'.join(css) + '\n')
    for d, name in DOCS:
        for cand in ('OFL.txt', 'OFL', 'LICENSE', 'COPYING'):
            if os.path.exists(os.path.join(d, cand)):
                shutil.copy(os.path.join(d, cand), os.path.join(OUT, name)); break
    print('total font bytes', total, '| faces.css', os.path.getsize(os.path.join(OUT, 'faces.css')))


if __name__ == '__main__':
    sys.exit(main())
