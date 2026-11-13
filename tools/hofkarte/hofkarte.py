# Baut die Hofkarten-Hintergründe der App: img/hof-<thema>.svg und js/hof-data.js (Weg als Punktliste).
# Aufruf: python3 tools/hofkarte/hofkarte.py   (danach tools/check.py --fix für den Cache-Fingerabdruck)
# Die App zeichnet darüber nur Stationen, gelaufenen Weg und Pixel-Fanny (js/hofkarte.js).
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import hof2

ROOT = pathlib.Path(__file__).resolve().parents[2]
THEMES = {'neutral': 'neutral', 'halloween': 'halloween', 'schule': 'school'}   # App-Name → Generator-Name
VIEW = (0, 40, hof2.W, 800)   # Ausschnitt: Hofrand ohne leere Ränder

def main():
    data = {}
    for name, gen in THEMES.items():
        svg, curve = hof2.build(gen, bare=True)
        g = hof2.P
        gnd = hof2.pts([g(0, 0), g(hof2.N, 0), g(hof2.N, hof2.N), g(0, hof2.N)])
        doc = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{" ".join(map(str, VIEW))}">'
               f'<defs><clipPath id="gnd"><polygon points="{gnd}"/></clipPath></defs>{svg}</svg>\n')
        (ROOT / 'img' / f'hof-{name}.svg').write_text(doc)
        data[name] = [[round(x), round(y)] for x, y in curve]
        print(name, len(doc), 'Bytes,', len(curve), 'Wegpunkte')
    js = ('// Hofkarte: Ausschnitt und Weg je Thema – erzeugt aus tools/hofkarte/hofkarte.py (nicht von Hand ändern).\n'
          f'export const HOF_VIEW = {json.dumps(list(VIEW))};\n'
          f'export const HOF_WAY = {json.dumps(data, separators=(",", ":"))};\n')
    (ROOT / 'js' / 'hof-data.js').write_text(js)

if __name__ == '__main__':
    main()
