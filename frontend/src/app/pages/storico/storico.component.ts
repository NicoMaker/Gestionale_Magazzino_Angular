import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../core/dialog.service';
import { MagazzinoService } from '../../core/magazzino.service';
import { RigaGiacenza } from '../../core/models';
import { persistedSignal } from '../../core/persisted';
import { PrintService } from '../../core/print.service';
import { apiErrorMessage, formatCurrency, matchesAny } from '../../core/utils';
import { GiacenzaTableComponent } from '../../shared/giacenza-table.component';

@Component({
  selector: 'app-storico',
  imports: [FormsModule, GiacenzaTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="content-section active">
      <div class="section-header">
        <div>
          <h1>Storico Magazzino</h1>
          <p>Visualizza giacenze a una data specifica</p>
        </div>
        <div class="date-filter">
          <input type="date" class="input-date" [ngModel]="data()" (ngModelChange)="cambiaData($event)" />
          <div class="search-wrapper">
            <input
              type="text"
              class="filter-input"
              placeholder="Cerca prodotto per nome,marca,descrizione..."
              [ngModel]="filtro()"
              (ngModelChange)="filtro.set($event)"
            />
          </div>
          <button type="button" class="btn btn-reset-filtri" title="Cancella data" (click)="cambiaData('')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-4.5" />
            </svg>
            <span>Reset Data</span>
          </button>
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
            <p class="stat-label">Valore Storico</p>
            <p class="stat-value">{{ totale() }}</p>
          </div>
        </div>
      </div>

      <app-giacenza-table
        [righe]="lista()"
        [emptyTitle]="data() ? 'Nessun dato disponibile' : 'Seleziona una data'"
        [emptyText]="
          data()
            ? 'Non ci sono prodotti in magazzino per questa data'
            : 'Scegli una data dal calendario per visualizzare lo storico'
        "
      />
      <br /><br />
    </section>
  `,
})
export class StoricoComponent {
  private readonly svc = inject(MagazzinoService);
  private readonly dialog = inject(DialogService);
  private readonly print = inject(PrintService);

  protected readonly data = signal('');
  protected readonly righe = signal<RigaGiacenza[]>([]);
  protected readonly filtro = persistedSignal('search_storico');

  protected readonly lista = computed(() =>
    this.righe().filter((r) => matchesAny(this.filtro(), r.nome, r.marca_nome, r.descrizione)),
  );
  protected readonly totale = computed(() =>
    formatCurrency(this.lista().reduce((s, r) => s + Number(r.valore_totale || 0), 0)),
  );

  protected async cambiaData(value: string): Promise<void> {
    this.data.set(value);
    if (!value) {
      this.righe.set([]);
      return;
    }
    try {
      const res = await this.svc.storico(value);
      // ignora risposte superate da una data più recente
      if (this.data() === value) this.righe.set(res);
    } catch (e) {
      this.dialog.error(apiErrorMessage(e, 'Errore nel caricamento dello storico'));
    }
  }

  protected stampa(): void {
    if (!this.print.printGiacenze('storico', this.lista(), this.data())) {
      this.dialog.warning('Nessun prodotto da stampare');
    }
  }
}
