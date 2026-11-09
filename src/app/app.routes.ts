import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { ROLES_ADMINISTRACION, rutaInicialPara } from './core/auth/auth.models';
import { AuthService } from './core/auth/auth.service';
import { authGuard, invitadoGuard, rolGuard } from './core/auth/guards';

/** Cada feature es un chunk aparte (lazy). Las de la Fase 8 se cuelgan de `panel` y `portal`. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: () => rutaInicialPara(inject(AuthService).rol()) },
  {
    path: 'login',
    canActivate: [invitadoGuard],
    title: 'Iniciar sesión · Planilla360',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'panel',
    canActivate: [authGuard, rolGuard(...ROLES_ADMINISTRACION)],
    loadComponent: () => import('./layout/admin/admin-layout').then((m) => m.AdminLayout),
    children: [
      {
        path: '',
        title: 'Panel · Planilla360',
        loadComponent: () => import('./features/panel/panel-inicio').then((m) => m.PanelInicio),
      },
    ],
  },
  {
    path: 'portal',
    canActivate: [authGuard, rolGuard('EMPLEADO')],
    loadComponent: () => import('./layout/portal/portal-layout').then((m) => m.PortalLayout),
    children: [
      {
        path: '',
        title: 'Mi inicio · Planilla360',
        loadComponent: () => import('./features/portal/portal-inicio').then((m) => m.PortalInicio),
      },
    ],
  },
  {
    path: 'acceso-denegado',
    title: 'Acceso denegado · Planilla360',
    loadComponent: () => import('./features/errores/pagina-error').then((m) => m.PaginaError),
    data: {
      codigo: '403',
      titulo: 'Acceso denegado',
      mensaje: 'No tienes permiso para ver esta pantalla.',
    },
  },
  {
    path: '**',
    title: 'No encontrada · Planilla360',
    loadComponent: () => import('./features/errores/pagina-error').then((m) => m.PaginaError),
    data: {
      codigo: '404',
      titulo: 'Página no encontrada',
      mensaje: 'La dirección que buscas no existe o cambió de lugar.',
    },
  },
];
