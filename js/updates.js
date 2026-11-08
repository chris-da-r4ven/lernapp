// „Neue Inhalte suchen“ – beim Start (leise) und über den Knopf auf der Startseite.

import { checkUpdates } from './content.js';
import { toast } from './util.js';
import { rerender, practicing } from './nav.js';

export async function updateContent({ quiet = false } = {}) {
  const result = await checkUpdates();
  if (result === 'updated') {
    toast('Neue Inhalte geladen 🎉');
    if (!practicing()) rerender();
  } else if (!quiet) {
    toast(result === 'current' ? 'Alles aktuell.'
      : result === 'app-zu-alt' ? 'Neue Inhalte brauchen eine neuere App – die kommt gleich von selbst.'
      : 'Kein Internet – du übst mit den gespeicherten Inhalten.');
  }
  return result;
}
