import { Injectable, inject } from '@angular/core';
import { CompanyService } from './company.service';
import { RigaGiacenza } from './models';
import { escapeHtml, formatCurrency, formatDateIT, formatQuantity } from './utils';

const PRINT_CSS = `
  body{font-family:Arial,sans-serif;margin:20px}
  h1{color:#333;border-bottom:2px solid #4F46E5;padding-bottom:10px}
  .info{margin:20px 0;font-size:14px}
  .prodotto-block{margin-bottom:30px;page-break-inside:avoid}
  .prodotto-header{background:#e0e7ff;padding:10px;margin-bottom:10px;border-left:4px solid #4F46E5}
  .prodotto-info{display:flex;justify-content:space-between;margin:5px 0;gap:10px;flex-wrap:wrap}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}
  th{background:#6366f1;color:white}
  .lotto-row{background:#f9fafb}
  .header-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;gap:10px}
  .header-left img{width:120px;height:auto}
  .header-right{text-align:right;font-size:12px;line-height:1.2}
  .header-right p{margin:2px 0}
  @page{margin:10mm}`;

/** Stampa di riepilogo e storico giacenze tramite iframe nascosto */
@Injectable({ providedIn: 'root' })
export class PrintService {
  private readonly companySvc = inject(CompanyService);

  printGiacenze(tipo: 'riepilogo' | 'storico', righe: RigaGiacenza[], dataStorico?: string): boolean {
    if (!righe.length) return false;

    const isStorico = tipo === 'storico';
    const tot = righe.reduce((s, r) => s + Number(r.valore_totale || 0), 0);
    const now = new Date();
    const extra = isStorico
      ? `<p><strong>Data Selezionata:</strong> ${dataStorico ? formatDateIT(dataStorico) : 'Non selezionata'}</p>`
      : `<p><strong>Data Odierna:</strong> ${now.toLocaleDateString('it-IT')}</p>`;
    const titolo = isStorico ? 'Storico Giacenze Magazzino' : 'Riepilogo Giacenze Magazzino';
    const c = this.companySvc.company();
    const logo = new URL('img/Logo.png', document.baseURI).href;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${titolo}</title><style>${PRINT_CSS}</style></head><body>
      <div class="header-row">
        <div class="header-left"><img src="${logo}" alt="Logo"></div>
        <div class="header-right">
          <p><strong>Indirizzo:</strong> ${escapeHtml(c.address)}, ${escapeHtml(c.cap)} ${escapeHtml(c.city)} (${escapeHtml(c.province)})</p>
          <p><strong>P. IVA:</strong> ${escapeHtml(c.piva)}</p>
          <p><strong>Email:</strong> ${escapeHtml(c.email)}</p>
          <p><strong>Tel:</strong> ${escapeHtml(c.phone)}</p>
        </div>
      </div>
      <h1>${titolo}</h1>
      <div class="info">
        ${extra}
        <p><strong>Valore Totale:</strong> ${formatCurrency(tot)}</p>
        <p><strong>Data Stampa:</strong> ${now.toLocaleDateString('it-IT')} ${now.toLocaleTimeString('it-IT')}</p>
      </div>
      ${this.blocchi(righe)}
    </body></html>`;

    this.printHtml(html);
    return true;
  }

  private blocchi(righe: RigaGiacenza[]): string {
    return righe
      .filter((p) => p.giacenza > 0)
      .map((p) => {
        const lotti = p.lotti?.length
          ? `<table><thead><tr><th>Data Carico</th><th>Quantità (PZ/L)</th><th>Prezzo Unitario</th><th>Valore</th><th>Documento/Fattura</th><th>Fornitore</th></tr></thead><tbody>${p.lotti
              .map(
                (l) => `<tr class="lotto-row"><td>${formatDateIT(l.data_carico)}</td><td>${formatQuantity(l.quantita_rimanente)}</td><td>${formatCurrency(l.prezzo)}</td><td><strong>${formatCurrency(l.quantita_rimanente * l.prezzo)}</strong></td><td>${escapeHtml(l.fattura_doc) || '-'}</td><td>${escapeHtml(l.fornitore) || '-'}</td></tr>`,
              )
              .join('')}</tbody></table>`
          : '';
        return `<div class="prodotto-block">
          <div class="prodotto-header">
            <div class="prodotto-info"><span><strong>Prodotto:</strong> ${escapeHtml(p.nome)}</span><span><strong>Giacenza:</strong> ${formatQuantity(p.giacenza)} PZ/L</span></div>
            <div class="prodotto-info"><span><strong>Marca:</strong> ${escapeHtml(p.marca_nome) || '-'}</span><span><strong>Valore:</strong> ${formatCurrency(p.valore_totale)}</span></div>
            ${p.descrizione ? `<div class="prodotto-info"><span><strong>Descrizione:</strong> ${escapeHtml(p.descrizione)}</span></div>` : ''}
          </div>${lotti}</div>`;
      })
      .join('');
  }

  private printHtml(content: string): void {
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(iframe);
    const win = iframe.contentWindow!;
    const doc = iframe.contentDocument ?? win.document;
    doc.open();
    doc.write(content);
    doc.close();
    setTimeout(() => {
      win.focus();
      win.print();
      setTimeout(() => iframe.remove(), 1000);
    }, 500);
  }
}
