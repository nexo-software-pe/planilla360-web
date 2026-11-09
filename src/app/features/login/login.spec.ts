import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Subject, of, throwError } from 'rxjs';
import { Usuario } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/http/api-error';
import { Login, destinoSeguro } from './login';

const rrhh: Usuario = { id: '1', email: 'rrhh@x.pe', nombre: 'Rosa', rol: 'RRHH' };
const empleado: Usuario = { id: '2', email: 'emp@x.pe', nombre: 'Eli', rol: 'EMPLEADO' };

async function abrir(auth: Partial<AuthService>, returnUrl: string | null = null) {
  const vista = await render(Login, {
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: auth },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}) },
        },
      },
    ],
  });
  const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  return { ...vista, navegar, usuario: userEvent.setup() };
}

describe('Login', () => {
  it('tiene campos con etiqueta y un botón real', async () => {
    await abrir({ iniciarSesion: vi.fn() });
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
  });

  it('no envía y muestra los errores si el formulario está vacío', async () => {
    const iniciarSesion = vi.fn();
    const { usuario } = await abrir({ iniciarSesion });
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(iniciarSesion).not.toHaveBeenCalled();
    expect(await screen.findByText('Ingresa tu correo.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu contraseña.')).toBeInTheDocument();
  });

  it('rechaza un correo mal escrito', async () => {
    const iniciarSesion = vi.fn();
    const { usuario } = await abrir({ iniciarSesion });
    await usuario.type(screen.getByLabelText('Correo electrónico'), 'no-es-correo');
    await usuario.type(screen.getByLabelText('Contraseña'), 'clave');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(iniciarSesion).not.toHaveBeenCalled();
    expect(await screen.findByText('Ingresa un correo válido.')).toBeInTheDocument();
  });

  it.each([
    [rrhh, '/panel'],
    [empleado, '/portal'],
  ])('al ingresar lleva a %o hacia %s', async (user, destino) => {
    const iniciarSesion = vi.fn().mockReturnValue(of(user));
    const { usuario, navegar } = await abrir({ iniciarSesion });
    await usuario.type(screen.getByLabelText('Correo electrónico'), '  persona@x.pe ');
    await usuario.type(screen.getByLabelText('Contraseña'), 'clave');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(iniciarSesion).toHaveBeenCalledWith('persona@x.pe', 'clave');
    expect(navegar).toHaveBeenCalledWith(destino);
  });

  it('vuelve a la ruta pedida originalmente (returnUrl)', async () => {
    const iniciarSesion = vi.fn().mockReturnValue(of(rrhh));
    const { usuario, navegar } = await abrir({ iniciarSesion }, '/panel/empleados');
    await usuario.type(screen.getByLabelText('Correo electrónico'), 'a@x.pe');
    await usuario.type(screen.getByLabelText('Contraseña'), 'clave');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(navegar).toHaveBeenCalledWith('/panel/empleados');
  });

  it('muestra un mensaje claro cuando las credenciales son incorrectas', async () => {
    const iniciarSesion = vi
      .fn()
      .mockReturnValue(throwError(() => new ApiError(401, 'No autorizado', 'Bad credentials')));
    const { usuario, navegar } = await abrir({ iniciarSesion });
    await usuario.type(screen.getByLabelText('Correo electrónico'), 'a@x.pe');
    await usuario.type(screen.getByLabelText('Contraseña'), 'mala');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
    expect(navegar).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled();
  });

  it('muestra el mensaje de la API cuando la cuenta está bloqueada', async () => {
    const iniciarSesion = vi
      .fn()
      .mockReturnValue(
        throwError(() => new ApiError(423, 'Cuenta bloqueada', 'Cuenta bloqueada por intentos.')),
      );
    const { usuario } = await abrir({ iniciarSesion });
    await usuario.type(screen.getByLabelText('Correo electrónico'), 'a@x.pe');
    await usuario.type(screen.getByLabelText('Contraseña'), 'mala');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cuenta bloqueada por intentos.');
  });

  it('deshabilita el botón mientras envía (evita doble clic)', async () => {
    const respuesta = new Subject<Usuario>();
    const iniciarSesion = vi.fn().mockReturnValue(respuesta);
    const { usuario } = await abrir({ iniciarSesion });
    await usuario.type(screen.getByLabelText('Correo electrónico'), 'a@x.pe');
    await usuario.type(screen.getByLabelText('Contraseña'), 'clave');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(screen.getByRole('button', { name: 'Ingresando…' })).toBeDisabled();
    expect(iniciarSesion).toHaveBeenCalledTimes(1);
  });
});

describe('destinoSeguro', () => {
  it.each([
    ['/panel', '/panel'],
    ['https://malo.com', null],
    ['//malo.com', null],
    ['', null],
    [null, null],
  ])('%s → %s', (entrada, esperado) => {
    expect(destinoSeguro(entrada)).toBe(esperado);
  });
});
