# Banner für die Fachseite Englisch: englische Weide mit Steinmauer, Gatter, roter Telefonzelle,
# zwei Ponys (Pixel-Stil wie Fanny) und London klein am Horizont.
# Aufruf: python3 tools/hofkarte/banner_englisch.py  → img/banner-englisch.svg
# Wichtiges liegt in der Mitte (x 260–940): Auf schmalen Bildschirmen wird links und rechts abgeschnitten,
# unten links liegt das Namensschild des Fachs.
import ast, pathlib, random

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parents[1]
W, H = 1200, 240

def f(v): return f'{v:.0f}'

# Pixel-Vorlage aus fanny2.py (dieselbe Form, andere Farben)
src = (HERE / 'fanny2.py').read_text()
ART = next(n.value.value for n in ast.parse(src).body if isinstance(n, ast.Assign) and n.targets[0].id == 'ART')
ROWS = [r.ljust(30, '.') for r in ART.strip('\n').split('\n')]

def pony(x, y, scale, col, mirror=False):
    """x, y = Bodenpunkt Mitte; col: Farbe je Buchstabe der Vorlage."""
    w, h = 30 * scale, len(ROWS) * scale
    rects = []
    for j, row in enumerate(ROWS):
        i = 0
        while i < len(row):
            c = row[i]
            if c == '.': i += 1; continue
            s = i
            while i < len(row) and row[i] == c: i += 1
            rects.append(f'<rect x="{s}" y="{j}" width="{i - s}" height="1" fill="{col[c]}"/>')
    tx = x + w / 2 if mirror else x - w / 2
    sx = -scale if mirror else scale
    shadow = f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="{f(w * 0.42)}" ry="{f(scale * 1.6)}" fill="#00000022"/>'
    return shadow + f'<g transform="translate({f(tx)} {f(y - h)}) scale({sx} {scale})" shape-rendering="crispEdges">{"".join(rects)}</g>'

BAY = {'W': '#8a5a35', 'G': '#6e4527', 'D': '#3b2618', 'P': '#2a1a10', 'Y': '#2a1a10', 'R': '#2a1a10',
       'V': '#3b2618', 'K': '#1d1712', 'L': '#7a4e2e'}
GREY = {'W': '#dcd7cf', 'G': '#b8b0a5', 'D': '#5b5650', 'P': '#7a7068', 'Y': '#7a7068', 'R': '#7a7068',
        'V': '#5b5650', 'K': '#2b2724', 'L': '#cbc4ba'}

def skyline(base):
    c = '#8fa3c4'
    out = [f'<g fill="{c}">']
    # Häuserblöcke
    for x, w, h in [(250, 40, 26), (292, 30, 38), (324, 46, 22), (420, 36, 30), (458, 28, 18), (520, 44, 28), (566, 30, 20)]:
        out.append(f'<rect x="{x}" y="{base - h}" width="{w}" height="{h}"/>')
    # Uhrturm (schlank, mit Zifferblatt und Spitze)
    tx = 380
    out.append(f'<rect x="{tx}" y="{base - 78}" width="16" height="78"/><rect x="{tx - 2}" y="{base - 96}" width="20" height="20"/>'
               f'<polygon points="{tx - 2},{base - 96} {tx + 8},{base - 120} {tx + 18},{base - 96}"/>')
    out.append(f'<circle cx="{tx + 8}" cy="{base - 86}" r="6" fill="#e8eef8"/></g>')
    # Riesenrad
    out.append(f'<g stroke="{c}" stroke-width="3" fill="none"><circle cx="490" cy="{base - 34}" r="30"/>'
               + ''.join(f'<line x1="490" y1="{base - 34}" x2="{f(490 + 30 * __import__("math").cos(a))}" y2="{f(base - 34 + 30 * __import__("math").sin(a))}"/>' for a in [k * 3.14159 / 4 for k in range(8)])
               + f'<line x1="478" y1="{base}" x2="490" y2="{base - 34}"/><line x1="502" y1="{base}" x2="490" y2="{base - 34}"/></g>')
    return ''.join(out)

def stone_wall(x0, x1, y):
    rng = random.Random(7)
    out = [f'<rect x="{x0}" y="{y - 30}" width="{x1 - x0}" height="30" fill="#7d776f" rx="4"/>']
    for row, yy in enumerate((y - 28, y - 18, y - 8)):
        x = x0 + (row % 2) * 9
        while x < x1 - 6:
            w = rng.uniform(14, 24)
            w = min(w, x1 - x - 2)
            out.append(f'<rect x="{f(x)}" y="{f(yy)}" width="{f(w - 2)}" height="8" rx="3" fill="{rng.choice(["#b3ada4", "#a39d94", "#c2bcb2"])}"/>')
            x += w
    out.append(f'<rect x="{x0}" y="{y - 34}" width="{x1 - x0}" height="6" rx="3" fill="#8f8a82"/>')
    return ''.join(out)

def gate(x, y):
    c = '#a0693a'
    out = [f'<rect x="{x}" y="{y - 52}" width="8" height="52" fill="#6b4a2a"/><rect x="{x + 92}" y="{y - 52}" width="8" height="52" fill="#6b4a2a"/>']
    for k in range(5):
        out.append(f'<rect x="{x + 8}" y="{y - 46 + k * 9}" width="84" height="5" fill="{c}"/>')
    out.append(f'<line x1="{x + 10}" y1="{y - 6}" x2="{x + 90}" y2="{y - 46}" stroke="{c}" stroke-width="5"/>')
    return ''.join(out)

def phone_box(x, y):
    red, dark = '#d4202a', '#a3141c'
    w, h = 46, 118
    out = [f'<ellipse cx="{x + w / 2}" cy="{y}" rx="34" ry="5" fill="#00000022"/>',
           f'<rect x="{x}" y="{y - h}" width="{w}" height="{h}" fill="{red}"/>',
           f'<rect x="{x - 3}" y="{y - h - 6}" width="{w + 6}" height="8" fill="{dark}"/>',
           f'<path d="M{x - 1} {y - h - 6} Q{x + w / 2} {y - h - 24} {x + w + 1} {y - h - 6} Z" fill="{red}"/>',
           f'<rect x="{x + 6}" y="{y - h + 6}" width="{w - 12}" height="7" fill="#f6f1e4"/>',   # Schild (ohne Text)
           f'<rect x="{x}" y="{y - 8}" width="{w}" height="8" fill="{dark}"/>']
    for r in range(4):
        for c in range(2):
            out.append(f'<rect x="{x + 8 + c * 16}" y="{y - h + 20 + r * 20}" width="13" height="16" fill="#cfe6f5"/>')
    out.append(f'<rect x="{x + w - 6}" y="{y - 60}" width="3" height="10" fill="#f5d24a"/>')   # Türgriff
    return ''.join(out)

def bunting(x0, y0, x1, y1):
    cols = ['#d4202a', '#ffffff', '#2346a0']
    out = [f'<path d="M{x0} {y0} Q{(x0 + x1) / 2} {(y0 + y1) / 2 + 30} {x1} {y1}" stroke="#ffffff" stroke-width="2" fill="none"/>']
    n = 10
    for k in range(1, n):
        t = k / n
        x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * (x0 + x1) / 2 + t * t * x1
        y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * ((y0 + y1) / 2 + 30) + t * t * y1
        out.append(f'<polygon points="{f(x - 8)},{f(y)} {f(x + 8)},{f(y)} {f(x)},{f(y + 16)}" fill="{cols[k % 3]}"/>')
    return ''.join(out)

def bush(x, y, s=1.0):
    return (f'<circle cx="{f(x)}" cy="{f(y - 10 * s)}" r="{f(14 * s)}" fill="#3f8f4a"/>'
            f'<circle cx="{f(x + 14 * s)}" cy="{f(y - 6 * s)}" r="{f(11 * s)}" fill="#4f9f55"/>'
            f'<circle cx="{f(x - 13 * s)}" cy="{f(y - 5 * s)}" r="{f(10 * s)}" fill="#4f9f55"/>')

def build():
    g = [f'<rect width="{W}" height="{H}" fill="#bfe3ff"/>']
    for cx, cy, s in [(180, 40, 1.0), (640, 28, 1.3), (1010, 50, 0.9)]:
        g.append(f'<g fill="#ffffff" opacity="0.9"><ellipse cx="{cx}" cy="{cy}" rx="{f(38 * s)}" ry="{f(12 * s)}"/>'
                 f'<ellipse cx="{f(cx + 22 * s)}" cy="{f(cy - 8 * s)}" rx="{f(24 * s)}" ry="{f(12 * s)}"/></g>')
    g.append(skyline(150))
    # Hügel mit Feldern und Hecken
    g.append(f'<path d="M0 150 Q300 128 600 146 T1200 140 V240 H0 Z" fill="#9fd38a"/>')
    g.append(f'<path d="M0 170 Q260 150 560 166 T1200 158 V240 H0 Z" fill="#86c873"/>')
    for d in ['M90 168 Q260 156 420 166', 'M640 162 Q820 150 1000 160', 'M300 186 Q520 172 760 184']:
        g.append(f'<path d="{d}" stroke="#4f8f45" stroke-width="7" fill="none" stroke-linecap="round"/>')
    for x, y, s in [(130, 170, 0.8), (720, 164, 0.7), (1080, 160, 0.9), (980, 176, 0.8)]:
        g.append(bush(x, y, s))
    g.append(f'<path d="M0 196 Q400 186 800 194 T1200 190 V240 H0 Z" fill="#73bd66"/>')
    # Vordergrund: Mauer, Gatter, Telefonzelle, Wimpel, Ponys
    g.append(stone_wall(170, 548, 222))
    g.append(gate(548, 222))
    g.append(bunting(684, 112, 1130, 120))
    g.append(f'<rect x="1128" y="112" width="5" height="110" fill="#ffffff"/>')
    g.append(phone_box(660, 226))
    g.append(pony(815, 232, 3.9, BAY))
    g.append(pony(930, 228, 3.5, GREY, mirror=True))
    for x in range(20, W, 37):
        g.append(f'<path d="M{x} 236 l3 -8 l3 8 l3 -9 l3 9" stroke="#5aa557" stroke-width="2" fill="none"/>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">{"".join(g)}</svg>\n'

if __name__ == '__main__':
    svg = build()
    (ROOT / 'img' / 'banner-englisch.svg').write_text(svg)
    print('img/banner-englisch.svg', len(svg), 'Bytes')
