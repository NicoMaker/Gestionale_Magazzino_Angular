import { Injectable, signal } from '@angular/core';

export type NotifyType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: NotifyType;
  visible: boolean;
}

/** Notifiche "toast" non bloccanti in alto a destra */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly toasts = signal<Toast[]>([]);
  private seq = 0;

  show(message: string, type: NotifyType = 'info', duration = 4000): void {
    const id = ++this.seq;
    this.toasts.update((l) => [...l, { id, message, type, visible: false }]);
    setTimeout(() => this.patch(id, true), 10);
    if (duration > 0) setTimeout(() => this.dismiss(id), duration);
  }

  success = (m: string) => this.show(m, 'success');
  error = (m: string) => this.show(m, 'error', 6000);
  warning = (m: string) => this.show(m, 'warning');
  info = (m: string) => this.show(m, 'info');

  dismiss(id: number): void {
    this.patch(id, false);
    setTimeout(() => this.toasts.update((l) => l.filter((t) => t.id !== id)), 300);
  }

  private patch(id: number, visible: boolean): void {
    this.toasts.update((l) => l.map((t) => (t.id === id ? { ...t, visible } : t)));
  }
}
