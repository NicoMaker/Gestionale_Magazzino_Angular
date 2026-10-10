# Gestione Magazzino Moto

Backend **Node/Express + SQLite + Socket.IO** (invariato) e frontend completamente riscritto in **Angular 21 + TypeScript**.

```
Backend/    API REST + realtime (porta 3000) — non serve più nessuna pagina HTML
frontend/   App Angular (porta 4200 in sviluppo)
Documenti/  Documentazione e manuale
```

## Avvio

**1. Backend**

```bash
cd Backend
npm install
npm start            # oppure: npm run start_dati  (carica dati di esempio)
```

Al primo avvio viene creato l'utente `Admin` / `Admin123!`.

**2. Frontend** (Node 20.19+ / 22.12+)

```bash
cd frontend
npm install
npm start            # http://localhost:4200
```

Build di produzione: `npm run build` → `frontend/dist/frontend/browser` (da servire con un web server statico con fallback a `index.html`).

## Collegamento al backend

`frontend/src/environments/environment.ts`: di default usa lo stesso host del frontend sulla porta **3000**
(funziona anche da altri PC in rete). Se il backend è altrove modifica `backendOrigin`.

## Cosa è cambiato

- `Backend/src/app.js`: rimossi `express.static` e il fallback `index.html`; le rotte non-API rispondono 404 JSON. Il resto del backend è identico.
- Il vecchio frontend HTML/JS è sostituito da Angular (componenti standalone, signals, lazy routing, guard di login, Socket.IO realtime).
- Stili originali riutilizzati: stesso aspetto.
- Dati aziendali in `frontend/public/company-info.json`.

## Funzioni

Login · Marche · Prodotti · Movimenti (carico/scarico FIFO, filtri, modifica/elimina, riordino) · Scarico da PDF (sezione RICAMBI) · Carico da fattura PDF · Riordino · Riepilogo con lotti · Storico a una data · Stampe · Utenti · Download DB.
