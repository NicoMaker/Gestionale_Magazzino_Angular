import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';

/**
 * Finestra modale con lo stile originale (.modal / .modal-content).
 * Il contenuto proiettato deve fornire `.modal-body` e `.modal-footer`
 * (eventualmente dentro un <form>).
 */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="modal active" (mousedown)="onBackdrop($event)">
        <div
          class="modal-content"
          [class.modal-large]="size() === 'large'"
          [class.modal-small]="size() === 'small'"
          [class.modal-medium]="size() === 'medium'"
          [class.cfp-modal-content]="size() === 'xl'"
          (mousedown)="$event.stopPropagation()"
        >
          <div class="modal-header">
            <div>
              <h2>{{ title() }}</h2>
              <ng-content select="[modal-subtitle]" />
            </div>
            <button type="button" class="modal-close" aria-label="Chiudi" (click)="closed.emit()">&times;</button>
          </div>
          <ng-content />
        </div>
      </div>
    }
  `,
})
export class ModalComponent {
  readonly open = input(false);
  readonly title = input('');
  readonly size = input<'' | 'small' | 'medium' | 'large' | 'xl'>('');
  readonly closeOnBackdrop = input(false);
  readonly closed = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.closed.emit();
  }

  protected onBackdrop(e: MouseEvent): void {
    if (this.closeOnBackdrop() && e.target === e.currentTarget) this.closed.emit();
  }
}
