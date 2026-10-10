import { Injectable } from '@angular/core';
import { Prodotto } from './models';
import { todayISO } from './utils';

export interface ScaricoRiga {
  code: string;
  quantity: number;
}
export interface ParsedScarico {
  date: string;
  righe: ScaricoRiga[];
}
export interface FatturaRiga {
  nome_prodotto: string;
  quantita: number;
  prezzo_unitario: number | null;
}
export interface ParsedFattura {
  numero_documento: string | null;
  fornitore: string | null;
  data_documento: string;
  righe: FatturaRiga[];
}

type PdfJs = typeof import('pdfjs-dist');

/**
 * Lettura dei PDF (pdf.js, caricato solo quando serve) e parsing del testo:
 *  - documento di lavoro con sezione RICAMBI  → scarichi
 *  - fattura / DDT / bolla                   → carichi
 */
@Injectable({ providedIn: 'root' })
export class PdfService {
  private lib: PdfJs | null = null;

  private async pdfjs(): Promise<PdfJs> {
    if (!this.lib) {
      const lib = await import('pdfjs-dist');
      lib.GlobalWorkerOptions.workerSrc = new URL('pdf/pdf.worker.min.js', document.baseURI).href;
      this.lib = lib;
    }
    return this.lib;
  }

  /** Estrae il testo del PDF ricostruendo le righe in base alla posizione verticale */
  async extractText(file: File): Promise<string> {
    const lib = await this.pdfjs();
    let pdf;
    try {
      pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    } catch (e) {
      throw new Error('Errore durante la lettura del PDF: ' + (e as Error).message);
    }

    let fullText = '';
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      let pageText = '';
      let lastY: number | null = null;
      let prev: { x: number; w: number } | null = null;

      for (const item of content.items) {
        if (!('str' in item)) continue;
        const x = item.transform[4];
        const y = item.transform[5];
        if (lastY !== null && Math.abs(y - lastY) > 5) {
          pageText += '\n';
        } else if (prev && x - (prev.x + prev.w) > 2) {
          pageText += ' ';
        }
        pageText += item.str;
        lastY = y;
        prev = { x, w: item.width };
      }
      fullText += pageText + '\n\n';
    }
    return fullText;
  }

  // ───────────────────────── SCARICO (sezione RICAMBI) ─────────────────────────

  parseScarico(text: string): ParsedScarico {
    const date = this.extractDate(text);
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const start = lines.findIndex((l) => l.toUpperCase().includes('RICAMBI'));
    if (start === -1) return { date, righe: [] };

    const headerKw = [
      'CODICE',
      'RICAMBIO',
      'DESCRIZIONE',
      'QUANTITA',
      'PREZZO',
      'IVA',
      'ESCLUSA',
      'QUANTITÀ',
    ];
    let dataStart = start + 1;
    for (let i = start + 1; i < Math.min(start + 10, lines.length); i++) {
      if (headerKw.some((k) => lines[i].toUpperCase().includes(k))) dataStart = i + 1;
      else break;
    }

    const stopKw = [
      'MANODOPERA',
      'TOTALE',
      'IVA COMPRESA',
      'DESCRIZIONE LAVORAZIONI',
      'LAVORAZIONI',
    ];
    const righe: ScaricoRiga[] = [];
    for (let i = dataStart; i < lines.length; i++) {
      const line = lines[i];
      if (stopKw.some((k) => line.toUpperCase().includes(k))) break;
      const parsed = this.parseRicambioLine(line);
      if (parsed) righe.push(parsed);
    }
    return { date, righe };
  }

  private extractDate(text: string): string {
    const lines = text.split('\n').slice(0, 20);
    const dateRe = '(\\d{1,2}[\\/\\-\\.]\\d{1,2}[\\/\\-\\.]\\d{2,4})';
    const patterns = [
      new RegExp(`DATA[_\\s]{3,}${dateRe}`, 'i'),
      new RegExp(`DATA\\s*:\\s*${dateRe}`, 'i'),
      new RegExp(`DATA\\s+${dateRe}`, 'i'),
    ];
    for (const l of lines) {
      for (const p of patterns) {
        const m = l.trim().match(p);
        if (m?.[1]) return this.normalizeDate(m[1]) ?? todayISO();
      }
    }
    for (const l of lines) {
      const m = l.match(new RegExp(dateRe));
      if (m?.[1]) return this.normalizeDate(m[1]) ?? todayISO();
    }
    return todayISO();
  }

  private parseRicambioLine(line: string): ScaricoRiga | null {
    const clean = line.replace(/\s+/g, ' ').trim();
    const validCode = (c: string) => /^[A-Z0-9\-_/]{1,50}$/i.test(c);
    const validQty = (q: number) => !Number.isNaN(q) && q > 0 && q <= 9999;
    const num = (s: string) => Number.parseFloat(s.replace(',', '.'));

    // "<descrizione> <codice> <quantità>"
    let m = clean.match(/^(.+)\s+(\d+)\s+(\d+(?:[,.]\d{1,2})?)$/);
    if (m && validCode(m[2]) && validQty(num(m[3]))) return { code: m[2], quantity: num(m[3]) };

    // "<codice> <quantità>"
    m = clean.match(/^(\d+)\s+(\d+(?:[,.]\d{1,2})?)$/);
    if (m && validCode(m[1]) && validQty(num(m[2]))) return { code: m[1], quantity: num(m[2]) };

    // fallback: prima parola = codice, ultima = quantità
    const words = clean.split(/\s+/);
    if (words.length >= 2) {
      const qty = num(words[words.length - 1]);
      if (validCode(words[0]) && validQty(qty)) return { code: words[0], quantity: qty };
    }
    return null;
  }

  // ───────────────────────── CARICO (fattura / DDT) ─────────────────────────

  parseFattura(text: string): ParsedFattura {
    const righe = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    // 1. numero documento
    let numero: string | null = null;
    const patDoc = [
      /fattura\s+n[°.]?\s*([A-Z0-9\-/]+)/i,
      /n[°.]?\s*fattura\s*:?\s*([A-Z0-9\-/]+)/i,
      /ddt\s+n[°.]?\s*([A-Z0-9\-/]+)/i,
      /documento\s+n[°.]?\s*([A-Z0-9\-/]+)/i,
      /ordine\s+n[°.]?\s*([A-Z0-9\-/]+)/i,
      /bolla\s+n[°.]?\s*([A-Z0-9\-/]+)/i,
      /num(?:ero)?\s*[:.]?\s*([A-Z0-9]{2,}[/-][A-Z0-9]+)/i,
      /^([A-Z]{2,}[/-]\d{4}[/-]\d+)$/i,
      /^(\d{4}[/-]\d+)$/,
    ];
    outer: for (const r of righe) {
      for (const p of patDoc) {
        const m = r.match(p);
        if (m?.[1] && m[1].length >= 2) {
          numero = m[1].trim();
          break outer;
        }
      }
    }

    // 2. data
    let data: string | null = null;
    const patData = [
      /data\s*[:-]?\s*(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})/i,
      /del\s+(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})/i,
      /(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{4})/,
    ];
    outerD: for (const r of righe) {
      for (const p of patData) {
        const m = r.match(p);
        const norm = m?.[1] ? this.normalizeDate(m[1]) : null;
        if (norm) {
          data = norm;
          break outerD;
        }
      }
    }

    // 3. fornitore: prima riga "sensata" tra le prime 15
    const stopW = [
      'fattura',
      'ddt',
      'bolla',
      'ordine',
      'data',
      'numero',
      'via',
      'viale',
      'corso',
      'piazza',
      'tel',
      'fax',
      'email',
      'pec',
      'p.iva',
      'partita',
      'cod',
      'cf',
      'rea',
      'cap',
      'comune',
      'prov',
      'intestat',
      'spett',
      'cliente',
      'destinatar',
      'pagament',
      'scadenz',
      'totale',
      'imponibil',
      'iva',
      'importo',
      'descrizione',
      'quantit',
      'prezzo',
      'articolo',
      'codice',
      'riferimento',
      'note',
      'condizioni',
      'banca',
      'iban',
      'swift',
    ];
    let fornitore: string | null = null;
    for (let i = 0; i < Math.min(15, righe.length); i++) {
      const r = righe[i];
      if (r.length < 3 || r.length > 80) continue;
      const rl = r.toLowerCase();
      if (stopW.some((w) => rl.startsWith(w))) continue;
      if (/^\d/.test(r) || /^[^a-zA-Z]/.test(r)) continue;
      if (/[a-zA-Z]{3,}/.test(r)) {
        fornitore = r;
        break;
      }
    }

    // 4. righe prodotto
    const skipL = [
      'totale',
      'subtotale',
      'imponibile',
      'iva',
      'sconto',
      'trasporto',
      'spese',
      'acconto',
      'saldo',
      'netto',
      'lordo',
      'descrizione',
      'quantita',
      'quantità',
      'prezzo',
      'importo',
      'articolo',
      'codice',
      'um',
      'u.m.',
      'nr',
      'note',
    ];
    const reQta = /\b(\d{1,6}(?:[,.]\d{1,3})?)\s*(l(?:t|itri?)?|pz|pcs|nr|n\.?|pezzi?)?\b/gi;
    const rePrezzo = /€?\s*(\d{1,8}[,.]\d{2})\b/g;
    const out: FatturaRiga[] = [];

    for (const r of righe) {
      if (r.length < 3) continue;
      const rl = r.toLowerCase().trim();
      if (skipL.some((w) => rl === w || rl.startsWith(w + ' ') || rl.startsWith(w + ':'))) continue;
      if (/^[-=*_#]+$/.test(r)) continue;

      const qtaMatches = [...r.matchAll(reQta)];
      if (!qtaMatches.length) continue;

      let quantita: number | null = null;
      for (const m of qtaMatches) {
        const v = Number.parseFloat(m[1].replace(',', '.'));
        if (v > 0 && v <= 9999) {
          quantita = v;
          break;
        }
      }
      if (!quantita) continue;

      const prezzi = [...r.matchAll(rePrezzo)]
        .map((m) => Number.parseFloat(m[1].replace(',', '.')))
        .filter((v) => v > 0)
        .sort((a, b) => a - b);

      const nome = r
        .replace(/€?\s*\d{1,8}[,.]\d{2}/g, '')
        .replace(/\b\d{1,6}(?:[,.]\d{1,3})?\s*(?:l(?:t|itri?)?|pz|pcs|nr|n\.?)?\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      if (nome.length < 2 || /^[\d\s.,\-/*]+$/.test(nome)) continue;

      out.push({ nome_prodotto: nome, quantita, prezzo_unitario: prezzi[0] ?? null });
    }

    return { numero_documento: numero, fornitore, data_documento: data ?? todayISO(), righe: out };
  }

  /** Cerca nel DB il prodotto che corrisponde al nome letto dal PDF */
  matchProdotto(nomePdf: string | null | undefined, prodotti: Prodotto[]): Prodotto | null {
    if (!nomePdf) return null;
    const q = nomePdf.toLowerCase().trim();

    let m = prodotti.find((p) => p.nome.toLowerCase() === q);
    if (m) return m;

    m = prodotti.find((p) => q.includes(p.nome.toLowerCase()) || p.nome.toLowerCase().includes(q));
    if (m) return m;

    const words = (s: string) =>
      s
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);
    const pw = words(q);
    let best = 0;
    let bestM: Prodotto | null = null;
    for (const p of prodotti) {
      const pp = words(p.nome);
      const n = pw.filter((w) => pp.includes(w)).length;
      if (n >= 2 && n > best) {
        best = n;
        bestM = p;
      }
    }
    return bestM;
  }

  /** "31/01/2026" | "31-01-26" | "2026-01-31" → "2026-01-31" (null se non valida) */
  normalizeDate(str: string): string | null {
    const s = str.trim();
    const sep = s.includes('/') ? '/' : s.includes('-') ? '-' : '.';
    const p = s.split(sep);
    if (p.length !== 3) return null;
    if (p[0].length === 4) return `${p[0]}-${p[1].padStart(2, '0')}-${p[2].padStart(2, '0')}`;
    const y = p[2].length === 2 ? '20' + p[2] : p[2];
    return `${y}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
  }
}
