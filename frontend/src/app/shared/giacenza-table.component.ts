import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RigaGiacenza } from '../core/models';
import { formatCurrency, formatDateIT, formatQuantity } from '../core/utils';

/** Tabella giacenze con dettaglio dei lotti FIFO (usata da Riepilogo e Storico) */
@Component({
  selector: 'app-giacenza-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Prodotto / Marca</th>
              <th>Descrizione</th>
              <th>Giacenza (pz/l)</th>
              <th>Valore Totale</th>
            </tr>
          </thead>
          <tbody>
            @for (r of righe(); track r.id) {
              <tr class="product-main-row">
                <td>
                  <strong>{{ r.nome }}</strong>
                  @if (r.marca_nome) {
                    <span class="badge-marca">{{ r.marca_nome.toUpperCase() }}</span>
                  }
                </td>
                <td>
                  @if (r.descrizione) {
                    <small>{{ r.descrizione.length > 50 ? r.descrizione.slice(0, 50) + '...' : r.descrizione }}</small>
                  } @else {
                    <span style="color: #999">-</span>
                  }
                </td>
                <td>
                  <span [class]="!r.giacenza ? 'badge-giacenza-zero' : 'badge-giacenza'">{{ qty(r.giacenza) }}</span>
                </td>
                <td>
                  <strong>{{ cur(r.valore_totale) }}</strong>
                </td>
              </tr>
              @if (r.giacenza > 0 && r.lotti.length) {
                <tr class="lotti-row">
                  <td colspan="4" class="lotti-container">
                    <div class="lotti-table-wrapper">
                      <table class="lotti-table">
                        <thead>
                          <tr>
                            <th>Data Carico</th>
                            <th>Quantità (pz/l)</th>
                            <th>Prezzo Unitario</th>
                            <th>Valore</th>
                            <th>Documento/Fattura</th>
                            <th>Fornitore</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (l of r.lotti; track l.id) {
                            <tr>
                              <td>{{ date(l.data_carico) }}</td>
                              <td>
                                <strong>{{ qty(l.quantita_rimanente) }}</strong>
                              </td>
                              <td>{{ cur(l.prezzo) }}</td>
                              <td>
                                <strong>{{ cur(l.quantita_rimanente * l.prezzo) }}</strong>
                              </td>
                              <td>{{ l.fattura_doc || '-' }}</td>
                              <td>{{ l.fornitore || '-' }}</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              }
            } @empty {
              <tr>
                <td colspan="4" class="text-center">
                  <div style="padding: 40px 20px; color: var(--text-secondary)">
                    <p style="font-size: 16px; font-weight: 600; margin-bottom: 8px">{{ emptyTitle() }}</p>
                    <p style="font-size: 14px">{{ emptyText() }}</p>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class GiacenzaTableComponent {
  readonly righe = input.required<RigaGiacenza[]>();
  readonly emptyTitle = input('Nessun prodotto in magazzino');
  readonly emptyText = input('Registra dei movimenti di carico per iniziare');

  protected readonly qty = formatQuantity;
  protected readonly cur = formatCurrency;
  protected readonly date = formatDateIT;
}
