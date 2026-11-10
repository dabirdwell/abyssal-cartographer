"""Small helpers for patching the single game file. Every replacement must match exactly the number of
times it expects, so a patch either applies cleanly or stops with the reason."""
import re, sys
class Patch:
    def __init__(self, path):
        self.path = path; self.s = open(path, encoding='utf-8').read(); self.n = 0
    def rep(self, old, new, count=1):
        c = self.s.count(old)
        if c != count: sys.exit('PATCH STOP: expected %d of %r, found %d' % (count, old[:90], c))
        self.s = self.s.replace(old, new); self.n += 1
    def sub(self, pattern, new, count=1, flags=re.S):
        c = len(re.findall(pattern, self.s, flags))
        if c != count: sys.exit('PATCH STOP: expected %d of /%s/, found %d' % (count, pattern[:90], c))
        self.s = re.sub(pattern, lambda m: new, self.s, flags=flags); self.n += 1
    def after(self, anchor, new):  self.rep(anchor, anchor + new)
    def before(self, anchor, new): self.rep(anchor, new + anchor)
    def save(self):
        open(self.path, 'w', encoding='utf-8').write(self.s); print('patched', self.path, self.n, 'changes')
