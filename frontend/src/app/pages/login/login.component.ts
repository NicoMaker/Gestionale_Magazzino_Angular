import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { CompanyService } from '../../core/company.service';
import { apiErrorMessage } from '../../core/utils';

type BtnState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './login.component.css',
  template: `
    <div class="login-page">
      <!-- Pannello brand -->
      <aside class="brand-panel" aria-hidden="true">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="grid-overlay"></div>

        <div class="brand-top">
          <div class="brand-mark">
            <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 3 4 9v14l12 6 12-6V9L16 3Z" />
              <path d="M4 9l12 6 12-6M16 15v14" />
            </svg>
          </div>
          <span class="brand-name">Magazzino Moto</span>
        </div>

        <div class="brand-hero">
          <h2>Il tuo magazzino,<br /><span>sempre sotto controllo.</span></h2>
          <p>Carichi, scarichi, giacenze e riordini in tempo reale. Tutto in un unico posto.</p>

          <ul class="features">
            <li>
              <span class="dot"></span>Carico e scarico FIFO con gestione lotti
            </li>
            <li><span class="dot"></span>Import da fattura e PDF</li>
            <li><span class="dot"></span>Aggiornamenti in tempo reale su tutti i dispositivi</li>
          </ul>
        </div>

        <div class="brand-bottom">© {{ year }} {{ company.company().name || 'Magazzino Moto' }}</div>
      </aside>

      <!-- Pannello form -->
      <main class="form-panel">
        <div class="form-wrap">
          <div class="mobile-brand">
            <div class="brand-mark small">
              <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 3 4 9v14l12 6 12-6V9L16 3Z" />
                <path d="M4 9l12 6 12-6M16 15v14" />
              </svg>
            </div>
            <span>Magazzino Moto</span>
          </div>

          <header class="form-header">
            <h1>Pagina di Login 👋</h1>
            <p>Accedi per gestire il tuo magazzino</p>
          </header>

          <form (ngSubmit)="submit()" #f="ngForm" novalidate>
            <div class="field">
              <input
                type="text"
                id="username"
                name="username"
                placeholder=" "
                required
                autocomplete="username"
                autocapitalize="off"
                spellcheck="false"
                [(ngModel)]="username"
              />
              <label for="username">Username</label>
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>

            <div class="field">
              <input
                [type]="showPassword() ? 'text' : 'password'"
                id="password"
                name="password"
                placeholder=" "
                required
                autocomplete="current-password"
                [(ngModel)]="password"
              />
              <label for="password">Password</label>
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <button
                type="button"
                class="toggle"
                [attr.aria-label]="showPassword() ? 'Nascondi password' : 'Mostra password'"
                (click)="showPassword.set(!showPassword())"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  @if (showPassword()) {
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  } @else {
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.08 2.58" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  }
                </svg>
              </button>
            </div>

            <div class="error-message" role="alert" [class.show]="!!error()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{{ error() }}</span>
            </div>

            <button
              type="submit"
              class="btn-login"
              [class.loading]="state() === 'loading'"
              [class.success]="state() === 'success'"
              [class.error]="state() === 'error'"
              [disabled]="state() === 'loading' || state() === 'success'"
            >
              @if (state() === 'loading') {
                <span class="spinner"></span>
              } @else {
                <span>{{ btnText() }}</span>
                @if (state() === 'idle') {
                  <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                }
              }
            </button>
          </form>

          <p class="hint">Credenziali di accesso fornite dall'amministratore</p>

          <footer class="company">
            <div>
              <span class="label">Sede</span>
              <span class="value">{{ company.addressLine() }}</span>
            </div>
            <div>
              <span class="label">P.IVA</span>
              <span class="value mono">{{ company.company().piva }}</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly company = inject(CompanyService);

  protected readonly year = new Date().getFullYear();
  protected username = '';
  protected password = '';
  protected readonly showPassword = signal(false);
  protected readonly state = signal<BtnState>('idle');
  protected readonly error = signal('');

  constructor() {
    this.company.load();
  }

  protected btnText(): string {
    switch (this.state()) {
      case 'success':
        return '✓ Accesso effettuato';
      case 'error':
        return this.error().startsWith('Impossibile') ? 'Errore di rete' : 'Accesso fallito';
      default:
        return 'Accedi';
    }
  }

  protected async submit(): Promise<void> {
    const username = this.username.trim();
    if (!username || !this.password) return;

    this.error.set('');
    this.state.set('loading');
    try {
      await this.auth.login(username, this.password);
      this.state.set('success');
      setTimeout(() => void this.router.navigate(['/']), 800);
    } catch (err) {
      const offline = err instanceof HttpErrorResponse && err.status === 0;
      this.error.set(
        offline
          ? 'Impossibile connettersi al server. Riprova più tardi.'
          : apiErrorMessage(err, 'Errore durante il login'),
      );
      this.state.set('error');
      setTimeout(() => this.state() === 'error' && this.state.set('idle'), 1500);
    }
  }
}
