import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { Empleado, EmpleadosService } from '../empleados/empleados.service';
import { Bandeja } from './bandeja';
import { Permiso, SolicitudVacaciones, VacacionesService } from './vacaciones.service';

const empleado = (id: string, nombres: string, jefeId: string | null): Empleado => ({
  id,
  dni: '12345678',
  nombres,
  apellidos: 'Prueba',
  fechaNacimiento: '1990-01-01',
  email: null,
  telefono: null,
  fechaIngreso: '2020-01-01',
  fechaCese: null,
  areaId: 'a',
  cargoId: 'c',
  jefeId,
  estado: 'ACTIVO',
});

const solicitud = (id: string, empleadoId: string, estado: SolicitudVacaciones['estado']) =>
  ({
    id,
    empleadoId,
    periodoId: 'p',
    desde: '2026-12-01',
    hasta: '2026-12-10',
    dias: 10,
    estado,
    motivoRechazo: null,
  }) satisfies SolicitudVacaciones;

const permiso: Permiso = {
  id: 'pm1',
  empleadoId: 'e1',
  tipo: 'PERSONAL',
  desde: '2026-11-14',
  hasta: '2026-11-14',
  dias: 1,
  conGoce: false,
  motivo: null,
  estado: 'SOLICITADO',
  motivoRechazo: null,
};

async function abrir() {
  const vacaciones = {
    solicitudes: vi.fn((estado: string) =>
      of(
        estado === 'APROBADA_JEFE'
          ? [solicitud('s1', 'e1', 'APROBADA_JEFE')]
          : [solicitud('s2', 'e2', 'SOLICITADA'), solicitud('s3', 'e3', 'SOLICITADA')],
      ),
    ),
    permisos: vi.fn(() => of([permiso])),
    aprobarRrhh: vi.fn(() => of(solicitud('s1', 'e1', 'APROBADA_RRHH'))),
    aprobarJefe: vi.fn(() => of(solicitud('s2', 'e2', 'APROBADA_JEFE'))),
    aprobarPermiso: vi.fn(() => of({ ...permiso, estado: 'APROBADO' })),
  };
  const empleados = {
    directorio: () =>
      of([
        empleado('e1', 'Ana', 'jefe'),
        empleado('e2', 'Beto', null), // sin jefe: RRHH puede suplirlo
        empleado('e3', 'Carla', 'jefe'), // con jefe: se espera su aprobación
      ]),
  };
  await render(Bandeja, {
    providers: [
      { provide: VacacionesService, useValue: vacaciones },
      { provide: EmpleadosService, useValue: empleados },
    ],
  });
  return { vacaciones, usuario: userEvent.setup() };
}

describe('Bandeja de aprobación', () => {
  it('lista las solicitudes con el nombre del empleado y su estado', async () => {
    await abrir();
    expect((await screen.findAllByText('Prueba, Ana')).length).toBe(2); // una solicitud y un permiso
    expect(screen.getByText('Aprobada por jefe')).toBeInTheDocument();
    expect(screen.getAllByText('Solicitada')).toHaveLength(2);
    expect(screen.getByText('Sin goce')).toBeInTheDocument();
  });

  it('RRHH da la aprobación final cuando el jefe ya aprobó', async () => {
    const { vacaciones, usuario } = await abrir();
    await usuario.click(
      await screen.findByRole('button', { name: /Dar aprobación final a Prueba, Ana/ }),
    );
    expect(vacaciones.aprobarRrhh).toHaveBeenCalledWith('s1');
  });

  it('solo permite aprobar como jefe si el empleado no tiene jefe', async () => {
    const { vacaciones, usuario } = await abrir();
    expect(
      await screen.findByRole('button', { name: /Aprobar como jefe a Prueba, Beto/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprobar como jefe a Prueba, Carla/ })).toBeNull();
    expect(screen.getByText('Espera al jefe directo')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /Aprobar como jefe a Prueba, Beto/ }));
    expect(vacaciones.aprobarJefe).toHaveBeenCalledWith('s2');
  });

  it('aprueba un permiso desde su propia tabla', async () => {
    const { vacaciones, usuario } = await abrir();
    const tabla = within((await screen.findByText('Permisos por aprobar')).closest('section')!);
    await usuario.click(tabla.getByRole('button', { name: /Aprobar permiso de Prueba, Ana/ }));
    expect(vacaciones.aprobarPermiso).toHaveBeenCalledWith('pm1');
  });
});
