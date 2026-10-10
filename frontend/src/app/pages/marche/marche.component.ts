import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../core/dialog.service';
import { Marca } from '../../core/models';
import { MarcheService } from '../../core/marche.service';
import { NotificationService } from '../../core/notification.service';
import { persistedSignal } from '../../core/persisted';
import { apiErrorMessage, matchesAny } from '../../core/utils';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-marche',
  imports: [FormsModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="content-section active">
      <div class="section-header">
        <div>
          <h1>Gestione Marche</h1>
          <p>Crea e gestisci le marche dei prodotti</p>
        </div>
        <div class="filter-controls">
          <div class="search-wrapper">
            <input
              type="text"
              class="filter-input"
              placeholder="Cerca marca..."
              [ngModel]="filtro()"
              (ngModelChange)="filtro.set($event)"
            />
          </div>
          <button type="button" class="btn btn-primary" (click)="openModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Nuova Marca</span>
          </button>
        </div>
      </div>

      <div class="card">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Nome Marca</th>
                <th style="text-align: center">Prodotti Relazionati</th>
                <th class="text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              @if (svc.loading() && !svc.marche().length) {
                <tr>
                  <td colspan="3" class="text-center"><span>Caricamento...</span></td>
                </tr>
              }
              @for (m of lista(); track m.id) {
                <tr>
                  <td>
                    <strong style="font-size: 15px">{{ m.nome }}</strong>
                  </td>
                  <td class="text-center-badge">
                    <span
                      class="prodotti-badge"
                      [class.has-products]="m.prodotti_count > 0"
                      [class.empty]="!m.prodotti_count"
                    >
                      {{ m.prodotti_count || 0 }}
                    </span>
                  </td>
                  <td class="text-right">
                    <button
                      type="button"
                      class="btn-icon btn-modifica"
                      title="Modifica"
                      (click)="openModal(m)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="btn-icon btn-elimina"
                      title="Elimina"
                      (click)="elimina(m)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path
                          d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              } @empty {
                @if (!svc.loading()) {
                  <tr>
                    <td colspan="3" class="text-center">
                      <div style="padding: 40px 20px; color: var(--text-secondary)">
                        <p style="font-size: 16px; font-weight: 600; margin-bottom: 8px">
                          Nessuna marca presente
                        </p>
                        <p style="font-size: 14px">Clicca su "Nuova Marca" per iniziare</p>
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

    <app-modal
      [open]="modalOpen()"
      [title]="editing() ? 'Modifica Marca' : 'Nuova Marca'"
      (closed)="modalOpen.set(false)"
    >
      <form (ngSubmit)="salva()">
        <div class="modal-body">
          <div class="form-group">
            <label for="marcaNome">Nome Marca *</label>
            <input
              type="text"
              id="marcaNome"
              name="nome"
              required
              placeholder="es. Ducati, Honda, Yamaha..."
              [ngModel]="nome()"
              (ngModelChange)="nome.set($event)"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="modalOpen.set(false)">
            <span>Annulla</span>
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            <span>Salva</span>
          </button>
        </div>
      </form>
    </app-modal>
  `,
})
export class MarcheComponent {
  protected readonly svc = inject(MarcheService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(NotificationService);

  protected readonly filtro = persistedSignal('search_marche');
  protected readonly lista = computed(() =>
    this.svc.marche().filter((m) => matchesAny(this.filtro(), m.nome)),
  );

  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<Marca | null>(null);
  protected readonly nome = signal('');
  protected readonly saving = signal(false);

  constructor() {
    void this.svc.load().catch((e) => this.dialog.error(apiErrorMessage(e)));
  }

  protected openModal(m?: Marca): void {
    this.editing.set(m ?? null);
    this.nome.set(m?.nome ?? '');
    this.modalOpen.set(true);
  }

  protected async salva(): Promise<void> {
    const nome = this.nome().trim();
    if (!nome) return this.dialog.warning('Il nome della marca è obbligatorio!');
    this.saving.set(true);
    try {
      const edit = this.editing();
      if (edit) await this.svc.update(edit.id, nome);
      else await this.svc.create(nome);
      this.toast.success(edit ? 'Marca aggiornata!' : 'Marca creata!');
      this.modalOpen.set(false);
    } catch (e) {
      this.dialog.error(apiErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }

  protected async elimina(m: Marca): Promise<void> {
    const ok = await this.dialog.confirm({
      title: 'Elimina Marca',
      message: `Sei sicuro di voler eliminare la marca "${m.nome}"?`,
      warning:
        m.prodotti_count > 0
          ? `Ci sono ${m.prodotti_count} prodotti collegati: l'eliminazione non è consentita.`
          : undefined,
      danger: true,
      confirmLabel: 'Elimina',
    });
    if (!ok) return;
    try {
      await this.svc.remove(m.id);
      this.dialog.success(`Marca "${m.nome}" eliminata.`);
    } catch (e) {
      this.dialog.error(apiErrorMessage(e));
    }
  }
}
