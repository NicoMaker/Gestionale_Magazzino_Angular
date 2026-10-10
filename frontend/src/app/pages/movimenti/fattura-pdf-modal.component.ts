import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../shared/modal.component';
import { MovimentiService } from '../../core/movimenti.service';
import { PdfService } from '../../core/pdf.service';
import { ProdottiService } from '../../core/prodotti.service';
import { apiErrorMessage, round2, todayISO } from '../../core/utils';

interface Riga {
  nome_pdf: string;
  quantita: number | null;
  prezzo: number | null;
  prodotto_id: number | null;
  includi: boolean;
  stato: 'idle' | 'loading' | 'done';
}

/** Carico di magazzino da fattura / DDT in PDF */
@Component({
  selector: 'app-fattura-pdf-modal',
  imports: [FormsModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="open()" size="xl" title="📄 Carica da Fattura PDF" (closed)="chiudi()">
      <p modal-subtitle style="font-size: 13px; color: #64748b; margin: 4px 0 0">
        Il sistema legge la fattura — clicca <strong>Carica</strong> su ogni riga per salvare il movimento
      </p>
      <div class="modal-body">
        @if (step() === 'upload') {
          <div
            class="cfp-dropzone"
            [class.cfp-drag-over]="drag()"
            (click)="fileInput.click()"
            (dragover)="$event.preventDefault(); drag.set(true)"
            (dragleave)="drag.set(false)"
            (drop)="onDrop($event)"
          >
            <svg style="width: 48px; height: 48px; color: #94a3b8; display: block; margin: 0 auto 14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9" />
              <polyline points="9 15 12 12 15 15" />
              <line x1="12" y1="12" x2="12" y2="21" />
            </svg>
            <p style="font-size: 15px; font-weight: 600; color: #475569; margin: 0 0 6px">
              {{ file() ? '📄 ' + file()!.name : 'Trascina il PDF qui o clicca per sfogliare' }}
            </p>
            <p style="font-size: 12px; color: #94a3b8; margin: 0">Fatture, DDT, bolle, ordini</p>
            <input #fileInput type="file" accept="application/pdf" style="display: none" (change)="onFile($event)" />
          </div>
          <div class="cfp-ai-info">
            <span>
              Verranno estratti <strong>numero documento, fornitore, data, prodotti, quantità e prezzi</strong>. Potrai
              verificare e correggere ogni dato prima di caricare.
            </span>
          </div>
          <div style="text-align: center; margin-top: 24px">
            <button type="button" class="btn btn-primary cfp-btn-main" [disabled]="!file()" (click)="analizza()">
              🔍 Analizza PDF
            </button>
          </div>
        }

        @if (step() === 'loading') {
          <div style="text-align: center; padding: 48px 24px">
            <div class="cfp-spinner"></div>
            <p style="font-size: 15px; font-weight: 600; color: #475569; margin-top: 20px">{{ msg() }}</p>
          </div>
        }

        @if (step() === 'risultati') {
          <div class="cfp-section-title">
            <span class="cfp-step-num">1</span> Dati del documento
            <small style="font-weight: 400; color: #64748b">(verifica e correggi)</small>
          </div>
          <div class="cfp-form-grid">
            <div class="form-group">
              <label>Numero Documento / Fattura *</label>
              <input type="text" class="cfp-input" placeholder="es. FT/2024/001" [(ngModel)]="numeroDoc" />
            </div>
            <div class="form-group">
              <label>Fornitore *</label>
              <input type="text" class="cfp-input" placeholder="Nome fornitore" [(ngModel)]="fornitore" />
            </div>
            <div class="form-group">
              <label>Data Documento</label>
              <input type="date" class="cfp-input" [(ngModel)]="data" />
            </div>
          </div>

          <div class="cfp-section-title" style="margin-top: 20px">
            <span class="cfp-step-num">2</span> Prodotti estratti
            <span style="margin-left: auto; font-size: 13px; font-weight: 600" [style.color]="trovati() === righe().length ? '#10b981' : '#f59e0b'">
              {{ trovati() }} di {{ righe().length }} trovati nel DB
            </span>
          </div>
          <div class="cfp-table-wrap">
            <table class="cfp-table">
              <thead>
                <tr>
                  <th style="width: 44px; text-align: center">✓</th>
                  <th>Nome nel PDF</th>
                  <th>Prodotto nel DB</th>
                  <th style="width: 95px">Quantità</th>
                  <th style="width: 115px">Prezzo Unitario €</th>
                  <th style="width: 110px; text-align: center">Azione</th>
                </tr>
              </thead>
              <tbody>
                @for (r of righe(); track $index; let i = $index) {
                  <tr [class.cfp-row-ok]="r.prodotto_id" [class.cfp-row-warn]="!r.prodotto_id" [style.opacity]="r.stato === 'done' ? 0.55 : 1">
                    <td style="text-align: center">
                      <input type="checkbox" style="width: 16px; height: 16px; cursor: pointer" [checked]="r.includi" [disabled]="r.stato === 'done'" (change)="patch(i, { includi: $any($event.target).checked })" />
                    </td>
                    <td>
                      <div class="cfp-pdf-nome" [title]="r.nome_pdf">{{ r.nome_pdf || '—' }}</div>
                    </td>
                    <td>
                      <select class="cfp-select" [disabled]="r.stato === 'done'" (change)="setProdotto(i, $any($event.target).value)">
                        <option value="">— Non associare —</option>
                        @for (p of prodotti.prodotti(); track p.id) {
                          <option [value]="p.id" [selected]="p.id === r.prodotto_id">{{ p.nome }}{{ p.marca_nome ? ' — ' + p.marca_nome : '' }}</option>
                        }
                      </select>
                      <span [class]="r.prodotto_id ? 'cfp-badge-ok' : 'cfp-badge-warn'">{{ r.prodotto_id ? '✓ Trovato' : '⚠ Non trovato' }}</span>
                    </td>
                    <td><input type="number" class="cfp-num-input" min="0.01" step="0.01" [value]="r.quantita ?? ''" [disabled]="r.stato === 'done'" (change)="patch(i, { quantita: +$any($event.target).value || null })" /></td>
                    <td><input type="number" class="cfp-num-input" min="0.01" step="0.01" [value]="r.prezzo ?? ''" [disabled]="r.stato === 'done'" (change)="patch(i, { prezzo: +$any($event.target).value || null })" /></td>
                    <td style="text-align: center">
                      <button
                        type="button"
                        class="btn btn-primary cfp-btn-usa"
                        [disabled]="r.stato !== 'idle'"
                        [style.background]="r.stato === 'done' ? 'linear-gradient(135deg,#10b981,#059669)' : null"
                        (click)="carica(i)"
                      >
                        {{ r.stato === 'done' ? '✓ Caricato' : r.stato === 'loading' ? '⏳' : 'Carica' }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p class="cfp-note">
            💡 Prodotti non riconosciuti: selezionali dal menu. Prodotti mancanti: creali prima in
            <strong>Prodotti</strong>. Documento e fornitore in cima vengono usati per tutti i carichi. Ogni riga viene salvata
            <strong>immediatamente</strong> cliccando Carica.
          </p>
        }

        @if (errore()) {
          <div class="cfp-error" style="display: block">{{ errore() }}</div>
        }
      </div>
      <div class="modal-footer">
        @if (step() === 'risultati') {
          <button type="button" class="btn btn-secondary" (click)="reset()">Nuovo PDF</button>
          <button type="button" class="btn btn-primary" [disabled]="daCaricare() === 0" (click)="caricaSelezionati()">
            Carica selezionati ({{ daCaricare() }})
          </button>
        }
        <button type="button" class="btn btn-secondary" (click)="chiudi()">Chiudi</button>
      </div>
    </app-modal>
  `,
})
export class FatturaPdfModalComponent {
  protected readonly prodotti = inject(ProdottiService);
  private readonly pdf = inject(PdfService);
  private readonly movimenti = inject(MovimentiService);

  readonly open = input(false);
  readonly closed = output<void>();

  protected readonly step = signal<'upload' | 'loading' | 'risultati'>('upload');
  protected readonly msg = signal('Analisi in corso...');
  protected readonly errore = signal('');
  protected readonly file = signal<File | null>(null);
  protected readonly drag = signal(false);
  protected readonly righe = signal<Riga[]>([]);

  protected numeroDoc = '';
  protected fornitore = '';
  protected data = todayISO();

  protected readonly trovati = computed(() => this.righe().filter((r) => r.prodotto_id).length);
  protected readonly daCaricare = computed(
    () => this.righe().filter((r) => r.includi && r.prodotto_id && r.stato === 'idle').length,
  );

  protected onFile(e: Event): void {
    this.setFile((e.target as HTMLInputElement).files?.[0] ?? null);
  }

  protected onDrop(e: DragEvent): void {
    e.preventDefault();
    this.drag.set(false);
    this.setFile(e.dataTransfer?.files?.[0] ?? null);
  }

  private setFile(f: File | null): void {
    if (!f) return;
    if (f.type !== 'application/pdf') return this.errore.set('⚠ Seleziona un file PDF valido.');
    this.errore.set('');
    this.file.set(f);
  }

  protected reset(): void {
    this.file.set(null);
    this.righe.set([]);
    this.errore.set('');
    this.step.set('upload');
  }

  protected chiudi(): void {
    this.reset();
    this.closed.emit();
  }

  protected async analizza(): Promise<void> {
    const f = this.file();
    if (!f) return;
    this.errore.set('');
    try {
      this.step.set('loading');
      this.msg.set('📖 Lettura PDF...');
      const testo = await this.pdf.extractText(f);
      if (!testo.trim()) throw new Error('Il PDF non contiene testo leggibile (potrebbe essere scansionato).');

      this.msg.set('🔍 Analisi e ricerca prodotti nel database...');
      const d = this.pdf.parseFattura(testo);
      await this.prodotti.ensureLoaded();

      this.numeroDoc = (d.numero_documento ?? '').replace(/\.pdf$/i, '').replace(/^scaricato da /i, '').trim();
      this.fornitore = d.fornitore ?? '';
      this.data = d.data_documento;
      this.righe.set(
        d.righe.map((r) => {
          const p = this.pdf.matchProdotto(r.nome_prodotto, this.prodotti.prodotti());
          return {
            nome_pdf: r.nome_prodotto,
            quantita: r.quantita,
            prezzo: r.prezzo_unitario,
            prodotto_id: p?.id ?? null,
            includi: !!p,
            stato: 'idle' as const,
          };
        }),
      );
      this.step.set('risultati');
    } catch (e) {
      this.step.set('upload');
      this.errore.set('❌ ' + (e as Error).message);
    }
  }

  protected patch(i: number, p: Partial<Riga>): void {
    this.righe.update((l) => l.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
  }

  protected setProdotto(i: number, val: string): void {
    const id = val ? Number(val) : null;
    this.patch(i, { prodotto_id: id, ...(id ? { includi: true } : {}) });
  }

  protected async carica(i: number): Promise<void> {
    const r = this.righe()[i];
    const errs: string[] = [];
    if (!r.prodotto_id) errs.push('Seleziona un prodotto dal DB per questa riga.');
    if (!r.quantita || r.quantita <= 0) errs.push('Inserisci una quantità valida.');
    if (!r.prezzo || r.prezzo <= 0) errs.push('Inserisci un prezzo unitario valido.');
    if (!this.numeroDoc.trim()) errs.push('Inserisci il numero documento prima di caricare.');
    if (!this.fornitore.trim()) errs.push('Inserisci il fornitore prima di caricare.');
    if (errs.length) {
      this.errore.set('⚠ ' + errs.join(' · '));
      return;
    }
    this.errore.set('');
    this.patch(i, { stato: 'loading' });
    try {
      await this.movimenti.create({
        prodotto_id: r.prodotto_id!,
        tipo: 'carico',
        quantita: round2(r.quantita!),
        prezzo: round2(r.prezzo!),
        data_movimento: this.data || todayISO(),
        fattura_doc: this.numeroDoc.trim(),
        fornitore: this.fornitore.trim(),
      });
      this.patch(i, { stato: 'done' });
    } catch (e) {
      this.patch(i, { stato: 'idle' });
      this.errore.set('❌ ' + apiErrorMessage(e));
    }
  }

  protected async caricaSelezionati(): Promise<void> {
    for (let i = 0; i < this.righe().length; i++) {
      const r = this.righe()[i];
      if (r.includi && r.prodotto_id && r.stato === 'idle') await this.carica(i);
    }
  }
}
