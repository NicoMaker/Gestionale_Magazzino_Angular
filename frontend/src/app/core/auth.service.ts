import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { DialogService } from './dialog.service';
import { SocketService } from './socket.service';

const KEY_USER = 'username';
const KEY_SECTION = 'activeSection';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly socket = inject(SocketService);
  private readonly dialog = inject(DialogService);

  readonly username = signal<string | null>(this.read());

  constructor() {
    // Se il mio account viene modificato/eliminato da un altro dispositivo → logout
    this.socket.on('utente_modificato').subscribe(({ data }) => {
      if (data?.oldUsername && data.oldUsername === this.username()) {
        this.forceLogout('Il tuo account è stato modificato da un altro dispositivo. Effettua di nuovo il login.');
      }
    });
    this.socket.on('utente_eliminato').subscribe(({ data }) => {
      if (data?.username && data.username === this.username()) {
        this.forceLogout('Il tuo account è stato eliminato. Verrai disconnesso.');
      }
    });
  }

  get isLogged(): boolean {
    return !!this.username();
  }

  async login(username: string, password: string): Promise<void> {
    await firstValueFrom(
      this.http.post<{ success: boolean; username: string }>(`${environment.apiUrl}/auth/login`, {
        username,
        password,
      }),
    );
    localStorage.setItem(KEY_USER, username);
    this.username.set(username);
  }

  logout(): void {
    localStorage.removeItem(KEY_USER);
    localStorage.removeItem(KEY_SECTION);
    this.username.set(null);
    this.socket.disconnect();
    void this.router.navigate(['/login']);
  }

  forceLogout(message?: string): void {
    if (message) this.dialog.alert(message, 'Sessione terminata', 'warning');
    this.logout();
  }

  private read(): string | null {
    try {
      return localStorage.getItem(KEY_USER);
    } catch {
      return null;
    }
  }
}
