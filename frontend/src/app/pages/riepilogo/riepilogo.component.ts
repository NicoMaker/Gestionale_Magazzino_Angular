import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../core/dialog.service';
import { MagazzinoService } from '../../core/magazzino.service';
import { persistedSignal } from '../../core/persisted';
import { PrintService } from '../../core/print.service';
import { apiErrorMessage, formatCurrency, matchesAny } from '../../core/utils';
import { GiacenzaTableComponent } from '../../shared/giacenza-table.component';

@Component({
  selector: 'app-riepilogo',
  imports: [FormsModule, GiacenzaTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="content-section active">
      <div class="section-header">
        <div>
          <h1>Riepilogo Magazzino</h1>
          <p>Giacenze e valorizzazione FIFO</p>
        </div>
        <div class="filter-controls">
          <input
            type="text"
            class="filter-input"
            placeholder="Cerca prodotto per nome,marca,descrizione..."
            [ngModel]="filtro()"
            (ngModelChange)="filtro.set($event)"
          />
          <button type="button" class="btn btn-secondary" (click)="stampa()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Stampa</span>
          </button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div>
            <p class="stat-label">Valore Totale Magazzino</p>
            <p class="stat-value">{{ totale() }}</p>
          </div>
        </div>
      </div>

      <app-giacenza-table [righe]="lista()" />
      <br /><br />
    </section>
  `,
})
export class RiepilogoComponent {
  private readonly svc = inject(MagazzinoService);
  private readonly dialog = inject(DialogService);
  private readonly print = inject(PrintService);

  protected readonly filtro = persistedSignal('search_riepilogo');
  protected readonly lista = computed(() =>
    this.svc.riepilogo().filter((r) => matchesAny(this.filtro(), r.nome, r.marca_nome, r.descrizione)),
  );
  protected readonly totale = computed(() =>
    formatCurrency(this.lista().reduce((s, r) => s + Number(r.valore_totale || 0), 0)),
  );

  constructor() {
    void this.svc.loadRiepilogo().catch((e) => this.dialog.error(apiErrorMessage(e)));
  }

  protected stampa(): void {
    if (!this.print.printGiacenze('riepilogo', this.lista())) this.dialog.warning('Nessun prodotto da stampare');
  }
}
