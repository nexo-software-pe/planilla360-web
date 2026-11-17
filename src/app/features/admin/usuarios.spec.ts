import { Provider } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { proveedoresTransversales } from '../../shared/pruebas.testing';
import { EmpleadosService } from '../empleados/empleados.service';
import { AdminService, UsuarioAdmin } from './admin.service';
import { Usuarios } from './usuarios';

const usuario = (id: string, nombre: string, activo: boolean): UsuarioAdmin => ({
  id,
  email: `${nombre.toLowerCase()}@empresa.pe`,
  nombre,
  rol: 'RRHH',
  tenantId: 't1',
  empleadoId: null,
  activo,
  creadoEn: '2026-01-01T10:00:00',
  ultimoAcceso: null,
});

async function abrir(contenido = [usuario('u1', 'Rosa', true), usuario('u2', 'Luis', false)]) {
  const admin = {
    usuarios: vi.fn(() =>
      of({
        contenido,
        pagina: 0,
        tamano: 20,
        totalElementos: contenido.length,
        totalPaginas: 1,
      }),
    ),
    crearUsuario: vi.fn(() => of(usuario('u3', 'Nuevo', true))),
    actualizarUsuario: vi.fn(() => of(usuario('u1', 'Rosa Maria', true))),
    cambiarEstadoUsuario: vi.fn(() => of(usuario('u1', 'Rosa', false))),
    restablecerPassword: vi.fn(() => of(undefined)),
  };
  const t = proveedoresTransversales();
  await render(Usuarios, {
    providers: [
      { provide: AdminService, useValue: admin },
      { provide: EmpleadosService, useValue: { directorio: () => of([]) } },
      ...(t.providers as Provider[]),
    ],
  });
  return { admin, ...t, persona: userEvent.setup() };
}

describe('Usuarios', () => {
  it('lista los usuarios con su rol, estado y último acceso', async () => {
    await abrir();
    expect(await screen.findByText('rosa@empresa.pe')).toBeInTheDocument();
    expect(screen.getAllByText('Recursos Humanos')).toHaveLength(2);
    expect(screen.getAllByText('Nunca')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Desactivar a Rosa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activar a Luis' })).toBeInTheDocument();
  });

  it('indica cuando no hay usuarios', async () => {
    await abrir([]);
    expect(await screen.findByText('Aún no hay usuarios.')).toBeInTheDocument();
  });

  it('crea un usuario con los datos del formulario', async () => {
    const { admin, avisos, persona } = await abrir();
    await persona.click(await screen.findByRole('button', { name: 'Nuevo usuario' }));
    await persona.type(screen.getByRole('textbox', { name: /Nombre/ }), ' Nuevo ');
    await persona.type(screen.getByRole('textbox', { name: /Correo/ }), 'nuevo@empresa.pe');
    await persona.type(screen.getByLabelText(/Contraseña inicial/), 'Clave-segura-1234');
    await persona.click(screen.getByRole('button', { name: 'Crear usuario' }));

    expect(admin.crearUsuario).toHaveBeenCalledWith({
      nombre: 'Nuevo',
      email: 'nuevo@empresa.pe',
      password: 'Clave-segura-1234',
      rol: 'RRHH',
      empleadoId: null,
    });
    expect(avisos.exito).toHaveBeenCalledWith('Usuario creado.');
  });

  it('no crea el usuario si faltan datos', async () => {
    const { admin, persona } = await abrir();
    await persona.click(await screen.findByRole('button', { name: 'Nuevo usuario' }));
    await persona.click(screen.getByRole('button', { name: 'Crear usuario' }));
    expect(admin.crearUsuario).not.toHaveBeenCalled();
    expect((await screen.findAllByText('Este campo es obligatorio.')).length).toBeGreaterThan(0);
  });

  it('edita sin pedir correo ni contraseña', async () => {
    const { admin, persona } = await abrir();
    await persona.click(await screen.findByRole('button', { name: 'Editar a Rosa' }));
    expect(screen.getByRole('heading', { name: 'Editar usuario' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Contraseña inicial/)).toBeNull();
    const nombre = screen.getByRole('textbox', { name: /Nombre/ });
    await persona.clear(nombre);
    await persona.type(nombre, 'Rosa Maria');
    await persona.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(admin.actualizarUsuario).toHaveBeenCalledWith('u1', {
      nombre: 'Rosa Maria',
      rol: 'RRHH',
      empleadoId: null,
    });
  });

  it('desactiva tras confirmar y activa sin preguntar', async () => {
    const { admin, dialogos, persona } = await abrir();
    await persona.click(await screen.findByRole('button', { name: 'Desactivar a Rosa' }));
    expect(dialogos.confirmar).toHaveBeenCalledTimes(1);
    expect(admin.cambiarEstadoUsuario).toHaveBeenCalledWith('u1', false);

    await persona.click(screen.getByRole('button', { name: 'Activar a Luis' }));
    expect(dialogos.confirmar).toHaveBeenCalledTimes(1);
    expect(admin.cambiarEstadoUsuario).toHaveBeenCalledWith('u2', true);
  });

  it('restablece la contraseña con la clave pedida en el diálogo', async () => {
    const { admin, avisos, persona } = await abrir();
    await persona.click(
      await screen.findByRole('button', { name: 'Restablecer contraseña de Rosa' }),
    );
    expect(admin.restablecerPassword).toHaveBeenCalledWith('u1', 'Clave-nueva-123');
    expect(avisos.exito).toHaveBeenCalledWith('Contraseña restablecida.');
  });
});
