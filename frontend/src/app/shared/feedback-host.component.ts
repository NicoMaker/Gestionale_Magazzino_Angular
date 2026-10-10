import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DialogService } from '../core/dialog.service';
import { NotificationService } from '../core/notification.service';
import { ModalComponent } from './modal.component';

interface Line {
  kind: 'hr' | 'head' | 'bullet' | 'br' | 'text';
  text: string;
}

/** Mostra toast, modale di avviso e modale di conferma gestiti dai servizi */
@Component({
  selector: 'app-feedback-host',
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .detail-box {
      margin-top: 12px;
      padding: 10px;
      background: rgba(99, 102, 241, 0.1);
      border-radius: 6px;
    }
    .warn-box {
      margin-top: 12px;
      padding: 14px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 12px;
      color: #b91c1c;
      font-weight: 600;
    }
    .alert-lines {
      max-height: 55vh;
      overflow-y: auto;
      text-align: left;
    }
  `,
  template: `
    <!-- Toast -->
    <div class="notification-container">
      @for (t of notify.toasts(); track t.id) {
        <div class="notification notification-{{ t.type }}" [class.show]="t.visible">
          <div class="notification-content">
            <div class="notification-message">{{ t.message }}</div>
          </div>
          <button
            type="button"
            class="notification-close"
            (click)="notify.dismiss(t.id)"
            aria-label="Chiudi"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      }
    </div>

    <!-- Conferma -->
    @if (dialog.confirmState(); as c) {
      <app-modal
        [open]="true"
        size="small"
        [title]="c.title || 'Conferma'"
        (closed)="dialog.resolveConfirm(false)"
      >
        <div class="modal-body">
          <div class="confirm-content">
            <div
              class="confirm-icon"
              [style.background]="c.danger ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)'"
              [style.color]="c.danger ? 'var(--danger)' : 'var(--primary)'"
            >
              {{ c.danger ? '🗑️' : '❓' }}
            </div>
            <p>{{ c.message }}</p>
            @if (c.detail) {
              <div class="detail-box">{{ c.detail }}</div>
            }
            @if (c.warning) {
              <div class="warn-box">⚠️ {{ c.warning }}</div>
            }
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="dialog.resolveConfirm(false)">
            <span>Annulla</span>
          </button>
          <button
            type="button"
            class="btn btn-primary"
            [style.background]="c.danger ? 'var(--danger)' : 'var(--primary)'"
            (click)="dialog.resolveConfirm(true)"
          >
            <span>{{ c.confirmLabel || 'Conferma' }}</span>
          </button>
        </div>
      </app-modal>
    }

    <!-- Avviso -->
    @if (dialog.alertState(); as a) {
      <app-modal
        [open]="true"
        size="medium"
        [title]="a.title"
        [closeOnBackdrop]="true"
        (closed)="dialog.closeAlert()"
      >
        <div class="modal-body">
          <div class="alert-content">
            <div class="alert-icon" [class]="'alert-icon ' + a.type">
              @switch (a.type) {
                @case ('success') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                }
                @case ('error') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                }
                @case ('warning') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path
                      d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                    />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                }
                @default {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                }
              }
            </div>
            <div class="alert-message-text alert-lines">
              @for (l of lines(); track $index) {
                @switch (l.kind) {
                  @case ('hr') {
                    <hr style="margin: 8px 0; border: none; border-top: 1px solid var(--border)" />
                  }
                  @case ('head') {
                    <div style="margin: 8px 0; font-weight: 600">{{ l.text }}</div>
                  }
                  @case ('bullet') {
                    <div style="margin: 4px 0; padding-left: 16px">{{ l.text }}</div>
                  }
                  @case ('br') {
                    <br />
                  }
                  @default {
                    <div style="margin: 4px 0">{{ l.text }}</div>
                  }
                }
              }
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" (click)="dialog.closeAlert()">
            <span>OK</span>
          </button>
        </div>
      </app-modal>
    }
  `,
})
export class FeedbackHostComponent {
  protected readonly dialog = inject(DialogService);
  protected readonly notify = inject(NotificationService);

  protected readonly lines = computed<Line[]>(() => {
    const msg = this.dialog.alertState()?.message ?? '';
    return msg.split('\n').map((raw): Line => {
      const t = raw.trim();
      if (t.startsWith('━━')) return { kind: 'hr', text: '' };
      if (!t) return { kind: 'br', text: '' };
      if (/^(✅|⚠️|❌|📊)/u.test(t)) return { kind: 'head', text: raw };
      if (/^[•-]/.test(t)) return { kind: 'bullet', text: raw };
      return { kind: 'text', text: raw };
    });
  });
}
