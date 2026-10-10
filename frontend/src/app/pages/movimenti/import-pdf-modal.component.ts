import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { ModalComponent } from '../../shared/modal.component';
import { DialogService } from '../../core/dialog.service';
import { BulkScaricoItem } from '../../core/models';
import { MovimentiService } from '../../core/movimenti.service';
import { PdfService } from '../../core/pdf.service';
import { ProdottiService } from '../../core/prodotti.service';
import { apiErrorMessage, formatDateIT, formatQuantity, round2 } from '../../core/utils';

interface Esito {
  success: { code: string; quantity: number; date: string }[];
  notFound: { code: string; quantity: number; date: string }[];
  insufficient: { code: string; quantity: number; date: string; reason: string }[];
  failed: { code: string; reason: string }[];
}

/** Scarico di magazzino da PDF (documento di lavoro con sezione RICAMBI) */
@Component({
  selector: 'app-import-pdf-modal',
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="open()" title="📄 Scarica da PDF" (closed)="chiudi()">
      <form (submit)="$event.preventDefault(); elabora()">
        <div class="modal-body">
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 16px; margin-bottom: 18px">
            <p style="font-weight: 700; color: #1d4ed8; margin-bottom: 6px; font-size: 13px">ℹ️ Come funziona</p>
            <p style="color: #1e40af; font-size: 13px; line-height: 1.5; margin: 0">
              Carica il PDF del documento di lavoro. Il sistema leggerà automaticamente la sezione
              <strong>RICAMBI</strong> ed eseguirà uno <strong>scarico di magazzino</strong> per ogni prodotto trovato
              con il rispettivo codice e quantità.
            </p>
          </div>

          <div class="file-upload-container">
            <label
              class="file-upload-label"
              style="cursor: pointer"
              (dragover)="$event.preventDefault()"
              (drop)="onDrop($event)"
            >
              <input type="file" accept=".pdf" hidden (change)="onFile($event)" />
              <div
                class="file-upload-design"
                style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 28px 20px; gap: 8px"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" style="width: 44px; height: 44px">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p style="font-weight: 700; font-size: 15px; color: #374151; margin: 0">Clicca per selezionare il PDF</p>
                <p style="font-size: 13px; color: #6b7280; margin: 0">oppure trascinalo qui dentro</p>
                @if (file(); as f) {
                  <span style="margin-top: 6px; font-size: 13px; font-weight: 600; color: #6366f1">
                    📄 {{ f.name }} ({{ (f.size / 1024).toFixed(1) }} KB)
                  </span>
                }
              </div>
            </label>
          </div>

          <div style="margin-top: 14px; padding: 12px 14px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb">
            <p style="font-size: 12px; font-weight: 700; color: #6b7280; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px">
              ✅ Requisiti del PDF
            </p>
            <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: #6b7280; line-height: 1.8">
              <li>Deve contenere la sezione <strong style="color: #374151">RICAMBI</strong></li>
              <li>
                Ogni riga: <strong style="color: #374151">CODICE PRODOTTO</strong> +
                <strong style="color: #374151">QUANTITÀ</strong>
              </li>
              <li>Data del documento (se presente verrà usata automaticamente)</li>
              <li>Dimensione massima: <strong style="color: #374151">10 MB</strong></li>
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="chiudi()">Annulla</button>
          <button type="submit" class="btn btn-primary" [disabled]="busy()">
            @if (busy()) {
              <span>⏳ Elaborazione in corso...</span>
            } @else {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Elabora Documento
            }
          </button>
        </div>
      </form>
    </app-modal>
  `,
})
export class ImportPdfModalComponent {
  private readonly pdf = inject(PdfService);
  private readonly prodotti = inject(ProdottiService);
  private readonly movimenti = inject(MovimentiService);
  private readonly dialog = inject(DialogService);

  readonly open = input(false);
  readonly closed = output<void>();

  protected readonly file = signal<File | null>(null);
  protected readonly busy = signal(false);

  protected onFile(e: Event): void {
    this.file.set((e.target as HTMLInputElement).files?.[0] ?? null);
  }

  protected onDrop(e: DragEvent): void {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) this.file.set(f);
  }

  protected chiudi(): void {
    if (this.busy()) return;
    this.file.set(null);
    this.closed.emit();
  }

  protected async elabora(): Promise<void> {
    const f = this.file();
    if (!f) return this.dialog.warning('⚠️ Seleziona un file PDF');
    if (f.type !== 'application/pdf') return this.dialog.warning('⚠️ Il file deve essere un PDF');
    if (f.size > 10 * 1024 * 1024) return this.dialog.warning('⚠️ Il file è troppo grande (max 10MB)');

    this.busy.set(true);
    try {
      const text = await this.pdf.extractText(f);
      const { date, righe } = this.pdf.parseScarico(text);
      if (!righe.length) {
        throw new Error(
          '❌ Nessun prodotto trovato nel PDF.\n\nVerifica che il PDF contenga:\n• Sezione "RICAMBI"\n• CODICE RICAMBIO (es. 101)\n• QUANTITÀ (es. 2)\n\nFormato atteso:\nRICAMBI\nCODICE RICAMBIO   DESCRIZIONE   QUANTITA\'\n101               Filtro Olio    2',
        );
      }

      await this.prodotti.load();
      const esito = await this.processa(righe, date, f.name);
      this.mostraEsito(esito);

      const problemi = esito.failed.length + esito.notFound.length + esito.insufficient.length;
      if (!problemi) {
        this.file.set(null);
        this.closed.emit();
      }
    } catch (e) {
      this.dialog.error("❌ Errore durante l'importazione:\n\n" + apiErrorMessage(e, (e as Error).message));
    } finally {
      this.busy.set(false);
    }
  }

  private async processa(righe: { code: string; quantity: number }[], date: string, fileName: string): Promise<Esito> {
    const esito: Esito = { success: [], notFound: [], insufficient: [], failed: [] };

    // aggrega righe con lo stesso codice
    const agg = new Map<string, number>();
    for (const r of righe) {
      const code = r.code.trim().toUpperCase();
      if (code) agg.set(code, (agg.get(code) ?? 0) + r.quantity);
    }

    const invio: BulkScaricoItem[] = [];
    for (const [codice, quantita] of agg) {
      const p = this.prodotti.prodotti().find((x) => x.nome.trim().toUpperCase() === codice);
      if (!p) {
        esito.notFound.push({ code: codice, quantity: quantita, date });
        continue;
      }
      invio.push({ codice, prodotto_id: p.id, quantita: round2(quantita), data_movimento: date });
    }
    if (!invio.length) return esito;

    const nomeDoc = fileName.replace(/\.pdf$/i, '').replace(/^scaricato da /i, '').trim();
    const r = await this.movimenti.bulkScarico(invio, nomeDoc);

    esito.success = r.success.map((s) => ({ code: s.codice, quantity: s.quantita, date: s.data_movimento }));
    esito.insufficient = r.insufficientStock.map((s) => ({
      code: s.codice,
      quantity: s.quantita,
      date: s.data_movimento,
      reason: s.reason,
    }));
    esito.failed = r.failed.map((s) => ({ code: s.codice || '–', reason: s.reason }));
    return esito;
  }

  private mostraEsito(r: Esito): void {
    const tot = r.success.length + r.failed.length + r.notFound.length + r.insufficient.length;
    const d = formatDateIT;
    let msg = `📊 IMPORT COMPLETATO\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Scarichi importati: ${r.success.length}/${tot}\n\n`;

    if (r.success.length) {
      msg += '✅ SCARICHI CREATI CON SUCCESSO:\n';
      for (const s of r.success) msg += `  • ${s.code}\n    Quantità: ${formatQuantity(s.quantity)} pz | Data: ${d(s.date)}\n`;
      msg += '\n';
    }
    if (r.notFound.length) {
      msg += `⚠️ PRODOTTI NON TROVATI (${r.notFound.length}):\n`;
      for (const s of r.notFound) {
        msg += `  • ${s.code} - ${formatQuantity(s.quantity)} pz (${d(s.date)})\n    → Crea prima il prodotto nella sezione "Prodotti"\n`;
      }
      msg += '\n';
    }
    if (r.insufficient.length) {
      msg += `❌ GIACENZA INSUFFICIENTE (${r.insufficient.length}):\n`;
      for (const s of r.insufficient) {
        msg += `  • ${s.code}\n    Richiesto: ${formatQuantity(s.quantity)} pz | Data: ${d(s.date)}\n`;
        if (s.reason) msg += `    Motivo: ${s.reason}\n`;
      }
      msg += '\n';
    }
    if (r.failed.length) {
      msg += `❌ ERRORI (${r.failed.length}):\n`;
      for (const s of r.failed) msg += `  • ${s.code}: ${s.reason}\n`;
    }

    const ok = !r.failed.length && !r.notFound.length && !r.insufficient.length;
    this.dialog.alert(msg, ok ? 'Import completato' : 'Import completato con avvisi', ok ? 'success' : 'warning');
  }
}
