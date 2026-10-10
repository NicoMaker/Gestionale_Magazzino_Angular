import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/auth.service';
import { CompanyService } from '../core/company.service';
import { SocketService } from '../core/socket.service';

/** Layout principale: sidebar + area contenuto con le pagine */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-container">
      <button
        type="button"
        class="mobile-menu-toggle"
        [class.active]="menuOpen()"
        aria-label="Toggle menu"
        (click)="toggleMenu($event)"
      >
        <div class="hamburger">
          <span class="line"></span>
          <span class="line"></span>
          <span class="line"></span>
        </div>
      </button>

      <aside class="sidebar" [class.mobile-open]="menuOpen()">
        <div class="sidebar-header">
          <img src="img/Logo2.png" alt="Logo Magazzino Moto" class="logo" />
          <h2>Magazzino Moto</h2>
        </div>

        <nav class="sidebar-nav">
          <a routerLink="/marche" routerLinkActive="active" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 7h-9M14 17H5M3 7h2M21 17h-4M15 12h6M9 12H3M15 6v12M9 6v12" />
            </svg>
            <span>Marche</span>
          </a>
          <a routerLink="/prodotti" routerLinkActive="active" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path
                d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"
              />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <span>Prodotti</span>
          </a>
          <a routerLink="/movimenti" routerLinkActive="active" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            <span>Movimenti</span>
          </a>
          <a routerLink="/riordino" routerLinkActive="active" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span>Riordino</span>
          </a>
          <a routerLink="/riepilogo" routerLinkActive="active" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
              <path d="M9 12h6m-6 4h6" />
            </svg>
            <span>Riepilogo</span>
          </a>
          <a routerLink="/storico" routerLinkActive="active" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span>Storico</span>
          </a>
          <a routerLink="/utenti" routerLinkActive="active" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            <span>Utenti</span>
          </a>

          <a class="nav-item" [href]="downloadDbUrl" (click)="menuOpen.set(false)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
              <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
            </svg>
            <span>Scarica DB</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="user-info">
            <div class="user-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div class="user-details">
              <span class="user-name">{{ auth.username() }}</span>
              <span class="user-role">Amministratore</span>
            </div>
          </div>

          <div class="company-info-sidebar">
            <p class="company-address-sidebar">{{ company.addressLine() }}</p>
            <br />
            <div class="piva-info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
              <div class="piva-details">
                <span class="piva-label-sidebar">Partita IVA</span>
                <span class="piva-number">{{ company.company().piva }}</span>
              </div>
            </div>
          </div>

          <button type="button" class="btn-logout" (click)="auth.logout()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            <span>Esci</span>
          </button>
          <br />
          <br />
        </div>
      </aside>

      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly company = inject(CompanyService);
  private readonly socket = inject(SocketService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly menuOpen = signal(false);
  protected readonly downloadDbUrl = `${environment.apiUrl}/admin/download-db`;

  constructor() {
    this.company.load();
    this.socket.connect();

    // Ricorda la sezione attiva e chiude il menu mobile ad ogni navigazione
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        const section = e.urlAfterRedirects.split('?')[0].split('/').filter(Boolean)[0];
        if (section) localStorage.setItem('activeSection', section);
        this.menuOpen.set(false);
      });
  }

  protected toggleMenu(e: Event): void {
    e.stopPropagation();
    this.menuOpen.update((v) => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!this.menuOpen() || window.innerWidth > 1024) return;
    const target = e.target as Node;
    const sidebar = this.host.nativeElement.querySelector('.sidebar');
    if (sidebar && !sidebar.contains(target)) this.menuOpen.set(false);
  }
}
