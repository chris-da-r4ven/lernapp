# Isometrischer Hof ohne Kacheln, doppelte Auflösung (1536 breit), Thema + Pfad je Lektion.
import math, random
N = 18
TW, TH = 80, 40
OX, OY = 768, 70
W, H = 1536, 860
def P(i, j, z=0):
    return (OX + (i - j) * TW / 2, OY + (i + j) * TH / 2 - z)
def f(v): return f'{v:.0f}'
def pts(ps): return ' '.join(f'{f(x)},{f(y)}' for x, y in ps)
def poly(ps, fill, extra=''): return f'<polygon points="{pts(ps)}" fill="{fill}"{extra}></polygon>'
def region(i0, j0, i1, j1, fill, extra=''): return poly([P(i0, j0), P(i1, j0), P(i1, j1), P(i0, j1)], fill, extra)

def catmull(points, steps=10):
    out = []
    ps = [points[0]] + points + [points[-1]]
    for k in range(1, len(ps) - 2):
        p0, p1, p2, p3 = ps[k - 1], ps[k], ps[k + 1], ps[k + 2]
        for s in range(steps):
            t = s / steps
            t2, t3 = t * t, t * t * t
            x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
            y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
            out.append((x, y))
    out.append(points[-1])
    return out
def pathd(ps): return 'M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in ps)

# --- Objekte (Anker = Bodenpunkt, Tiefe = i+j) ------------------------------
def tree(i, j, s=1.0, kind='green'):
    x, y = P(i, j)
    if kind == 'bare':
        return (f'<path d="M{f(x)} {f(y)} L{f(x)} {f(y-46*s)} M{f(x)} {f(y-26*s)} L{f(x-16*s)} {f(y-44*s)} M{f(x)} {f(y-34*s)} L{f(x+14*s)} {f(y-52*s)} M{f(x-16*s)} {f(y-44*s)} L{f(x-24*s)} {f(y-50*s)} M{f(x+14*s)} {f(y-52*s)} L{f(x+22*s)} {f(y-56*s)}" stroke="#4a3328" stroke-width="{f(5*s)}" stroke-linecap="round" fill="none"></path>')
    c1, c2 = {'green': ('#3f8f4a', '#57a85f'), 'autumn': ('#d9772b', '#f0a43a'), 'dark': ('#2f6b3a', '#3f8f4a')}[kind]
    return (f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="{f(18*s)}" ry="{f(8*s)}" fill="#00000018"></ellipse>'
            f'<rect x="{f(x-4*s)}" y="{f(y-26*s)}" width="{f(8*s)}" height="{f(26*s)}" fill="#7a4a24"></rect>'
            f'<circle cx="{f(x)}" cy="{f(y-44*s)}" r="{f(24*s)}" fill="{c1}"></circle>'
            f'<circle cx="{f(x-10*s)}" cy="{f(y-52*s)}" r="{f(13*s)}" fill="{c2}"></circle>'
            f'<circle cx="{f(x+9*s)}" cy="{f(y-40*s)}" r="{f(9*s)}" fill="{c2}" opacity="0.7"></circle>')
def box(i, j, w, d, h, top, left, right):
    a, b, c, e = P(i, j + d), P(i + w, j + d), P(i + w, j), P(i, j)
    return (poly([a, b, (b[0], b[1] - h), (a[0], a[1] - h)], left) + poly([b, c, (c[0], c[1] - h), (b[0], b[1] - h)], right)
            + poly([(e[0], e[1] - h), (c[0], c[1] - h), (b[0], b[1] - h), (a[0], a[1] - h)], top))
def roof(i, j, w, d, h, rh, c1, c2):
    a, b, c, e = P(i, j + d, h), P(i + w, j + d, h), P(i + w, j, h), P(i, j, h)
    r1 = ((a[0] + e[0]) / 2, (a[1] + e[1]) / 2 - rh); r2 = ((b[0] + c[0]) / 2, (b[1] + c[1]) / 2 - rh)
    return poly([a, b, r2, r1], c1) + poly([e, c, r2, r1], c2) + poly([b, c, r2], c2)
def stall(i, j):
    s = box(i, j, 3, 2, 70, '#d9604f', '#b5463a', '#c9543f') + roof(i, j, 3, 2, 70, 34, '#7a3b2e', '#8f4636')
    a, b = P(i + 1.1, j + 2), P(i + 1.9, j + 2)
    s += poly([a, b, (b[0], b[1] - 40), (a[0], a[1] - 40)], '#6b2f24')
    return s
def school(i, j):
    s = box(i, j, 5, 3, 110, '#f1e3c8', '#d8c3a0', '#e8d6b4') + roof(i, j, 5, 3, 110, 46, '#b5463a', '#c9543f')
    for k in range(5):
        for row in (30, 70):
            if k == 2 and row == 70: continue   # Platz für die Uhr
            a, b = P(i + 0.3 + k * 0.95, j + 3), P(i + 0.8 + k * 0.95, j + 3)
            s += poly([(a[0], a[1] - row), (b[0], b[1] - row), (b[0], b[1] - row - 22), (a[0], a[1] - row - 22)], '#9fd3ff')
    a, b = P(i + 2.2, j + 3), P(i + 2.8, j + 3)
    s += poly([a, b, (b[0], b[1] - 44), (a[0], a[1] - 44)], '#6b4a2a')
    cx, cy = P(i + 2.5, j + 3, 99)
    s += (f'<g transform="matrix(1 0.5 0 1 {f(cx)} {f(cy+18)})"><circle cx="0" cy="0" r="12" fill="#ffffff" stroke="#6b4a2a" stroke-width="3"></circle>'
          f'<path d="M0 0 V-8 M0 0 H6" stroke="#1d2233" stroke-width="2.5" stroke-linecap="round"></path></g>')
    fx, fy = P(i + 5.4, j + 0.2)
    s += f'<rect x="{f(fx)}" y="{f(fy-110)}" width="4" height="110" fill="#9aa3b5"></rect><rect x="{f(fx+4)}" y="{f(fy-110)}" width="34" height="20" fill="#4f6cf7"></rect>'
    return s
CURVE = []   # Weg in Gitter-Koordinaten, wird in build() gesetzt
def crossings(i0, j0, i1, j1):
    ts = []
    dx, dy = i1 - i0, j1 - j0
    for (ax, ay), (bx, by) in zip(CURVE, CURVE[1:]):
        ex, ey = bx - ax, by - ay
        den = dx * ey - dy * ex
        if abs(den) < 1e-9: continue
        t = ((ax - i0) * ey - (ay - j0) * ex) / den
        u = ((ax - i0) * dy - (ay - j0) * dx) / den
        if 0 <= t <= 1 and 0 <= u <= 1:
            sin = abs(den) / (math.hypot(dx, dy) * math.hypot(ex, ey))   # Kreuzungswinkel
            ts.append((t, min(0.8 / max(sin, 0.05) + 0.3, 1.8)))
    return ts
def fence(i0, j0, i1, j1, color='#8b5a2b'):
    out = ''
    L = math.hypot(i1 - i0, j1 - j0)
    gaps = [(t - w / L, t + w / L) for t, w in crossings(i0, j0, i1, j1)]   # schräg gekreuzt = breiter
    ingap = lambda t: any(a < t < b for a, b in gaps)
    Q = lambda t: P(i0 + (i1 - i0) * t, j0 + (j1 - j0) * t)
    steps = int(max(abs(i1 - i0), abs(j1 - j0)) * 2)
    for k in range(steps + 1):
        t = k / steps
        if ingap(t): continue
        x, y = Q(t)
        out += f'<rect x="{f(x-2.5)}" y="{f(y-22)}" width="5" height="22" fill="{color}"></rect>'
    # Riegel nur zwischen den Öffnungen
    cuts = [0.0] + [v for g in sorted(gaps) for v in g] + [1.0]
    d = ''
    for a, b in zip(cuts[::2], cuts[1::2]):
        a, b = max(a, 0), min(b, 1)
        if b <= a: continue
        (xa, ya), (xb, yb) = Q(a), Q(b)
        d += f'M{f(xa)} {f(ya-17)} L{f(xb)} {f(yb-17)} M{f(xa)} {f(ya-8)} L{f(xb)} {f(yb-8)} '
    out += f'<path d="{d.strip()}" stroke="{color}" stroke-width="4"></path>'
    # Torpfosten an den Öffnungen
    for a, b in gaps:
        for t in (a, b):
            if 0 < t < 1:
                x, y = Q(t)
                out += f'<rect x="{f(x-4)}" y="{f(y-32)}" width="8" height="32" fill="{color}"></rect><rect x="{f(x-5)}" y="{f(y-35)}" width="10" height="4" fill="#5b3a1f"></rect>'
    return out
def jump(i, j):
    x, y = P(i, j)
    return (f'<rect x="{f(x-34)}" y="{f(y-40)}" width="6" height="40" fill="#ffffff"></rect><rect x="{f(x+28)}" y="{f(y-40)}" width="6" height="40" fill="#ffffff"></rect>'
            f'<rect x="{f(x-34)}" y="{f(y-30)}" width="68" height="8" fill="#e5484d"></rect><rect x="{f(x-18)}" y="{f(y-30)}" width="12" height="8" fill="#ffffff"></rect><rect x="{f(x+6)}" y="{f(y-30)}" width="12" height="8" fill="#ffffff"></rect>'
            f'<rect x="{f(x-34)}" y="{f(y-16)}" width="68" height="6" fill="#e5484d"></rect>')
def bunting(i0, j0, i1, j1):
    xa, ya = P(i0, j0); xb, yb = P(i1, j1)
    out = f'<rect x="{f(xa-2)}" y="{f(ya-70)}" width="4" height="70" fill="#ffffff"></rect><rect x="{f(xb-2)}" y="{f(yb-70)}" width="4" height="70" fill="#ffffff"></rect>'
    out += f'<path d="M{f(xa)} {f(ya-66)} Q{f((xa+xb)/2)} {f((ya+yb)/2-50)} {f(xb)} {f(yb-66)}" stroke="#ffffff" stroke-width="2" fill="none"></path>'
    cols = ['#e5484d', '#f5b400', '#4f6cf7', '#1f9d55', '#f28bb8']
    for k in range(1, 8):
        t = k / 8; x = xa + (xb - xa) * t; y = ya - 66 + (yb - ya) * t + (-(1 - (2 * t - 1) ** 2) * 16)
        out += poly([(x - 7, y), (x + 7, y), (x, y + 14)], cols[k % 5])
    return out
def podium(i, j):
    return box(i, j, 1.2, 1, 14, '#f5d24a', '#d9a400', '#e8b800') + box(i + 0.2, j + 0.2, 0.8, 0.6, 26, '#ffe27a', '#d9a400', '#e8b800')
def pumpkin(i, j, s=1.0, face=False):
    x, y = P(i, j)
    out = f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="{f(16*s)}" ry="{f(6*s)}" fill="#00000018"></ellipse>'
    out += f'<ellipse cx="{f(x-7*s)}" cy="{f(y-11*s)}" rx="{f(9*s)}" ry="{f(11*s)}" fill="#e2731c"></ellipse><ellipse cx="{f(x+7*s)}" cy="{f(y-11*s)}" rx="{f(9*s)}" ry="{f(11*s)}" fill="#e2731c"></ellipse><ellipse cx="{f(x)}" cy="{f(y-11*s)}" rx="{f(10*s)}" ry="{f(12*s)}" fill="#f28a2a"></ellipse>'
    out += f'<rect x="{f(x-2*s)}" y="{f(y-27*s)}" width="{f(4*s)}" height="{f(6*s)}" fill="#3f6b2a"></rect>'
    if face:
        out += poly([(x - 7 * s, y - 15 * s), (x - 3 * s, y - 15 * s), (x - 5 * s, y - 19 * s)], '#4a2a10') + poly([(x + 3 * s, y - 15 * s), (x + 7 * s, y - 15 * s), (x + 5 * s, y - 19 * s)], '#4a2a10')
        out += f'<path d="M{f(x-7*s)} {f(y-9*s)} Q{f(x)} {f(y-3*s)} {f(x+7*s)} {f(y-9*s)}" stroke="#4a2a10" stroke-width="{f(2.5*s)}" fill="none"></path>'
    return out
def bat(x, y, s=1.0):
    return f'<path d="M{f(x)} {f(y)} q{f(-8*s)} {f(-8*s)} {f(-18*s)} {f(-4*s)} q{f(4*s)} {f(2*s)} {f(4*s)} {f(6*s)} q{f(6*s)} {f(-4*s)} {f(14*s)} {f(-2*s)} q{f(8*s)} {f(-2*s)} {f(14*s)} {f(2*s)} q0 {f(-4*s)} {f(4*s)} {f(-6*s)} q{f(-10*s)} {f(-4*s)} {f(-18*s)} {f(4*s)} z" fill="#2b2338"></path>'
def goal(i, j, out=1):
    a, b = P(i, j - 0.8), P(i, j + 0.8)          # Pfosten
    c, d = P(i + 0.5 * out, j - 0.8), P(i + 0.5 * out, j + 0.8)  # Netz hinten am Boden
    h = 34
    net = f'<polygon points="{pts([(a[0], a[1]-h), (b[0], b[1]-h), d, c])}" fill="#ffffff" opacity="0.25"></polygon>'
    net += f'<path d="M{f(a[0])} {f(a[1]-h)} L{f(c[0])} {f(c[1])} L{f(d[0])} {f(d[1])} L{f(b[0])} {f(b[1]-h)}" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.7"></path>'
    frame = f'<path d="M{f(a[0])} {f(a[1])} L{f(a[0])} {f(a[1]-h)} L{f(b[0])} {f(b[1]-h)} L{f(b[0])} {f(b[1])}" stroke="#ffffff" stroke-width="5" fill="none" stroke-linejoin="round"></path>'
    return (net + frame) if out > 0 else (frame + net)
def bench(i, j):
    x, y = P(i, j)
    return f'<rect x="{f(x-20)}" y="{f(y-14)}" width="40" height="5" fill="#8b5a2b"></rect><rect x="{f(x-20)}" y="{f(y-22)}" width="40" height="4" fill="#a0693a"></rect><rect x="{f(x-17)}" y="{f(y-9)}" width="4" height="9" fill="#5b3a1f"></rect><rect x="{f(x+13)}" y="{f(y-9)}" width="4" height="9" fill="#5b3a1f"></rect>'
def flowers(rng, region_fn, n, cols):
    out = ''
    for _ in range(n):
        i, j = rng.uniform(0.3, N - 0.3), rng.uniform(0.3, N - 0.3)
        if not region_fn(i, j): continue
        x, y = P(i, j)
        out += f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(rng.uniform(2.2,3.6))}" fill="{rng.choice(cols)}"></circle>'
    return out
def tufts(rng, region_fn, n, col):
    out = ''
    for _ in range(n):
        i, j = rng.uniform(0.3, N - 0.3), rng.uniform(0.3, N - 0.3)
        if not region_fn(i, j): continue
        x, y = P(i, j)
        out += f'<path d="M{f(x-4)} {f(y)} l2 -6 l2 6 l2 -7 l2 7" stroke="{col}" stroke-width="1.6" fill="none"></path>'
    return out
def marker(i, j, label, state):
    x, y = P(i, j)
    col = {'done': '#1f9d55', 'now': '#4f6cf7', 'next': '#ffffff'}[state]
    txt = '#ffffff' if state != 'next' else '#6b7290'
    extra = '' if state != 'next' else ' stroke="#aab4d0" stroke-width="3" stroke-dasharray="5 4"'
    return (f'<line x1="{f(x)}" y1="{f(y-66)}" x2="{f(x)}" y2="{f(y)}" stroke="{col if state!="next" else "#aab4d0"}" stroke-width="4"></line>'
            f'<circle cx="{f(x)}" cy="{f(y-82)}" r="20" fill="{col}"{extra}></circle>'
            f'<text x="{f(x)}" y="{f(y-75)}" text-anchor="middle" font-size="20" font-weight="900" fill="{txt}" font-family="Nunito, sans-serif">{label}</text>')

THEMES = {
    'neutral': dict(grass='#7fc672', grass2='#73bd66', tuft='#5aa557', path='#ead3a0', path2='#f6e6c2', flowers=['#ffffff', '#ffe27a', '#f28bb8'], tree='green'),
    'halloween': dict(grass='#9cbf62', grass2='#8fb357', tuft='#6d8f3c', path='#e2c48e', path2='#f0dcb4', flowers=['#f5a742', '#e86a2b', '#ffe27a'], tree='autumn'),
    'school': dict(grass='#7fc672', grass2='#73bd66', tuft='#5aa557', path='#d9dde6', path2='#eef1f6', flowers=['#ffffff', '#9fd3ff', '#ffe27a'], tree='green'),
}

def scene(theme, stations, current, objects, regions, locked, seed, bare=False):
    # bare: nur Hintergrund (ohne Stationen, gelaufenen Weg und Nebel) – die App zeichnet die Ebene darüber
    T = THEMES[theme]
    rng = random.Random(seed)
    g = []
    # Boden als eine Fläche (keine Kacheln), mit sanfter Erhebung an der Kante
    g.append(poly([P(0, 0), P(N, 0), P(N, N), P(0, N)], T['grass']))
    g.append(poly([P(0, N), P(N, N), (P(N, N)[0], P(N, N)[1] + 26), (P(0, N)[0], P(0, N)[1] + 26)], '#6b4a2a'))
    g.append(poly([P(N, 0), P(N, N), (P(N, N)[0], P(N, N)[1] + 26), (P(N, 0)[0], P(N, 0)[1] + 26)], '#7f5733'))
    # weiche Farbflecken für Lebendigkeit
    g.append('<g clip-path="url(#gnd)">')
    for _ in range(14):
        i, j = rng.uniform(1, N - 1), rng.uniform(1, N - 1); x, y = P(i, j)
        g.append(f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="{f(rng.uniform(60,140))}" ry="{f(rng.uniform(30,70))}" fill="{T["grass2"]}" opacity="0.55"></ellipse>')
    g.append('</g>')
    for r in regions:
        g.append(r)
    # Pfad: weich durch alle Stationen
    sp = [P(i, j) for i, j in stations]
    curve = catmull(sp, 12)
    g.append(f'<path d="{pathd(curve)}" stroke="#00000014" stroke-width="40" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 4)"></path>')
    g.append(f'<path d="{pathd(curve)}" stroke="{T["path"]}" stroke-width="34" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>')
    g.append(f'<path d="{pathd(curve)}" stroke="{T["path2"]}" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"></path>')
    walked = catmull(sp[:current + 1], 12) if current > 0 and not bare else []
    if walked:
        g.append(f'<path d="{pathd(walked)}" stroke="#f5b400" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="2 16"></path>')
    def onfree(i, j):
        return all(math.hypot(i - a, j - b) > 1.4 for a, b in stations)
    g.append(tufts(rng, onfree, 90, T['tuft']))
    g.append(flowers(rng, onfree, 70, T['flowers']))
    # gesperrter Bereich: Dunst + Gatter
    li, lj, lr = locked
    lx, ly = P(li, lj)
    if not bare: g.append(f'<ellipse cx="{f(lx)}" cy="{f(ly)}" rx="{f(lr*TW*0.75)}" ry="{f(lr*TH*0.75)}" fill="#ffffff" opacity="0.6" clip-path="url(#gnd)"></ellipse>')
    # Objekte nach Tiefe
    objs = sorted(objects, key=lambda o: o[0])
    for _, svg in objs:
        g.append(svg)
    if bare: return ''.join(g)
    g.append(f'<circle cx="{f(lx)}" cy="{f(ly-26)}" r="28" fill="#ffffff" stroke="#9aa3b5" stroke-width="4" stroke-dasharray="7 5"></circle><text x="{f(lx)}" y="{f(ly-15)}" text-anchor="middle" font-size="32" font-weight="900" fill="#8a93b3" font-family="Nunito, sans-serif">?</text>')
    for k, (i, j) in enumerate(stations):
        st = 'done' if k < current else ('now' if k == current else 'next')
        g.append(marker(i, j, str(k + 1), st))
    return ''.join(g)

def build(theme, bare=False):
    global CURVE
    ST = {'neutral': [(15.5, 15), (12, 14.5), (10, 10.5), (6.5, 12.5), (4.5, 7.5), (8.5, 4)],
          'halloween': [(3, 15.5), (6.5, 13.5), (10.5, 14.8), (13.8, 11), (11, 7), (14.6, 5.4)],
          'school': [(16, 2.4), (11.6, 5.0), (7.5, 8), (7.6, 12.4), (11.4, 14.6), (5, 15.6)]}
    CURVE = catmull(ST[theme], 12)
    if theme == 'neutral':
        st = [(15.5, 15), (12, 14.5), (10, 10.5), (6.5, 12.5), (4.5, 7.5), (8.5, 4)]
        objs = [(26, stall(8.5, 15.3)),
                (25, fence(13, 12.5, 17.5, 12.5)), (25, fence(13, 12.5, 13, 17.5)),
                (32, fence(17.5, 12.5, 17.5, 17.5)), (33, fence(13, 17.5, 17.5, 17.5)),
                (21, jump(6.8, 13.6)), (12.5, jump(4.6, 8.6))]
        regions = [region(13, 12.5, 17.5, 17.5, '#b2e08f'), region(8.4, 9.2, 11.6, 12.4, '#f3dfb6'),
                   poly([P(8.4, 9.2), P(11.6, 9.2), P(11.6, 12.4), P(8.4, 12.4)], 'none', ' stroke="#ffffff" stroke-width="4"')]
        for t in [(1.5, 15.5, 1.1), (2.5, 16.8, .9), (1, 3, 1.2), (2.5, 1.5, 1.0), (16.5, 2, 1.1), (15, 1, .9), (3.5, 5, .95), (5.5, 4.5, .85), (17, 7, 1)]:
            objs.append((t[0] + t[1], tree(*t[:3], kind='green')))
        objs += [(12.5, bunting(6.5, 2.8, 9.5, 2.8)), (10, podium(7.6, 3.4))]
        locked = (14.4, 4.0, 2.8); current = 2
    elif theme == 'halloween':
        st = [(3, 15.5), (6.5, 13.5), (10.5, 14.8), (13.8, 11), (11, 7), (14.6, 5.4)]
        objs = [(16, stall(5.2, 10.4)), (19, jump(13.6, 12.1)), (17.5, jump(11.4, 8.1))]
        regions = [region(8.9, 12.6, 12.6, 16.8, '#efd9a8'), poly([P(8.9, 12.6), P(12.6, 12.6), P(12.6, 16.8), P(8.9, 16.8)], 'none', ' stroke="#ffffff" stroke-width="4"'),
                   region(0.4, 12.6, 4.6, 17.4, '#a9cc6c')]
        objs += [(13, fence(0.4, 12.6, 4.6, 12.6)), (17, fence(4.6, 12.6, 4.6, 17.4))]
        rng = random.Random(3)
        for k in range(16):
            i, j = rng.uniform(1, 17), rng.uniform(1, 17)
            if any(math.hypot(i - a, j - b) < 2.2 for a, b in st): continue
            if 8.4 < i < 13.1 and 12.1 < j < 17.3: continue      # Dressurplatz
            if 4.7 < i < 8.7 and 9.9 < j < 12.9: continue        # Stall
            if 12.3 < i < 16.8 and 3.8 < j < 7.6: continue       # Siegerpodest
            if math.hypot(i - 15.2, j - 14.8) < 3: continue      # Nebel
            objs.append((i + j, pumpkin(i, j, rng.uniform(.8, 1.3), face=rng.random() < .35)))
        for t in [(1.5, 3, 1.1, 'bare'), (3, 1.5, .9, 'autumn'), (6, 2, 1.0, 'autumn'), (7, 17.2, 1.1, 'bare'), (17, 10, 1.0, 'autumn'), (7.5, 6.5, .9, 'autumn'), (2.5, 6, 1.0, 'autumn')]:
            objs.append((t[0] + t[1], tree(*t)))
        objs += [(17.6, bunting(12.8, 4.6, 16.2, 4.6)), (20.2, podium(14, 5.6))]
        locked = (15.2, 14.8, 2.4); current = 2
    else:  # school
        st = [(16, 2.4), (11.6, 5.0), (7.5, 8), (7.6, 12.4), (11.4, 14.6), (5, 15.6)]
        objs = [(10, school(3, 2.5)), (13, stall(9.8, 1.0)), (18, jump(6.6, 11.4)), (21.2, jump(8.6, 12.6)),
                (16, fence(14.4, 0.6, 14.4, 4.2)), (18.6, fence(14.4, 4.2, 17.6, 4.2))]
        regions = [region(5.5, 6.8, 9.5, 9.2, '#f3dfb6'), poly([P(5.5, 6.8), P(9.5, 6.8), P(9.5, 9.2), P(5.5, 9.2)], 'none', ' stroke="#ffffff" stroke-width="4"'),
                   region(14.4, 0.6, 17.6, 4.2, '#8fd27f'),
                   region(12.5, 13, 17.5, 17.5, '#6dbd61'), poly([P(13, 13.5), P(17, 13.5), P(17, 17), P(13, 17)], 'none', ' stroke="#ffffff" stroke-width="3"')]
        objs += [(28.5, goal(13.2, 15.3, -1)), (32, goal(16.8, 15.3, 1)), (14, bench(4.2, 9.8)), (21, bench(13.5, 7.5))]
        for t in [(1, 10, 1.1), (2, 12, .9), (16.5, 1, 1.1), (17, 4, .95), (3.5, 16.5, 1.0)]:
            objs.append((t[0] + t[1], tree(*t[:3], kind='green')))
        objs += [(20.5, bunting(3.5, 14.5, 6.5, 16.5)), (21, podium(4.2, 16.2))]
        locked = (15.5, 10.5, 2.6); current = 2
    svg = scene(theme, st, current, objs, regions, locked, seed=len(theme) * 7, bare=bare)
    if theme == 'halloween':
        svg += bat(1240, 120, 1.4) + bat(1320, 80, 1.0) + bat(260, 150, 1.2)
    if bare:
        return svg, catmull([P(*q) for q in st], 12)   # Weg in Bildpunkten
    fx, fy = P(*st[current])
    return svg, (fx, fy)

if __name__ == '__main__':
    for th in ('neutral', 'halloween', 'school'):
        s, pos = build(th)
        open(f'hof_{th}.svgfrag', 'w').write(s)
        print(th, len(s), 'fanny at', pos)
