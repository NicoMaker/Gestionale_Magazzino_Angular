import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { debounceTime, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { RigaGiacenza, RiepilogoResponse } from './models';
import { SocketService } from './socket.service';

@Injectable({ providedIn: 'root' })
export class MagazzinoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/magazzino`;

  readonly riepilogo = signal<RigaGiacenza[]>([]);
  readonly loading = signal(false);
  private loaded = false;

  constructor() {
    inject(SocketService)
      .on(
        'magazzino_aggiornato',
        'movimento_creato',
        'movimento_modificato',
        'movimento_eliminato',
        'prodotti_aggiornati',
      )
      .pipe(debounceTime(250))
      .subscribe(() => this.loaded && void this.loadRiepilogo());
  }

  async loadRiepilogo(): Promise<void> {
    this.loading.set(true);
    try {
      const r = await firstValueFrom(this.http.get<RiepilogoResponse>(`${this.url}/riepilogo`));
      this.riepilogo.set(r.riepilogo ?? []);
      this.loaded = true;
    } finally {
      this.loading.set(false);
    }
  }

  /** Giacenze ricostruite alla data indicata (YYYY-MM-DD) */
  async storico(data: string): Promise<RigaGiacenza[]> {
    const r = await firstValueFrom(
      this.http.get<RiepilogoResponse>(`${this.url}/storico-giacenza/${encodeURIComponent(data)}`),
    );
    return r.riepilogo ?? [];
  }
}
