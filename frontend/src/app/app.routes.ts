import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';
import { ShellComponent } from './layout/shell.component';

const SECTIONS = ['marche', 'prodotti', 'movimenti', 'riordino', 'riepilogo', 'storico', 'utenti'];

/** Riapre l'ultima sezione visitata (come faceva il vecchio `activeSection`) */
const lastSection = (): string => {
  try {
    const s = localStorage.getItem('activeSection');
    return s && SECTIONS.includes(s) ? s : 'marche';
  } catch {
    return 'marche';
  }
};

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Login - Gestione Magazzino Moto',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: lastSection },
      {
        path: 'marche',
        title: 'Marche - Gestione Magazzino Moto',
        loadComponent: () => import('./pages/marche/marche.component').then((m) => m.MarcheComponent),
      },
      {
        path: 'prodotti',
        title: 'Prodotti - Gestione Magazzino Moto',
        loadComponent: () => import('./pages/prodotti/prodotti.component').then((m) => m.ProdottiComponent),
      },
      {
        path: 'movimenti',
        title: 'Movimenti - Gestione Magazzino Moto',
        loadComponent: () => import('./pages/movimenti/movimenti.component').then((m) => m.MovimentiComponent),
      },
      {
        path: 'riordino',
        title: 'Riordino - Gestione Magazzino Moto',
        loadComponent: () => import('./pages/riordino/riordino.component').then((m) => m.RiordinoComponent),
      },
      {
        path: 'riepilogo',
        title: 'Riepilogo - Gestione Magazzino Moto',
        loadComponent: () => import('./pages/riepilogo/riepilogo.component').then((m) => m.RiepilogoComponent),
      },
      {
        path: 'storico',
        title: 'Storico - Gestione Magazzino Moto',
        loadComponent: () => import('./pages/storico/storico.component').then((m) => m.StoricoComponent),
      },
      {
        path: 'utenti',
        title: 'Utenti - Gestione Magazzino Moto',
        loadComponent: () => import('./pages/utenti/utenti.component').then((m) => m.UtentiComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
