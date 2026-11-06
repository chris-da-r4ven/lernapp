// Prüfseite: Bietet der Browser eine eingebaute Handschrifterkennung
// (Chrome Handwriting Recognition API)? Wenn ja, kann man hier direkt
// ausprobieren, ob Fehlschreibungen wie "frend" stehen bleiben.

import { esc } from '../util.js';

export async function handwritingTestView(el) {
  el.innerHTML = `
    <a class="back" href="#/statistik">← Fortschritt</a>
    <h1>Handschrift-Test</h1>
    <section class="card"><h2>Unterstützt dieses Gerät die Erkennung?</h2><div class="hw-result muted">Prüfe …</div></section>
    <section class="card hw-pad-card" hidden>
      <h2>Ausprobieren</h2>
      <p class="muted small">Schreib ein Wort auf Englisch, gern absichtlich falsch (z. B. <em>frend</em>), dann „Erkennen“.</p>
      <canvas class="hw-pad" width="700" height="220"></canvas>
      <div class="actions">
        <button class="btn primary" data-act="recognize">Erkennen</button>
        <button class="btn" data-act="clear">Löschen</button>
      </div>
      <div class="hw-prediction"></div>
    </section>
    <p class="muted small">${esc(navigator.userAgent)}</p>`;

  const result = el.querySelector('.hw-result');
  const lines = [];
  const supported = 'createHandwritingRecognizer' in navigator;
  lines.push(`Handschrift-Schnittstelle vorhanden: <strong>${supported ? 'ja ✅' : 'nein ❌'}</strong>`);
  let recognizer = null;
  if (supported) {
    try {
      const q = await navigator.queryHandwritingRecognizer?.({ languages: ['en'] });
      lines.push(`Englisch unterstützt: <strong>${q ? 'ja ✅' : 'nein ❌'}</strong>`);
      if (q) recognizer = await navigator.createHandwritingRecognizer({ languages: ['en'] });
    } catch (e) {
      lines.push(`Fehler: ${esc(e.message ?? e)}`);
    }
  }
  lines.push(recognizer
    ? '<strong>Ergebnis: Ein eigenes Schreibfeld in der App ist möglich.</strong>'
    : '<strong>Ergebnis: Auf diesem Gerät geht es nur über die Tastatur (z. B. Gboard-Handschrift).</strong>');
  result.innerHTML = lines.map((l) => `<p>${l}</p>`).join('');
  result.classList.remove('muted');

  if (recognizer) setupPad(el, recognizer);
}

function setupPad(el, recognizer) {
  const card = el.querySelector('.hw-pad-card');
  card.hidden = false;
  const canvas = card.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const out = card.querySelector('.hw-prediction');
  let strokes = [];
  let current = null;
  let start = 0;

  const pos = (ev) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) * canvas.width) / r.width, y: ((ev.clientY - r.top) * canvas.height) / r.height };
  };

  const style = () => {
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = getComputedStyle(document.body).color;
  };

  canvas.addEventListener('pointerdown', (ev) => {
    canvas.setPointerCapture(ev.pointerId);
    if (!strokes.length) start = Date.now();
    const p = pos(ev);
    current = [{ ...p, t: Date.now() - start }];
    style();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!current) return;
    const p = pos(ev);
    current.push({ ...p, t: Date.now() - start });
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });
  const end = () => { if (current) strokes.push(current); current = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  card.querySelector('[data-act=clear]').addEventListener('click', () => {
    strokes = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    out.innerHTML = '';
  });

  card.querySelector('[data-act=recognize]').addEventListener('click', async () => {
    if (!strokes.length) return;
    try {
      const drawing = recognizer.startDrawing({ recognitionType: 'text', alternatives: 3 });
      for (const s of strokes) {
        const stroke = new HandwritingStroke();
        s.forEach((p) => stroke.addPoint(p));
        drawing.addStroke(stroke);
      }
      const predictions = await drawing.getPrediction();
      drawing.clear?.();
      out.innerHTML = predictions?.length
        ? `<p>Erkannt: <strong class="big">${esc(predictions[0].text)}</strong></p>
           <p class="muted small">Weitere Möglichkeiten: ${predictions.slice(1).map((p) => esc(p.text)).join(', ') || '–'}</p>`
        : '<p>Nichts erkannt.</p>';
    } catch (e) {
      out.innerHTML = `<p class="result bad">Fehler: ${esc(e.message ?? e)}</p>`;
    }
  });
}
