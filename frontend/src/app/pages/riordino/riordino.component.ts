import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DialogService } from '../../core/dialog.service';
import { MovimentiService } from '../../core/movimenti.service';
import { persistedSignal } from '../../core/persisted';
import { ProdottiService } from '../../core/prodotti.service';
import { Prodotto } from '../../core/models';
import { apiErrorMessage, matchesAny } from '../../core/utils';

@Component({
  selector: 'app-riordino',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="content-section active">
      <div class="section-header">
        <div>
          <h1>Riordino Prodotti</h1>
          <p>Prodotti con giacenza esaurita — crea subito un nuovo carico</p>
        </div>
        <div class="filter-controls">
          <input
            type="text"
            class="filter-input"
            placeholder="Cerca prodotto per nome, marca, descrizione..."
            [ngModel]="filtro()"
            (ngModelChange)="filtro.set($event)"
          />
        </div>
      </div>

      @if (svc.esauriti().length) {
        <div class="riordino-alert-banner" style="display: flex">
          <div class="riordino-banner-left">
            <div class="riordino-banner-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <strong class="riordino-banner-title">Prodotti Esauriti — Riordino Necessario</strong>
              <p class="riordino-banner-sub">
                I seguenti prodotti hanno giacenza a <strong>zero</strong>. Clicca
                <span class="riordino-badge-inline">🛒 Riordina</span> per creare subito un nuovo carico.
              </p>
            </div>
          </div>
        </div>
      }

      <div class="riordino-grid">
        @if (svc.loading() && !svc.prodotti().length) {
          <div class="riordino-loading">
            <div class="riordino-loading-spinner"></div>
            <span>Caricamento prodotti...</span>
          </div>
        } @else if (!svc.esauriti().length) {
          <div class="riordino-empty">
            <div class="riordino-empty-icon riordino-empty-icon--green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <p class="riordino-empty-title">Magazzino tutto a posto!</p>
            <p class="riordino-empty-sub">Nessun prodotto con giacenza esaurita al momento.</p>
          </div>
        } @else if (!lista().length) {
          <div class="riordino-empty">
            <div class="riordino-empty-icon riordino-empty-icon--blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <p class="riordino-empty-title">Nessun risultato</p>
            <p class="riordino-empty-sub">Nessun prodotto corrisponde alla ricerca.<br />Prova con un termine diverso.</p>
          </div>
        } @else {
          @for (p of lista(); track p.id) {
            <div class="riordino-card">
              <div class="riordino-card-info">
                <div class="riordino-card-nome" [title]="p.nome">{{ p.nome }}</div>
                <div class="riordino-card-meta">
                  @if (p.marca_nome) {
                    <span class="riordino-card-marca">{{ p.marca_nome }}</span>
                  }
                  <span class="riordino-card-zero">Giacenza: 0</span>
                </div>
                @if (p.descrizione) {
                  <div class="riordino-card-descr">
                    {{ p.descrizione.length > 55 ? p.descrizione.slice(0, 55) + '…' : p.descrizione }}
                  </div>
                }
              </div>
              <button type="button" class="btn-riordina-card" [title]="'Riordina ' + p.nome" (click)="riordina(p)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                Riordina
              </button>
            </div>
          }
        }
      </div>
      <br /><br />
    </section>
  `,
})
export class RiordinoComponent {
  protected readonly svc = inject(ProdottiService);
  private readonly movimenti = inject(MovimentiService);
  private readonly router = inject(Router);
  private readonly dialog = inject(DialogService);

  protected readonly filtro = persistedSignal('search_riordino');
  protected readonly lista = computed(() =>
    this.svc.esauriti().filter((p) => matchesAny(this.filtro(), p.nome, p.marca_nome, p.descrizione)),
  );

  constructor() {
    // Dati sempre freschi dal server quando si apre la sezione
    void this.svc.load().catch((e) => this.dialog.error(apiErrorMessage(e)));
  }

  /** Apre Movimenti con il modal "Nuovo carico (Riordino)" già compilato */
  protected riordina(p: Prodotto): void {
    this.movimenti.pendingDraft.set({ prodotto_id: p.id, tipo: 'carico', riordino: true });
    void this.router.navigate(['/movimenti']);
  }
}
