import { Directive, ElementRef, HostListener, inject, input } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Campo numerico testuale all'italiana: accetta solo cifre e una virgola
 * (il punto viene convertito), limita i decimali e formatta all'uscita.
 */
@Directive({
  selector: 'input[appDecimal]',
})
export class DecimalInputDirective {
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly ngControl = inject(NgControl, { self: true, optional: true });

  /** Numero massimo di decimali */
  readonly appDecimal = input<number | ''>(2);

  private get max(): number {
    const v = this.appDecimal();
    return v === '' ? 2 : v;
  }

  @HostListener('input')
  onInput(): void {
    const input = this.el.nativeElement;
    let v = input.value.replace(/[^\d.,]/g, '').replace(/\./g, ',');
    const first = v.indexOf(',');
    if (first >= 0) {
      v = v.slice(0, first + 1) + v.slice(first + 1).replace(/,/g, '');
      const [a, b] = v.split(',');
      if (b.length > this.max) v = `${a},${b.slice(0, this.max)}`;
    }
    if (v !== input.value) {
      input.value = v;
      this.ngControl?.control?.setValue(v);
    }
  }

  @HostListener('blur')
  onBlur(): void {
    const input = this.el.nativeElement;
    if (!input.value) return;
    const n = Number.parseFloat(input.value.replace(',', '.'));
    if (Number.isNaN(n)) return;
    const formatted = n.toFixed(this.max).replace('.', ',');
    if (formatted !== input.value) {
      input.value = formatted;
      this.ngControl?.control?.setValue(formatted);
    }
  }
}
