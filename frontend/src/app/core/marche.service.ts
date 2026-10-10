import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { debounceTime, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Marca } from './models';
import { SocketService } from './socket.service';

@Injectable({ providedIn: 'root' })
export class MarcheService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/marche`;

  readonly marche = signal<Marca[]>([]);
  readonly loading = signal(false);
  private loaded = false;

  constructor() {
    inject(SocketService)
      .on(
        'marca_aggiunta', 'marca_modificata', 'marca_eliminata', 'marche_aggiornate',
        'prodotto_aggiunto', 'prodotto_eliminato', 'prodotti_aggiornati',
      )
      .pipe(debounceTime(250))
      .subscribe(() => this.loaded && void this.load());
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.marche.set(await firstValueFrom(this.http.get<Marca[]>(this.url)));
      this.loaded = true;
    } finally {
      this.loading.set(false);
    }
  }

  async create(nome: string): Promise<void> {
    await firstValueFrom(this.http.post(this.url, { nome }));
    await this.load();
  }

  async update(id: number, nome: string): Promise<void> {
    await firstValueFrom(this.http.put(`${this.url}/${id}`, { nome }));
    await this.load();
  }

  async remove(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.url}/${id}`));
    await this.load();
  }
}
