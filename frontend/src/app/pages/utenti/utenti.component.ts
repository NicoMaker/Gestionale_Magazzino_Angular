import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { DialogService } from '../../core/dialog.service';
import { Utente } from '../../core/models';
import { NotificationService } from '../../core/notification.service';
import { persistedSignal } from '../../core/persisted';
import { UtentiService } from '../../core/utenti.service';
import { apiErrorMessage, matchesAny } from '../../core/utils';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-utenti',
  imports: [FormsModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="content-section active">
      <div class="section-header">
        <div>
          <h1>Gestione Utenti</h1>
          <p>Crea e gestisci gli utenti del sistema</p>
        </div>
        <div class="filter-controls">
          <div class="search-wrapper">
            <input
              type="text"
              class="filter-input"
              placeholder="Cerca utente..."
              [ngModel]="filtro()"
              (ngModelChange)="filtro.set($event)"
            />
          </div>
          <button type="button" class="btn btn-primary" (click)="openModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Nuovo Utente</span>
          </button>
        </div>
      </div>

      <div class="card">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th class="text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              @if (svc.loading() && !svc.utenti().length) {
                <tr>
                  <td colspan="2" class="text-center"><span>Caricamento...</span></td>
                </tr>
              }
              @for (u of lista(); track u.id) {
                <tr>
                  <td>
                    <strong>{{ u.username }}</strong>
                    @if (u.username === auth.username()) {
                      <span class="badge badge-success" style="margin-left: 8px">TU</span>
                    }
                  </td>
                  <td class="text-right">
                    <button
                      type="button"
                      class="btn-icon btn-modifica"
                      title="Modifica utente"
                      [attr.aria-label]="'Modifica ' + u.username"
                      (click)="openModal(u)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="btn-icon btn-elimina"
                      title="Elimina utente"
                      [attr.aria-label]="'Elimina ' + u.username"
                      (click)="elimina(u)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              } @empty {
                @if (!svc.loading()) {
                  <tr>
                    <td colspan="2" class="text-center">
                      <div style="padding: 40px 20px; color: var(--text-secondary)">
                        <p style="font-size: 16px; font-weight: 600; margin-bottom: 8px">Nessun utente trovato</p>
                        <p style="font-size: 14px">
                          {{ filtro() ? 'Prova a modificare il termine di ricerca' : 'Clicca su Nuovo Utente per iniziare' }}
                        </p>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
      <br /><br />
    </section>

    <app-modal [open]="modalOpen()" [title]="editing() ? 'Modifica Utente' : 'Nuovo Utente'" (closed)="modalOpen.set(false)">
      <form (ngSubmit)="salva()" autocomplete="off">
        <div class="modal-body">
          <div class="form-group">
            <label for="userUsername">Username *</label>
            <input
              type="text"
              id="userUsername"
              name="username"
              required
              placeholder="es. admin, utente1..."
              [ngModel]="username()"
              (ngModelChange)="username.set($event)"
            />
          </div>
          <div class="form-group">
            <label for="userPassword">Password {{ editing() ? '' : '*' }}</label>
            <div class="input-container">
              <input
                [type]="showPassword() ? 'text' : 'password'"
                id="userPassword"
                name="password"
                [placeholder]="editing() ? 'Lascia vuoto per non modificare' : 'Min. 8 caratteri, maiuscola, minuscola, numero'"
                autocomplete="new-password"
                [ngModel]="password()"
                (ngModelChange)="password.set($event)"
              />
              <svg
                class="toggle-password"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                (click)="showPassword.set(!showPassword())"
              >
                @if (showPassword()) {
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.08 2.58" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <circle cx="12" cy="12" r="3" />
                } @else {
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                }
              </svg>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="modalOpen.set(false)"><span>Annulla</span></button>
          <button type="submit" class="btn btn-primary" [disabled]="saving()"><span>Salva</span></button>
        </div>
      </form>
    </app-modal>
  `,
})
export class UtentiComponent {
  protected readonly svc = inject(UtentiService);
  protected readonly auth = inject(AuthService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(NotificationService);

  protected readonly filtro = persistedSignal('search_utenti');
  protected readonly lista = computed(() => this.svc.utenti().filter((u) => matchesAny(this.filtro(), u.username)));

  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<Utente | null>(null);
  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly showPassword = signal(false);
  protected readonly saving = signal(false);

  constructor() {
    void this.svc.load().catch((e) => this.dialog.error(apiErrorMessage(e)));
  }

  protected openModal(u?: Utente): void {
    this.editing.set(u ?? null);
    this.username.set(u?.username ?? '');
    this.password.set('');
    this.showPassword.set(false);
    this.modalOpen.set(true);
  }

  protected async salva(): Promise<void> {
    const username = this.username().trim();
    const password = this.password();
    const edit = this.editing();
    if (!username) return this.dialog.warning('Lo username è obbligatorio!');
    if (!edit && !password) return this.dialog.warning('La password è obbligatoria per un nuovo utente!');

    this.saving.set(true);
    try {
      if (edit) {
        const res = await this.svc.update(edit.id, {
          username,
          ...(password ? { password } : {}),
          current_user: this.auth.username(),
        });
        this.modalOpen.set(false);
        if (res.username_modificato || res.password_modificata) {
          this.auth.forceLogout("Le tue credenziali sono cambiate. Effettua di nuovo l'accesso.");
          return;
        }
        this.toast.success('Utente aggiornato!');
      } else {
        await this.svc.create(username, password);
        this.modalOpen.set(false);
        this.toast.success('Utente creato!');
      }
      await this.svc.load();
    } catch (e) {
      this.dialog.error(apiErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }

  protected async elimina(u: Utente): Promise<void> {
    const ok = await this.dialog.confirm({
      title: 'Elimina Utente',
      message: 'Sei sicuro di voler eliminare questo utente?',
      detail: u.username,
      danger: true,
      confirmLabel: 'Elimina',
    });
    if (!ok) return;
    try {
      const res = await this.svc.remove(u.id, this.auth.username() ?? '');
      if (res.utente_eliminato) {
        this.auth.forceLogout('Hai eliminato il tuo account. Verrai disconnesso e dovrai effettuare di nuovo il login.');
        return;
      }
      this.toast.success('Utente eliminato con successo!');
      await this.svc.load();
    } catch (e) {
      this.dialog.error(apiErrorMessage(e));
    }
  }
}
