import { Empleado, EmpleadosService, indexarPorId } from './empleados.service';
import { API_PRUEBA, montarServicio, probarPeticiones } from '../../shared/servicio.testing';

const contrato = {
  tipo: 'INDEFINIDO',
  fechaInicio: '2026-01-01',
  fechaFin: null,
  sueldoBasico: 3000,
  jornadaSemanal: 48,
  diasLaborables: 6,
  regimenPensionario: 'ONP',
  afpId: null,
  tipoComision: null,
  cuspp: null,
} as const;

const datosEmpleado = {
  dni: '12345678',
  nombres: 'Ana',
  apellidos: 'Quispe',
  fechaNacimiento: '1990-05-01',
  email: null,
  telefono: null,
  fechaIngreso: '2024-01-01',
  areaId: 'a1',
  cargoId: 'c1',
  jefeId: null,
};

const empleado = (id: string, nombres: string): Empleado => ({
  ...datosEmpleado,
  id,
  nombres,
  estado: 'ACTIVO',
  fechaCese: null,
});

const pagina = (contenido: Empleado[], numero = 0, totalPaginas = 1) => ({
  contenido,
  pagina: numero,
  tamano: 100,
  totalElementos: contenido.length,
  totalPaginas,
});

probarPeticiones(EmpleadosService, [
  {
    nombre: 'lista omitiendo filtros vacíos',
    llamar: (s) => s.listar({ q: 'ana', estado: '', areaId: undefined }, 2, 25),
    metodo: 'GET',
    ruta: '/empleados?page=2&size=25&sort=apellidos,asc&q=ana',
  },
  { nombre: 'obtiene uno', llamar: (s) => s.obtener('e1'), metodo: 'GET', ruta: '/empleados/e1' },
  {
    nombre: 'crea',
    llamar: (s) => s.crear(datosEmpleado),
    metodo: 'POST',
    ruta: '/empleados',
    cuerpo: datosEmpleado,
  },
  {
    nombre: 'actualiza',
    llamar: (s) => s.actualizar('e1', datosEmpleado),
    metodo: 'PUT',
    ruta: '/empleados/e1',
  },
  {
    nombre: 'cesa',
    llamar: (s) => s.cesar('e1', '2026-06-30'),
    metodo: 'PATCH',
    ruta: '/empleados/e1/cese',
    cuerpo: { fechaCese: '2026-06-30' },
  },
  {
    nombre: 'lista contratos',
    llamar: (s) => s.contratos('e1'),
    metodo: 'GET',
    ruta: '/empleados/e1/contratos',
    respuesta: [],
  },
  {
    nombre: 'crea un contrato',
    llamar: (s) => s.crearContrato('e1', contrato),
    metodo: 'POST',
    ruta: '/empleados/e1/contratos',
    cuerpo: contrato,
  },
  {
    nombre: 'lista familiares',
    llamar: (s) => s.familiares('e1'),
    metodo: 'GET',
    ruta: '/empleados/e1/familiares',
    respuesta: [],
  },
  {
    nombre: 'crea un familiar',
    llamar: (s) =>
      s.crearFamiliar('e1', {
        nombres: 'Luz',
        parentesco: 'HIJO',
        fechaNacimiento: '2015-01-01',
        estudia: true,
      }),
    metodo: 'POST',
    ruta: '/empleados/e1/familiares',
  },
  {
    nombre: 'consulta un DNI',
    llamar: (s) => s.consultarDni('12345678'),
    metodo: 'GET',
    ruta: '/consultas/dni/12345678',
  },
  {
    nombre: 'importa en simulación',
    llamar: (s) => s.importar(new File(['x'], 'e.xlsx'), true),
    metodo: 'POST',
    ruta: '/importaciones/empleados?simular=true',
  },
  {
    nombre: 'descarga la plantilla de importación',
    llamar: (s) => s.plantillaImportacion(),
    metodo: 'GET',
    ruta: '/importaciones/empleados/plantilla.xlsx',
    respuesta: new Blob(['x']),
  },
]);

describe('EmpleadosService (directorio)', () => {
  it('recorre todas las páginas y junta los empleados', () => {
    const { servicio, http } = montarServicio(EmpleadosService);
    let recibido: Empleado[] = [];
    servicio.directorio().subscribe((d) => (recibido = d));

    http
      .expectOne(`${API_PRUEBA}/empleados?page=0&size=100&sort=apellidos,asc`)
      .flush(pagina([empleado('e1', 'Ana')], 0, 2));
    http
      .expectOne(`${API_PRUEBA}/empleados?page=1&size=100&sort=apellidos,asc`)
      .flush(pagina([empleado('e2', 'Beto')], 1, 2));

    expect(recibido.map((e) => e.id)).toEqual(['e1', 'e2']);
    http.verify();
  });

  it('guarda el directorio en memoria hasta que se modifica un empleado', () => {
    const { servicio, http } = montarServicio(EmpleadosService);

    servicio.directorio().subscribe();
    http.expectOne((r) => r.method === 'GET').flush(pagina([empleado('e1', 'Ana')]));
    servicio.directorio().subscribe();
    http.expectNone((r) => r.method === 'GET');

    servicio.crear(datosEmpleado).subscribe();
    http.expectOne((r) => r.method === 'POST').flush(empleado('e2', 'Beto'));
    servicio.directorio().subscribe();
    http.expectOne((r) => r.method === 'GET').flush(pagina([empleado('e1', 'Ana')]));
    http.verify();
  });

  it('una importación real invalida el directorio y una simulación no', () => {
    const { servicio, http } = montarServicio(EmpleadosService);
    const resultado = { totalFilas: 1, validas: 1, importadas: 1, simulacion: false, errores: [] };
    servicio.directorio().subscribe();
    http.expectOne((r) => r.method === 'GET').flush(pagina([]));

    servicio.importar(new File(['x'], 'e.xlsx'), true).subscribe();
    http.expectOne((r) => r.method === 'POST').flush(resultado);
    servicio.directorio().subscribe();
    http.expectNone((r) => r.method === 'GET');

    servicio.importar(new File(['x'], 'e.xlsx'), false).subscribe();
    http.expectOne((r) => r.method === 'POST').flush(resultado);
    servicio.directorio().subscribe();
    http.expectOne((r) => r.method === 'GET').flush(pagina([]));
    http.verify();
  });
});

describe('utilidades de empleados', () => {
  it('arma el nombre completo como «Apellidos, Nombres»', () => {
    expect(EmpleadosService.nombreCompleto({ nombres: 'Ana', apellidos: 'Quispe' })).toBe(
      'Quispe, Ana',
    );
  });

  it('indexa por id', () => {
    const indice = indexarPorId([empleado('e1', 'Ana'), empleado('e2', 'Beto')]);
    expect(indice.get('e2')?.nombres).toBe('Beto');
    expect(indice.size).toBe(2);
  });
});
