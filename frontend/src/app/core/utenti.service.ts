import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { debounceTime, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Utente, UtenteSaveResponse } from './models';
import { SocketService } from './socket.service';

@Injectable({ providedIn: 'root' })
export class UtentiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/utenti`;

  readonly utenti = signal<Utente[]>([]);
  readonly loading = signal(false);
  private loaded = false;

  constructor() {
    inject(SocketService)
      .on('utente_aggiunto', 'utente_modificato', 'utente_eliminato', 'utenti_aggiornati')
      .pipe(debounceTime(250))
      .subscribe(() => this.loaded && void this.load());
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.utenti.set(await firstValueFrom(this.http.get<Utente[]>(this.url)));
      this.loaded = true;
    } finally {
      this.loading.set(false);
    }
  }

  create(username: string, password: string): Promise<UtenteSaveResponse> {
    return firstValueFrom(this.http.post<UtenteSaveResponse>(this.url, { username, password }));
  }

  update(
    id: number,
    body: { username: string; password?: string; current_user: string | null },
  ): Promise<UtenteSaveResponse> {
    return firstValueFrom(this.http.put<UtenteSaveResponse>(`${this.url}/${id}`, body));
  }

  remove(
    id: number,
    currentUser: string,
  ): Promise<{ success: boolean; utente_eliminato: boolean }> {
    const params = new HttpParams().set('current_user', currentUser);
    return firstValueFrom(
      this.http.delete<{ success: boolean; utente_eliminato: boolean }>(`${this.url}/${id}`, {
        params,
      }),
    );
  }
}
