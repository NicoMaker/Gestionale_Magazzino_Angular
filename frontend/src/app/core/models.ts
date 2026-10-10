export interface Marca {
  id: number;
  nome: string;
  data_creazione: string;
  prodotti_count: number;
}

export interface Prodotto {
  id: number;
  nome: string;
  marca_id: number | null;
  marca_nome: string | null;
  descrizione: string | null;
  data_creazione: string;
  giacenza: number;
}

export type TipoMovimento = 'carico' | 'scarico';

export interface Movimento {
  id: number;
  prodotto_id: number;
  prodotto_nome: string;
  marca_nome: string | null;
  prodotto_descrizione: string | null;
  tipo: TipoMovimento;
  quantita: number;
  prezzo: number | null;
  prezzo_totale_movimento: number | null;
  prezzo_unitario_scarico: number | null;
  data_movimento: string;
  data_registrazione: string;
  fattura_doc: string | null;
  fornitore_cliente_id: string | null;
}

export interface MovimentoPayload {
  prodotto_id: number;
  tipo: TipoMovimento;
  quantita: number;
  prezzo: number | null;
  data_movimento: string;
  fattura_doc: string | null;
  fornitore: string | null;
}

export interface Lotto {
  id: number;
  quantita_rimanente: number;
  prezzo: number;
  data_carico: string;
  fattura_doc: string | null;
  fornitore: string | null;
}

export interface RigaGiacenza {
  id: number;
  nome: string;
  marca_nome: string | null;
  descrizione: string | null;
  giacenza: number;
  valore_totale: number;
  lotti: Lotto[];
}

export interface RiepilogoResponse {
  riepilogo: RigaGiacenza[];
  valore_totale: number;
}

export interface Utente {
  id: number;
  username: string;
}

export interface UtenteSaveResponse {
  id: number;
  username: string;
  username_modificato?: boolean;
  password_modificata?: boolean;
}

export interface BulkScaricoItem {
  codice: string;
  prodotto_id: number;
  quantita: number;
  data_movimento: string;
}

export interface BulkScaricoResponse {
  risultati: {
    success: { codice: string; prodotto_id: number; quantita: number; data_movimento: string; id: number }[];
    failed: { codice?: string; reason: string }[];
    notFound: unknown[];
    insufficientStock: {
      codice: string;
      prodotto_id: number;
      quantita: number;
      disponibile?: number;
      data_movimento: string;
      reason: string;
    }[];
  };
}

export interface CompanyInfo {
  company: {
    name?: string;
    address: string;
    city: string;
    cap: string;
    province: string;
    country?: string;
    piva: string;
    email: string;
    phone: string;
  };
  settings?: Record<string, string>;
}
