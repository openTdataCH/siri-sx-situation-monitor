import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home-page.component')
      .then((module) => module.HomePageComponent)
  },
  {
    path: 'setup',
    loadComponent: () => import('./pages/setup/setup-page.component')
      .then((module) => module.SetupPageComponent)
  },
  {
    path: 'timeline',
    loadComponent: () => import('./pages/timeline/timeline-page.component')
      .then((module) => module.TimelinePageComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
