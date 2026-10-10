import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../core/dialog.service';
import { Movimento } from '../../core/models';
import { MovimentiService, MovimentoDraft } from '../../core/movimenti.service';
import { persistedSignal } from '../../core/persisted';
import { ProdottiService } from '../../core/prodotti.service';
import { apiErrorMessage, formatCurrency, formatDateIT, formatQuantity, matchesAny } from '../../core/utils';
import { FatturaPdfModalComponent } from './fattura-pdf-modal.component';
import { ImportPdfModalComponent } from './import-pdf-modal.component';
import { MovimentoModalComponent } from './movimento-modal.component';

@Component({
  selector: 'app-movimenti',
  imports: [FormsModule, MovimentoModalComponent, ImportPdfModalComponent, FatturaPdfModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="content-section active">
      <div class="section-header movimenti-section-header">
        <div>
          <h1>Movimenti di Magazzino</h1>
          <p>Registra carichi e scarichi</p>
        </div>
        <div class="filter-controls movimenti-filter-controls">
          <div class="movimenti-top-row">
            <input
              type="text"
              class="filter-input movimenti-search"
              placeholder="Cerca per prodotto, marca, descrizione..."
              [ngModel]="filtro()"
              (ngModelChange)="filtro.set($event)"
            />
            <div class="movimenti-date-wrap">
              <div class="movimenti-date-field">
                <label class="movimenti-date-label">Data Inizio</label>
                <input type="date" class="filter-input movimenti-date-input" [ngModel]="dal()" (ngModelChange)="setDal($event)" />
              </div>
              <div class="movimenti-date-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="13 6 19 12 13 18" />
                </svg>
              </div>
              <div class="movimenti-date-field">
                <label class="movimenti-date-label">Data Fine</label>
                <input type="date" class="filter-input movimenti-date-input" [min]="dal()" [ngModel]="al()" (ngModelChange)="setAl($event)" />
              </div>
            </div>
          </div>

          <div class="movimenti-btn-row">
            <button type="button" class="btn btn-reset-filtri" title="Cancella date" (click)="dal.set(''); al.set('')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-4.5" />
              </svg>
              <span>Reset Date</span>
            </button>
            <button type="button" class="btn btn-secondary" (click)="importOpen.set(true)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span>Scarica da PDF</span>
            </button>
            <button type="button" class="btn btn-primary" style="background: linear-gradient(135deg, #6366f1, #8b5cf6)" (click)="fatturaOpen.set(true)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              <span>Carica da Fattura PDF</span>
            </button>
            <button type="button" class="btn btn-primary" (click)="apriModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Nuovo Movimento</span>
            </button>
          </div>

          <div class="movimenti-tipo-filter">
            <label class="movimenti-tipo-filter-label">Filtra per Tipo:</label>
            <br />
            <select class="filter-input" [ngModel]="tipo()" (ngModelChange)="tipo.set($event)">
              <option value="tutti">📋 Tutti</option>
              <option value="carico">📥 Carico</option>
              <option value="scarico">📤 Scarico</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Data carico/scarico</th>
                <th>Codice/Telaio Prodotto</th>
                <th>Marca</th>
                <th>Descrizione</th>
                <th>Tipo</th>
                <th>Quantità (pz/l)</th>
                <th>Prezzo Unitario</th>
                <th>Totale</th>
                <th>Documento/Fattura</th>
                <th>Fornitore</th>
                <th class="text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              @if (svc.loading() && !svc.movimenti().length) {
                <tr>
                  <td colspan="11" class="text-center"><span>Caricamento...</span></td>
                </tr>
              }
              @for (m of lista(); track m.id) {
                <tr>
                  <td>{{ data(m.data_movimento) }}</td>
                  <td>
                    <strong>{{ m.prodotto_nome }}</strong>
                  </td>
                  <td>{{ m.marca_nome || '-' }}</td>
                  <td>
                    @if (m.prodotto_descrizione) {
                      <small>{{ m.prodotto_descrizione.length > 30 ? m.prodotto_descrizione.slice(0, 30) + '…' : m.prodotto_descrizione }}</small>
                    } @else {
                      <span style="color: #999">-</span>
                    }
                  </td>
                  <td>
                    <span class="badge" [class.badge-danger]="m.tipo === 'scarico'" [class.badge-success]="m.tipo === 'carico'">{{ m.tipo.toUpperCase() }}</span>
                  </td>
                  <td [class]="m.tipo === 'scarico' ? 'text-red' : 'text-green'">{{ qty(m.quantita) }}</td>
                  <td [class]="m.tipo === 'scarico' ? 'text-red' : 'text-green'">{{ prezzoUnit(m) }}</td>
                  <td [class]="m.tipo === 'scarico' ? 'text-red' : 'text-green'">
                    <strong>{{ cur(abs(m.prezzo_totale_movimento)) }}</strong>
                  </td>
                  <td>{{ m.tipo === 'scarico' ? '' : docName(m.fattura_doc) }}</td>
                  <td>{{ m.tipo === 'scarico' ? '' : m.fornitore_cliente_id || '' }}</td>
                  <td class="text-right">
                    <div class="action-buttons">
                      @if (m.tipo === 'carico') {
                        <button type="button" class="btn-icon btn-riordina" title="Riordina questo carico" (click)="riordina(m)">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="9" cy="21" r="1" />
                            <circle cx="20" cy="21" r="1" />
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                          </svg>
                        </button>
                      }
                      <button type="button" class="btn-icon btn-modifica" title="Modifica" (click)="apriModal(m)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button type="button" class="btn-icon btn-elimina" title="Elimina" (click)="elimina(m)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                @if (!svc.loading()) {
                  <tr>
                    <td colspan="11" class="text-center">
                      <div style="padding: 40px 20px; color: var(--text-secondary)">
                        <p style="font-size: 16px; font-weight: 600; margin-bottom: 8px">Nessun movimento presente</p>
                        <p style="font-size: 14px">Clicca su <strong>Nuovo</strong> per registrare un carico o scarico</p>
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

    <app-movimento-modal
      [open]="modalOpen()"
      [movimento]="editing()"
      [draft]="draft()"
      (closed)="modalOpen.set(false)"
    />
    <app-import-pdf-modal [open]="importOpen()" (closed)="importOpen.set(false)" />
    <app-fattura-pdf-modal [open]="fatturaOpen()" (closed)="fatturaOpen.set(false)" />
  `,
})
export class MovimentiComponent {
  protected readonly svc = inject(MovimentiService);
  private readonly prodotti = inject(ProdottiService);
  private readonly dialog = inject(DialogService);

  protected readonly qty = formatQuantity;
  protected readonly cur = formatCurrency;
  protected readonly data = formatDateIT;

  protected readonly filtro = persistedSignal('search_movimenti');
  protected readonly dal = persistedSignal('search_movimenti_start');
  protected readonly al = persistedSignal('search_movimenti_end');
  protected readonly tipo = persistedSignal('movimenti_tipo_filter', 'tutti');

  protected readonly modalOpen = signal(false);
  protected readonly importOpen = signal(false);
  protected readonly fatturaOpen = signal(false);
  protected readonly editing = signal<Movimento | null>(null);
  protected readonly draft = signal<MovimentoDraft | null>(null);

  protected readonly lista = computed(() => {
    const tipo = this.tipo();
    const dal = this.dal();
    const al = this.al();
    return this.svc.movimenti().filter(
      (m) =>
        (tipo === 'tutti' || m.tipo === tipo) &&
        matchesAny(this.filtro(), m.prodotto_nome, m.marca_nome, m.prodotto_descrizione) &&
        (!dal || m.data_movimento >= dal) &&
        (!al || m.data_movimento <= al),
    );
  });

  constructor() {
    void Promise.all([this.svc.load(), this.prodotti.load()]).catch((e) => this.dialog.error(apiErrorMessage(e)));

    // Arrivo dalla pagina Riordino: apre subito il modal precompilato
    const pending = this.svc.pendingDraft();
    if (pending) {
      this.svc.pendingDraft.set(null);
      this.draft.set(pending);
      this.modalOpen.set(true);
    }
  }

  protected abs = (n: number | null): number => Math.abs(n ?? 0);

  protected prezzoUnit(m: Movimento): string {
    if (m.tipo === 'carico') return formatCurrency(m.prezzo);
    return m.prezzo_unitario_scarico != null ? formatCurrency(m.prezzo_unitario_scarico) : '-';
  }

  protected docName(doc: string | null): string {
    return (doc ?? '').replace(/\.pdf$/i, '');
  }

  /** Data fine non può precedere data inizio (e viceversa) */
  protected setDal(v: string): void {
    this.dal.set(v);
    if (v && this.al() && this.al() < v) this.al.set(v);
  }
  protected setAl(v: string): void {
    this.al.set(v);
    if (v && this.dal() && this.dal() > v) this.dal.set(v);
  }

  protected apriModal(m?: Movimento): void {
    this.editing.set(m ?? null);
    this.draft.set(null);
    this.modalOpen.set(true);
  }

  protected riordina(m: Movimento): void {
    this.editing.set(null);
    this.draft.set({ prodotto_id: m.prodotto_id, tipo: 'carico', riordino: true, fornitore: m.fornitore_cliente_id });
    this.modalOpen.set(true);
  }

  protected async elimina(m: Movimento): Promise<void> {
    const ok = await this.dialog.confirm({
      title: 'Elimina Movimento',
      message: `Sei sicuro di voler eliminare questo movimento di ${m.tipo.toUpperCase()}?`,
      detail: `Prodotto: ${m.prodotto_nome}`,
      danger: true,
      confirmLabel: 'Elimina',
    });
    if (!ok) return;
    try {
      await this.svc.remove(m.id);
      this.dialog.success('Movimento eliminato con successo!');
    } catch (e) {
      this.dialog.error(apiErrorMessage(e));
    }
  }
}
