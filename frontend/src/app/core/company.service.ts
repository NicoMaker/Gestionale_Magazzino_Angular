import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CompanyInfo } from './models';

const FALLBACK: CompanyInfo = {
  company: {
    name: 'Magazzino Moto',
    address: 'Via prova 123',
    city: 'Milano',
    cap: '20100',
    province: 'MI',
    country: 'Italia',
    piva: '1234567890',
    phone: '+39 02 1234567',
    email: 'info@magazzinomoto.it',
  },
};

/** Dati aziendali letti da /company-info.json (modificabile senza ricompilare) */
@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly http = inject(HttpClient);
  readonly info = signal<CompanyInfo | null>(null);

  readonly company = computed(() => (this.info() ?? FALLBACK).company);
  readonly addressLine = computed(() => {
    const c = this.company();
    return `${c.address}, ${c.cap} ${c.city} (${c.province})`;
  });

  load(): void {
    if (this.info()) return;
    this.http.get<CompanyInfo>('company-info.json').subscribe({
      next: (d) => this.info.set(d),
      error: () => this.info.set(FALLBACK),
    });
  }
}
