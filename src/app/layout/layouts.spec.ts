import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { EmpresaResumen, Rol, Usuario } from '../core/auth/auth.models';
import { AuthService } from '../core/auth/auth.service';
import { AdminLayout } from './admin/admin-layout';
import { itemsPara, NAVEGACION_ADMIN } from './navegacion';
import { PortalLayout } from './portal/portal-layout';

const empresa: EmpresaResumen = {
  id: 'e1',
  razonSocial: 'Textiles Andinos S.A.C.',
  ruc: '20123456789',
};

function authFalso(rol: Rol, cerrarSesion = vi.fn().mockReturnValue(of(undefined))) {
  const usuario: Usuario = { id: 'u', email: 'a@x.pe', nombre: 'Rosa Quispe', rol };
  return {
    usuario: signal(usuario),
    empresa: signal(empresa),
    rol: signal(rol),
    cerrarSesion,
  };
}

describe('AdminLayout', () => {
  it('muestra el menú, la empresa activa con su RUC y el usuario', async () => {
    await render(AdminLayout, {
      providers: [provideRouter([]), { provide: AuthService, useValue: authFalso('RRHH') }],
    });
    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inicio' })).toBeInTheDocument();
    expect(screen.getByText('Textiles Andinos S.A.C.')).toBeInTheDocument();
    expect(screen.getByText('RUC 20123456789')).toBeInTheDocument();
    expect(screen.getByText('Rosa Quispe')).toBeInTheDocument();
  });

  it('cierra la sesión desde el botón', async () => {
    const cerrarSesion = vi.fn().mockReturnValue(of(undefined));
    await render(AdminLayout, {
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authFalso('ADMIN_EMPRESA', cerrarSesion) },
      ],
    });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(cerrarSesion).toHaveBeenCalled();
  });
});

describe('PortalLayout', () => {
  it('muestra el saludo, la barra inferior y un botón de salir con nombre accesible', async () => {
    const cerrarSesion = vi.fn().mockReturnValue(of(undefined));
    await render(PortalLayout, {
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authFalso('EMPLEADO', cerrarSesion) },
      ],
    });
    expect(screen.getByText('Hola, Rosa Quispe')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Navegación del portal' })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(cerrarSesion).toHaveBeenCalled();
  });
});

describe('itemsPara', () => {
  it('filtra el menú por rol', () => {
    expect(itemsPara(NAVEGACION_ADMIN, 'RRHH').length).toBeGreaterThan(0);
    expect(itemsPara(NAVEGACION_ADMIN, 'EMPLEADO')).toEqual([]);
    expect(itemsPara(NAVEGACION_ADMIN, null)).toEqual([]);
  });
});
