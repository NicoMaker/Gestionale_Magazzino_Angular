import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../core/dialog.service';
import { MarcheService } from '../../core/marche.service';
import { Prodotto } from '../../core/models';
import { NotificationService } from '../../core/notification.service';
import { persistedSignal } from '../../core/persisted';
import { ProdottiService } from '../../core/prodotti.service';
import { apiErrorMessage, formatQuantity, matchesAny } from '../../core/utils';
import { ModalComponent } from '../../shared/modal.component';
import { SearchSelectComponent, SelectOption } from '../../shared/search-select.component';

@Component({
  selector: 'app-prodotti',
  imports: [FormsModule, ModalComponent, SearchSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="content-section active">
      <div class="section-header">
        <div>
          <h1>Gestione Prodotti</h1>
          <p>Visualizza e gestisci i prodotti del magazzino</p>
        </div>
        <div class="filter-controls">
          <input
            type="text"
            class="filter-input"
            placeholder="Cerca prodotto per codice,descrizione,marca..."
            [ngModel]="filtro()"
            (ngModelChange)="filtro.set($event)"
          />
          <button type="button" class="btn btn-primary" (click)="openModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Nuovo Prodotto</span>
          </button>
        </div>
      </div>

      <div class="card">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Codice/Telaio Prodotto</th>
                <th>Marca</th>
                <th>Giacenza (pz/l)</th>
                <th>Descrizione</th>
                <th class="text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              @if (svc.loading() && !svc.prodotti().length) {
                <tr>
                  <td colspan="5" class="text-center"><span>Caricamento...</span></td>
                </tr>
              }
              @for (p of lista(); track p.id) {
                <tr>
                  <td>
                    <strong>{{ p.nome }}</strong>
                  </td>
                  <td>
                    <span class="badge badge-marca">{{
                      p.marca_nome ? p.marca_nome.toUpperCase() : 'N/A'
                    }}</span>
                  </td>
                  <td>
                    <span [class]="!p.giacenza ? 'badge-giacenza-zero' : 'badge-giacenza'">{{
                      qty(p.giacenza)
                    }}</span>
                  </td>
                  <td>{{ p.descrizione || '-' }}</td>
                  <td class="text-right">
                    <button
                      type="button"
                      class="btn-icon btn-modifica"
                      title="Modifica"
                      (click)="openModal(p)"
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
                      (click)="elimina(p)"
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
                    <td colspan="5" class="text-center">
                      <div style="padding: 40px 20px; color: var(--text-secondary)">
                        <p style="font-size: 16px; font-weight: 600; margin-bottom: 8px">
                          Nessun prodotto presente
                        </p>
                        <p style="font-size: 14px">Clicca su "Nuovo Prodotto" per iniziare</p>
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
      [title]="editing() ? 'Modifica Prodotto' : 'Nuovo Prodotto'"
      (closed)="modalOpen.set(false)"
    >
      <form (ngSubmit)="salva()">
        <div class="modal-body">
          <div class="form-group">
            <label for="prodottoNome">Codice Telaio/Prodotto *</label>
            <input
              type="text"
              id="prodottoNome"
              name="nome"
              required
              placeholder="es. Olio motore, Filtro aria, Candele..."
              [ngModel]="nome()"
              (ngModelChange)="nome.set($event)"
            />
          </div>

          <div class="form-group">
            <label for="prodottoMarcaSearch">Marca *</label>
            <app-search-select
              inputId="prodottoMarcaSearch"
              placeholder="Cerca Marca (Nome)"
              [options]="marcheOptions()"
              [(value)]="marcaId"
            />
          </div>

          <div class="form-group">
            <label for="prodottoDescrizione">Descrizione</label>
            <textarea
              id="prodottoDescrizione"
              name="descrizione"
              rows="3"
              placeholder="Inserisci una descrizione dettagliata del prodotto..."
              [ngModel]="descrizione()"
              (ngModelChange)="descrizione.set($event)"
            ></textarea>
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
export class ProdottiComponent {
  protected readonly svc = inject(ProdottiService);
  private readonly marcheSvc = inject(MarcheService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(NotificationService);

  protected readonly qty = formatQuantity;
  protected readonly filtro = persistedSignal('search_prodotti');
  protected readonly lista = computed(() =>
    this.svc
      .prodotti()
      .filter((p) => matchesAny(this.filtro(), p.nome, p.marca_nome, p.descrizione)),
  );
  protected readonly marcheOptions = computed<SelectOption[]>(() =>
    this.marcheSvc.marche().map((m) => ({ id: m.id, label: m.nome })),
  );

  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<Prodotto | null>(null);
  protected readonly nome = signal('');
  protected readonly descrizione = signal('');
  protected readonly marcaId = signal<number | null>(null);
  protected readonly saving = signal(false);

  constructor() {
    void this.svc.load().catch((e) => this.dialog.error(apiErrorMessage(e)));
    void this.marcheSvc.load().catch(() => undefined);
  }

  protected openModal(p?: Prodotto): void {
    this.editing.set(p ?? null);
    this.nome.set(p?.nome ?? '');
    this.descrizione.set(p?.descrizione ?? '');
    this.marcaId.set(p?.marca_id ?? null);
    this.modalOpen.set(true);
  }

  protected async salva(): Promise<void> {
    const nome = this.nome().trim();
    if (!nome) return this.dialog.warning('⚠️ Il nome del prodotto è obbligatorio!');
    if (this.marcaId() === null) return this.dialog.warning('⚠️ Seleziona una marca dalla lista!');

    const payload = {
      nome,
      marca_id: this.marcaId(),
      descrizione: this.descrizione().trim() || null,
    };
    this.saving.set(true);
    try {
      const edit = this.editing();
      if (edit) await this.svc.update(edit.id, payload);
      else await this.svc.create(payload);
      this.toast.success(edit ? 'Prodotto aggiornato!' : 'Prodotto creato!');
      this.modalOpen.set(false);
    } catch (e) {
      this.dialog.error(apiErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }

  protected async elimina(p: Prodotto): Promise<void> {
    const ok = await this.dialog.confirm({
      title: 'Elimina Prodotto',
      message: 'Sei sicuro di voler eliminare questo prodotto?',
      detail: p.nome,
      warning:
        p.giacenza > 0
          ? `Giacenza residua: ${formatQuantity(p.giacenza)} — il prodotto non può essere eliminato.`
          : undefined,
      danger: true,
      confirmLabel: 'Elimina',
    });
    if (!ok) return;
    try {
      await this.svc.remove(p.id);
      this.dialog.success('Prodotto eliminato con successo!');
    } catch (e) {
      this.dialog.error(apiErrorMessage(e));
    }
  }
}
