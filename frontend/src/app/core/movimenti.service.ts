import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { debounceTime, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { BulkScaricoItem, BulkScaricoResponse, Movimento, MovimentoPayload } from './models';
import { ProdottiService } from './prodotti.service';
import { SocketService } from './socket.service';

/** Dati con cui pre-compilare il modal "Nuovo movimento" (es. riordino) */
export interface MovimentoDraft {
  prodotto_id: number;
  tipo: 'carico' | 'scarico';
  riordino?: boolean;
  fornitore?: string | null;
}

@Injectable({ providedIn: 'root' })
export class MovimentiService {
  private readonly http = inject(HttpClient);
  private readonly prodotti = inject(ProdottiService);
  private readonly url = `${environment.apiUrl}/dati`;

  readonly movimenti = signal<Movimento[]>([]);
  readonly loading = signal(false);
  /** Bozza passata da altre pagine (Riordino → Movimenti) */
  readonly pendingDraft = signal<MovimentoDraft | null>(null);
  private loaded = false;

  constructor() {
    inject(SocketService)
      .on('dati_aggiornati', 'magazzino_aggiornato', 'movimento_creato', 'movimento_modificato', 'movimento_eliminato')
      .pipe(debounceTime(250))
      .subscribe(() => this.loaded && void this.load());
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await firstValueFrom(this.http.get<Movimento[]>(`${this.url}/`));
      this.movimenti.set(Array.isArray(data) ? data : []);
      this.loaded = true;
    } finally {
      this.loading.set(false);
    }
  }

  async create(m: MovimentoPayload): Promise<void> {
    await firstValueFrom(this.http.post(this.url, m));
    await this.refreshAll();
  }

  async update(id: number, m: MovimentoPayload): Promise<void> {
    await firstValueFrom(this.http.put(`${this.url}/${id}`, m));
    await this.refreshAll();
  }

  async remove(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.url}/${id}`));
    await this.refreshAll();
  }

  async bulkScarico(scarichi: BulkScaricoItem[], nomeDocumento: string): Promise<BulkScaricoResponse['risultati']> {
    const res = await firstValueFrom(
      this.http.post<BulkScaricoResponse>(`${this.url}/bulk-scarico`, {
        scarichi,
        nome_documento: nomeDocumento || 'Import PDF',
      }),
    );
    await this.refreshAll();
    return res.risultati;
  }

  /** Movimenti e giacenze cambiano insieme */
  async refreshAll(): Promise<void> {
    await Promise.all([this.load(), this.prodotti.load()]);
  }
}
