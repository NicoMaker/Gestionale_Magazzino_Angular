import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';

export interface SelectOption {
  id: number;
  label: string;
  /** Testo secondario (es. marca) */
  meta?: string | null;
  /** Testo aggiuntivo su cui cercare (es. descrizione) */
  extra?: string | null;
}

/** Campo di ricerca con elenco a discesa (marca nel prodotto, prodotto nel movimento) */
@Component({
  selector: 'app-search-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="search-select-wrapper">
      <input
        type="text"
        class="search-select-input"
        [class.has-selection]="value() !== null"
        [attr.id]="inputId() || null"
        [placeholder]="placeholder()"
        [value]="query()"
        [disabled]="disabled()"
        autocomplete="off"
        (input)="onType($event)"
        (focus)="show.set(true)"
      />
      <div class="search-results" [class.show]="show() && !disabled()">
        @for (o of results(); track o.id) {
          <div
            class="search-result-item"
            [class.selected]="o.id === value()"
            (mousedown)="pick(o, $event)"
          >
            <span class="search-result-name">{{ o.label }}</span>
            @if (o.meta || o.extra) {
              <span class="search-result-meta"
                >{{ o.meta }}{{ o.meta && o.extra ? ' · ' : '' }}{{ o.extra }}</span
              >
            }
          </div>
        } @empty {
          <div class="search-result-item" style="cursor: default">
            <span class="search-result-meta">Nessun risultato</span>
          </div>
        }
      </div>
    </div>
  `,
})
export class SearchSelectComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly options = input.required<SelectOption[]>();
  readonly value = model<number | null>(null);
  readonly placeholder = input('Cerca...');
  readonly inputId = input('');
  readonly disabled = input(false);

  protected readonly query = signal('');
  protected readonly show = signal(false);

  protected readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.options();
    const sel = this.value();
    // se c'è già una selezione mostra tutto, altrimenti filtra
    const filtered =
      sel !== null || !q
        ? list
        : list.filter((o) =>
            `${o.label} ${o.meta ?? ''} ${o.extra ?? ''}`.toLowerCase().includes(q),
          );
    return filtered.slice(0, 60);
  });

  constructor() {
    // Mantiene il testo allineato all'elemento selezionato (anche se le opzioni arrivano dopo)
    effect(() => {
      const v = this.value();
      const opt = this.options().find((o) => o.id === v);
      if (opt) this.query.set(opt.label + (opt.meta ? ` (${opt.meta})` : ''));
    });
  }

  protected onType(e: Event): void {
    this.query.set((e.target as HTMLInputElement).value);
    if (this.value() !== null) this.value.set(null);
    this.show.set(true);
  }

  protected pick(o: SelectOption, e: MouseEvent): void {
    e.preventDefault();
    this.value.set(o.id);
    this.query.set(o.label + (o.meta ? ` (${o.meta})` : ''));
    this.show.set(false);
  }

  @HostListener('document:mousedown', ['$event'])
  onOutside(e: MouseEvent): void {
    if (!this.host.nativeElement.contains(e.target as Node)) this.show.set(false);
  }
}
