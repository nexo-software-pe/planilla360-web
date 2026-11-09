import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { ROLES_ADMINISTRACION, ROLES_PERSONAL, rutaInicialPara } from './core/auth/auth.models';
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
      {
        path: 'empleados',
        canActivate: [rolGuard(...ROLES_PERSONAL)],
        children: [
          {
            path: '',
            title: 'Empleados · Planilla360',
            loadComponent: () =>
              import('./features/empleados/empleados-lista').then((m) => m.EmpleadosLista),
          },
          {
            path: 'nuevo',
            title: 'Nuevo empleado · Planilla360',
            loadComponent: () =>
              import('./features/empleados/empleado-form').then((m) => m.EmpleadoForm),
          },
          {
            path: 'importar',
            title: 'Importar empleados · Planilla360',
            loadComponent: () =>
              import('./features/empleados/empleados-importar').then((m) => m.EmpleadosImportar),
          },
          {
            path: ':id',
            title: 'Ficha del empleado · Planilla360',
            loadComponent: () =>
              import('./features/empleados/empleado-ficha').then((m) => m.EmpleadoFicha),
          },
          {
            path: ':id/editar',
            title: 'Editar empleado · Planilla360',
            loadComponent: () =>
              import('./features/empleados/empleado-form').then((m) => m.EmpleadoForm),
          },
        ],
      },
      {
        path: 'asistencia',
        canActivate: [rolGuard(...ROLES_PERSONAL)],
        loadComponent: () =>
          import('./features/asistencia/asistencia-shell').then((m) => m.AsistenciaShell),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'resumen' },
          {
            path: 'resumen',
            title: 'Resumen de asistencia · Planilla360',
            loadComponent: () =>
              import('./features/asistencia/asistencia-resumen').then((m) => m.AsistenciaResumen),
          },
          {
            path: 'detalle',
            title: 'Detalle de asistencia · Planilla360',
            loadComponent: () =>
              import('./features/asistencia/asistencia-detalle').then((m) => m.AsistenciaDetalle),
          },
          {
            path: 'horas-extra',
            title: 'Horas extra · Planilla360',
            loadComponent: () =>
              import('./features/asistencia/horas-extra').then((m) => m.HorasExtra),
          },
          {
            path: 'horarios',
            title: 'Horarios · Planilla360',
            loadComponent: () => import('./features/asistencia/horarios').then((m) => m.Horarios),
          },
        ],
      },
      {
        path: 'vacaciones',
        canActivate: [rolGuard(...ROLES_PERSONAL)],
        loadComponent: () =>
          import('./features/vacaciones/vacaciones-shell').then((m) => m.VacacionesShell),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'bandeja' },
          {
            path: 'bandeja',
            title: 'Bandeja de aprobación · Planilla360',
            loadComponent: () => import('./features/vacaciones/bandeja').then((m) => m.Bandeja),
          },
          {
            path: 'saldos',
            title: 'Saldos de vacaciones · Planilla360',
            loadComponent: () => import('./features/vacaciones/saldos').then((m) => m.Saldos),
          },
        ],
      },
      {
        path: 'planilla',
        canActivate: [rolGuard(...ROLES_PERSONAL)],
        children: [
          {
            path: '',
            title: 'Planilla · Planilla360',
            loadComponent: () =>
              import('./features/planilla/planilla-lista').then((m) => m.PlanillaLista),
          },
          {
            path: ':id',
            title: 'Planilla del mes · Planilla360',
            loadComponent: () =>
              import('./features/planilla/planilla-detalle').then((m) => m.PlanillaDetalle),
          },
        ],
      },
      {
        path: 'beneficios',
        canActivate: [rolGuard(...ROLES_PERSONAL)],
        title: 'Gratificación y CTS · Planilla360',
        loadComponent: () => import('./features/planilla/beneficios').then((m) => m.Beneficios),
      },
      {
        path: 'reportes',
        canActivate: [rolGuard(...ROLES_PERSONAL)],
        title: 'Reportes · Planilla360',
        loadComponent: () => import('./features/planilla/reportes').then((m) => m.Reportes),
      },
      {
        path: 'usuarios',
        canActivate: [rolGuard('ADMIN_EMPRESA')],
        title: 'Usuarios · Planilla360',
        loadComponent: () => import('./features/admin/usuarios').then((m) => m.Usuarios),
      },
      {
        path: 'areas-cargos',
        canActivate: [rolGuard('ADMIN_EMPRESA')],
        title: 'Áreas y cargos · Planilla360',
        loadComponent: () => import('./features/admin/areas-cargos').then((m) => m.AreasCargos),
      },
      {
        path: 'auditoria',
        canActivate: [rolGuard('ADMIN_EMPRESA')],
        title: 'Auditoría · Planilla360',
        loadComponent: () => import('./features/admin/auditoria').then((m) => m.Auditoria),
      },
      {
        path: 'empresas',
        canActivate: [rolGuard('ADMIN_SAAS')],
        title: 'Empresas · Planilla360',
        loadComponent: () => import('./features/saas/empresas').then((m) => m.Empresas),
      },
      {
        path: 'parametros-legales',
        canActivate: [rolGuard('ADMIN_SAAS')],
        title: 'Parámetros legales · Planilla360',
        loadComponent: () =>
          import('./features/saas/parametros-legales').then((m) => m.ParametrosLegales),
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
      {
        path: 'asistencia',
        title: 'Mi asistencia · Planilla360',
        loadComponent: () =>
          import('./features/portal/portal-asistencia').then((m) => m.PortalAsistencia),
      },
      {
        path: 'vacaciones',
        title: 'Mis vacaciones · Planilla360',
        loadComponent: () =>
          import('./features/portal/portal-vacaciones').then((m) => m.PortalVacaciones),
      },
      {
        path: 'permisos',
        title: 'Mis permisos · Planilla360',
        loadComponent: () =>
          import('./features/portal/portal-permisos').then((m) => m.PortalPermisos),
      },
      {
        path: 'boletas',
        title: 'Mis boletas · Planilla360',
        loadComponent: () =>
          import('./features/portal/portal-boletas').then((m) => m.PortalBoletas),
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
