import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CompanyService } from '../../core/company.service';
import { apiErrorMessage } from '../../core/utils';
import { HttpErrorResponse } from '@angular/common/http';

type BtnState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './login.component.css',
  template: `
    <div class="login-page">
      <div class="login-container">
        <div class="login-card">
          <div class="logo-section">
            <div class="logo-wrapper">
              <img src="img/Logo.png" alt="Logo Magazzino Moto" class="logo-img" />
            </div>
            <h1 class="login-title">Gestione Magazzino Moto</h1>
            <p class="login-subtitle">Accedi al sistema di gestione</p>
          </div>

          <form (ngSubmit)="submit()" #f="ngForm">
            <div class="form-group">
              <label class="form-label" for="username">Username</label>
              <div class="input-container">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  type="text"
                  id="username"
                  name="username"
                  class="form-input"
                  placeholder="Inserisci username"
                  required
                  autocomplete="off"
                  [(ngModel)]="username"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="password">Password</label>
              <div class="input-container">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  id="password"
                  name="password"
                  class="form-input"
                  placeholder="Inserisci password"
                  required
                  autocomplete="off"
                  [(ngModel)]="password"
                />
                <svg
                  class="toggle-password"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  (click)="showPassword.set(!showPassword())"
                >
                  @if (showPassword()) {
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  } @else {
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.08 2.58" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  }
                </svg>
              </div>
            </div>

            <button
              type="submit"
              class="btn-login"
              [class.loading]="state() === 'loading'"
              [disabled]="state() === 'loading' || state() === 'success'"
              [style.background]="btnBackground()"
            >
              <span class="btn-text">{{ btnText() }}</span>
              <div class="loader"></div>
            </button>

            <div class="error-message" [class.show]="!!error()">{{ error() }}</div>
          </form>

          <div class="login-footer">
            <p class="footer-text">Credenziali di accesso fornite dall'amministratore</p>
          </div>

          <div class="company-info">
            <p class="company-address">{{ company.addressLine() }}</p>
            <div class="piva-container">
              <p class="piva-label">Partita IVA</p>
              <p class="piva-value">{{ company.company().piva }}</p>
            </div>
          </div>

          <br /><br />
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly company = inject(CompanyService);

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
        return '✓ Accesso effettuato!';
      case 'error':
        return this.error().startsWith('Impossibile') ? 'Errore di rete' : 'Accesso fallito';
      default:
        return 'Accedi';
    }
  }

  protected btnBackground(): string | null {
    if (this.state() === 'success') return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    if (this.state() === 'error') return 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)';
    return null;
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
