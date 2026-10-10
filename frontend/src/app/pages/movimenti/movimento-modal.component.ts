import {
  ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DecimalInputDirective } from '../../shared/decimal-input.directive';
import { ModalComponent } from '../../shared/modal.component';
import { SearchSelectComponent, SelectOption } from '../../shared/search-select.component';
import { DialogService } from '../../core/dialog.service';
import { Movimento, TipoMovimento } from '../../core/models';
import { MovimentiService, MovimentoDraft } from '../../core/movimenti.service';
import { NotificationService } from '../../core/notification.service';
import { ProdottiService } from '../../core/prodotti.service';
import { apiErrorMessage, formatQuantity, parseDecimal, round2, todayISO } from '../../core/utils';

/** Modal per registrare / modificare un carico o uno scarico */
@Component({
  selector: 'app-movimento-modal',
  imports: [ReactiveFormsModule, ModalComponent, SearchSelectComponent, DecimalInputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="open()" size="large" [title]="titolo()" (closed)="closed.emit()">
      <form [formGroup]="form" (ngSubmit)="salva()">
        <div class="modal-body">
          <div class="form-group">
            <label>Codice Telaio/Prodotto *</label>
            <app-search-select
              inputId="movimentoProdottoSearch"
              placeholder="Cerca Prodotto (Nome, Marca, Descrizione)"
              [options]="opzioniProdotti()"
              [disabled]="!!movimento()"
              [(value)]="prodottoId"
            />
            <div class="form-group">
              <label for="movimentoTipo">Tipo Movimento</label>
              <select id="movimentoTipo" class="form-input" formControlName="tipo">
                <option value="carico">Carico</option>
                <option value="scarico">Scarico</option>
              </select>
            </div>
          </div>

          @if (prodotto(); as p) {
            <div class="stock-info" style="display: block">
              <strong>Giacenza attuale:</strong>
              <span>{{ p.nome }}{{ p.marca_nome ? ' (' + p.marca_nome + ')' : '' }} - Giacenza: {{ qty(p.giacenza) }} PZ/L</span>
            </div>
          }

          <div class="form-row">
            <div class="form-group">
              <label for="movimentoQuantita">Quantità *</label>
              <input
                type="text"
                id="movimentoQuantita"
                inputmode="decimal"
                appDecimal
                formControlName="quantita"
                placeholder="es. 10"
              />
            </div>
            @if (isCarico()) {
              <div class="form-group">
                <label for="movimentoPrezzo">Prezzo Unitario *</label>
                <div class="input-with-currency">
                  <input
                    type="text"
                    id="movimentoPrezzo"
                    inputmode="decimal"
                    appDecimal
                    formControlName="prezzo"
                    placeholder="es. 25,50"
                  />
                  <span class="currency-symbol">€</span>
                </div>
              </div>
            }
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="movimentoData">Data Movimento *</label>
              <input type="date" id="movimentoData" formControlName="data" />
            </div>
            @if (isCarico()) {
              <div class="form-group">
                <label for="movimentoFattura">Documento/Fattura *</label>
                <input type="text" id="movimentoFattura" formControlName="fattura" placeholder="es. FT/2024/001" />
              </div>
            }
          </div>

          @if (isCarico()) {
            <div class="form-group">
              <label for="movimentoFornitore">Fornitore *</label>
              <input type="text" id="movimentoFornitore" formControlName="fornitore" placeholder="es. Fornitore SRL" />
            </div>
          }
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="closed.emit()"><span>Annulla</span></button>
          <button type="submit" class="btn btn-primary" [disabled]="saving()"><span>Salva</span></button>
        </div>
      </form>
    </app-modal>
  `,
})
export class MovimentoModalComponent {
  private readonly prodottiSvc = inject(ProdottiService);
  private readonly movimentiSvc = inject(MovimentiService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(NotificationService);

  readonly open = input(false);
  /** Movimento da modificare (null = nuovo) */
  readonly movimento = input<Movimento | null>(null);
  /** Valori iniziali per un nuovo movimento (es. riordino) */
  readonly draft = input<MovimentoDraft | null>(null);
  readonly closed = output<void>();
  readonly saved = output<void>();

  protected readonly qty = formatQuantity;
  protected readonly prodottoId = signal<number | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = new FormGroup({
    tipo: new FormControl<TipoMovimento>('carico', { nonNullable: true }),
    quantita: new FormControl('', { nonNullable: true }),
    prezzo: new FormControl('', { nonNullable: true }),
    data: new FormControl(todayISO(), { nonNullable: true }),
    fattura: new FormControl('', { nonNullable: true }),
    fornitore: new FormControl('', { nonNullable: true }),
  });

  private readonly tipo = signal<TipoMovimento>('carico');
  protected readonly isCarico = computed(() => this.tipo() === 'carico');

  protected readonly prodotto = computed(() => this.prodottiSvc.byId(this.prodottoId()));
  protected readonly opzioniProdotti = computed<SelectOption[]>(() =>
    this.prodottiSvc.prodotti().map((p) => ({ id: p.id, label: p.nome, meta: p.marca_nome, extra: p.descrizione })),
  );
  protected readonly titolo = computed(() =>
    this.movimento() ? 'Modifica Movimento' : this.draft()?.riordino ? 'Nuovo Movimento (Riordino)' : 'Nuovo Movimento',
  );

  constructor() {
    this.form.controls.tipo.valueChanges.subscribe((t) => this.tipo.set(t));

    effect(() => {
      if (this.open()) untracked(() => this.init());
    });
  }

  private init(): void {
    void this.prodottiSvc.ensureLoaded();
    const m = this.movimento();
    const d = this.draft();

    if (m) {
      this.prodottoId.set(m.prodotto_id);
      this.form.reset({
        tipo: m.tipo,
        quantita: String(round2(Number(m.quantita))).replace('.', ','),
        prezzo: m.prezzo ? String(round2(Number(m.prezzo))).replace('.', ',') : '',
        data: m.data_movimento.split('T')[0],
        fattura: m.tipo === 'carico' ? (m.fattura_doc ?? '') : '',
        fornitore: m.tipo === 'carico' ? (m.fornitore_cliente_id ?? '') : '',
      });
      this.form.controls.tipo.disable();
    } else {
      this.form.controls.tipo.enable();
      this.prodottoId.set(d?.prodotto_id ?? null);
      this.form.reset({
        tipo: d?.tipo ?? 'carico',
        quantita: '',
        prezzo: '',
        data: todayISO(),
        fattura: '',
        fornitore: d?.fornitore ?? '',
      });
    }
    this.tipo.set(this.form.controls.tipo.value);
  }

  protected async salva(): Promise<void> {
    const v = this.form.getRawValue();
    const quantita = parseDecimal(v.quantita);
    const prezzo = parseDecimal(v.prezzo);
    const prodotto_id = this.prodottoId();

    if (!prodotto_id || !v.data || !quantita) {
      return this.dialog.warning('Compila tutti i campi obbligatori! (prodotto, quantità, data)');
    }
    if (quantita <= 0) return this.dialog.warning('La quantità deve essere maggiore di 0!');

    const carico = v.tipo === 'carico';
    const fattura = v.fattura.trim();
    const fornitore = v.fornitore.trim();
    if (carico) {
      if (!prezzo || prezzo <= 0) return this.dialog.warning('Il prezzo deve essere maggiore di 0 per i carichi!');
      if (!fattura || !fornitore) return this.dialog.warning('Documento e Fornitore sono obbligatori per i carichi!');
    }

    const payload = {
      prodotto_id,
      tipo: v.tipo,
      quantita: round2(quantita),
      prezzo: carico ? round2(prezzo) : null,
      data_movimento: v.data,
      fattura_doc: carico ? fattura : null,
      fornitore: carico ? fornitore : null,
    };

    this.saving.set(true);
    try {
      const m = this.movimento();
      if (m) await this.movimentiSvc.update(m.id, payload);
      else await this.movimentiSvc.create(payload);
      this.toast.success(m ? 'Movimento aggiornato!' : 'Movimento registrato!');
      this.saved.emit();
      this.closed.emit();
    } catch (e) {
      this.dialog.error(apiErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }
}
