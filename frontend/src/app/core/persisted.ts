import { effect, signal, WritableSignal } from '@angular/core';

/**
 * Signal sincronizzato con localStorage: ricorda filtri e ricerche
 * tra una navigazione e l'altra (come faceva il vecchio search.js).
 * Va chiamato in un injection context (field initializer di un componente/servizio).
 */
export function persistedSignal(key: string, initial = ''): WritableSignal<string> {
  let start = initial;
  try {
    start = localStorage.getItem(key) ?? initial;
  } catch {
    /* storage non disponibile */
  }
  const s = signal(start);
  effect(() => {
    const v = s();
    try {
      if (v) localStorage.setItem(key, v);
      else localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  });
  return s;
}
