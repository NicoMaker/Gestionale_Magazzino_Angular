import { Injectable, signal } from '@angular/core';
import { Observable, Subject, filter } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

export interface SocketEvent {
  event: string;
  data?: any;
}

/**
 * Connessione Socket.IO al backend. Tutti gli eventi del server vengono
 * esposti come stream RxJS filtrabile per nome.
 */
@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;
  private readonly stream = new Subject<SocketEvent>();
  readonly connected = signal(false);

  connect(): void {
    if (this.socket) return;
    this.socket = io(environment.socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
    this.socket.on('connect_error', (e) => console.warn('Socket.IO:', e.message));
    this.socket.onAny((event: string, data?: unknown) => this.stream.next({ event, data }));
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
  }

  /** Stream degli eventi con uno dei nomi indicati */
  on(...events: string[]): Observable<SocketEvent> {
    return this.stream.pipe(filter((e) => events.includes(e.event)));
  }
}
