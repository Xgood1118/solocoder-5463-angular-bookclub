import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'club', loadComponent: () => import('./pages/club/club.component').then(m => m.ClubComponent) },
  { path: 'members', loadComponent: () => import('./pages/members/members.component').then(m => m.MembersComponent) },
  { path: 'sessions', loadComponent: () => import('./pages/sessions/sessions.component').then(m => m.SessionsComponent) },
  { path: 'progress', loadComponent: () => import('./pages/progress/progress.component').then(m => m.ProgressComponent) },
  { path: 'discussion', loadComponent: () => import('./pages/discussion/discussion.component').then(m => m.DiscussionComponent) },
  { path: 'exchange', loadComponent: () => import('./pages/exchange/exchange.component').then(m => m.ExchangeComponent) },
  { path: 'notifications', loadComponent: () => import('./pages/notifications/notifications.component').then(m => m.NotificationsComponent) },
  { path: '**', redirectTo: 'dashboard' },
];
