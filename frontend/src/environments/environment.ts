/**
 * Configurazione del collegamento al backend.
 *
 * Di default il backend Node/Express gira sulla porta 3000 della stessa
 * macchina da cui viene servito il frontend (funziona quindi anche da altri
 * PC della rete locale, es. http://192.168.1.10:4200 → http://192.168.1.10:3000).
 *
 * Se il backend è altrove (altro host/porta o dietro reverse proxy),
 * modifica semplicemente `backendOrigin`.
 */
const proto = typeof window !== 'undefined' ? window.location.protocol : 'http:';
const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

const backendOrigin = `${proto}//${host}:3000`;

export const environment = {
  backendOrigin,
  apiUrl: `${backendOrigin}/api`,
  socketUrl: backendOrigin,
};
