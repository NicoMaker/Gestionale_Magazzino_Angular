import { Injectable, signal } from '@angular/core';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface ConfirmOptions {
  title?: string;
  /** Testo principale (testo semplice) */
  message: string;
  /** Riquadro evidenziato con i dettagli (es. nome prodotto) */
  detail?: string;
  /** Avviso rosso mostrato sotto al messaggio */
  warning?: string;
  /** Pulsante di conferma rosso + icona cestino */
  danger?: boolean;
  confirmLabel?: string;
}

export interface AlertState {
  title: string;
  message: string;
  type: AlertType;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (v: boolean) => void;
}

/** Modali di conferma e di avviso (sostituiscono confirm()/alert() del browser) */
@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly confirmState = signal<ConfirmState | null>(null);
  readonly alertState = signal<AlertState | null>(null);

  confirm(opts: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmState.set({ ...opts, resolve });
    });
  }

  resolveConfirm(value: boolean): void {
    const s = this.confirmState();
    this.confirmState.set(null);
    s?.resolve(value);
  }

  alert(message: string, title = 'Informazione', type: AlertType = 'info'): void {
    this.alertState.set({ message, title, type });
  }

  success = (m: string, title = 'Operazione Completata') => this.alert(m, title, 'success');
  error = (m: string, title = 'Errore') => this.alert(m, title, 'error');
  warning = (m: string, title = 'Attenzione') => this.alert(m, title, 'warning');

  closeAlert(): void {
    this.alertState.set(null);
  }
}
