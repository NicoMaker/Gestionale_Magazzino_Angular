import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { debounceTime, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Prodotto } from './models';
import { SocketService } from './socket.service';

export interface ProdottoPayload {
  nome: string;
  marca_id: number | null;
  descrizione: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProdottiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/prodotti`;

  readonly prodotti = signal<Prodotto[]>([]);
  readonly loading = signal(false);
  /** Prodotti con giacenza esaurita (zero) → candidati al riordino */
  readonly esauriti = computed(() => this.prodotti().filter((p) => !Number(p.giacenza)));
  private loaded = false;

  constructor() {
    inject(SocketService)
      .on(
        'prodotto_aggiunto', 'prodotto_modificato', 'prodotto_eliminato', 'prodotti_aggiornati',
        'marca_modificata', 'marca_eliminata', 'magazzino_aggiornato', 'dati_aggiornati',
      )
      .pipe(debounceTime(250))
      .subscribe(() => this.loaded && void this.load());
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.prodotti.set(await firstValueFrom(this.http.get<Prodotto[]>(this.url)));
      this.loaded = true;
    } finally {
      this.loading.set(false);
    }
  }

  /** Carica solo se non è mai stato caricato (per liste di appoggio) */
  async ensureLoaded(): Promise<void> {
    if (!this.loaded) await this.load();
  }

  async create(p: ProdottoPayload): Promise<void> {
    await firstValueFrom(this.http.post(this.url, p));
    await this.load();
  }

  async update(id: number, p: ProdottoPayload): Promise<void> {
    await firstValueFrom(this.http.put(`${this.url}/${id}`, p));
    await this.load();
  }

  async remove(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.url}/${id}`));
    await this.load();
  }

  byId(id: number | string | null | undefined): Prodotto | undefined {
    return this.prodotti().find((p) => p.id === Number(id));
  }
}
