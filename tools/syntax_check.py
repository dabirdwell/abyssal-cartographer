"""Checks that every script block in the game file still parses. Usage: syntax_check.py index.html"""
import re, subprocess, sys
text = open(sys.argv[1], encoding='utf-8').read()
bad = 0
for i, body in enumerate(re.findall(r'<script>(.*?)</script>', text, re.S)):
    tmp = '/tmp/ac_chk_%d.js' % i
    open(tmp, 'w', encoding='utf-8').write(body)
    r = subprocess.run(['/opt/homebrew/bin/node', '--check', tmp], capture_output=True, text=True)
    print('block', i, len(body), 'bytes:', 'parses' if r.returncode == 0 else 'ERROR ' + r.stderr[:700])
    bad += r.returncode != 0
sys.exit(1 if bad else 0)
