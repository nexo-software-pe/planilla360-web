import { API_PRUEBA, montarServicio, probarPeticiones } from '../../shared/servicio.testing';
import { Area, CatalogoService } from './catalogo.service';

const cargo = { areaId: 'a1', nombre: 'Analista', sueldoReferencial: 3500 };

probarPeticiones(CatalogoService, [
  {
    nombre: 'crea un área',
    llamar: (s) => s.crearArea('Ventas'),
    metodo: 'POST',
    ruta: '/areas',
    cuerpo: { nombre: 'Ventas' },
  },
  {
    nombre: 'actualiza un área',
    llamar: (s) => s.actualizarArea('a1', 'Comercial'),
    metodo: 'PUT',
    ruta: '/areas/a1',
    cuerpo: { nombre: 'Comercial' },
  },
  {
    nombre: 'elimina un área',
    llamar: (s) => s.eliminarArea('a1'),
    metodo: 'DELETE',
    ruta: '/areas/a1',
  },
  {
    nombre: 'crea un cargo',
    llamar: (s) => s.crearCargo(cargo),
    metodo: 'POST',
    ruta: '/cargos',
    cuerpo: cargo,
  },
  {
    nombre: 'actualiza un cargo',
    llamar: (s) => s.actualizarCargo('c1', cargo),
    metodo: 'PUT',
    ruta: '/cargos/c1',
    cuerpo: cargo,
  },
  {
    nombre: 'elimina un cargo',
    llamar: (s) => s.eliminarCargo('c1'),
    metodo: 'DELETE',
    ruta: '/cargos/c1',
  },
  { nombre: 'lista las AFP', llamar: (s) => s.afps(), metodo: 'GET', ruta: '/afps', respuesta: [] },
]);

describe('CatalogoService (memoria)', () => {
  const pagina = (contenido: unknown[]) => ({
    contenido,
    pagina: 0,
    tamano: 200,
    totalElementos: contenido.length,
    totalPaginas: 1,
  });

  it('lee las áreas una sola vez y entrega el contenido de la página', () => {
    const { servicio, http } = montarServicio(CatalogoService);
    const recibidas: Area[][] = [];
    servicio.areas().subscribe((a) => recibidas.push(a));
    servicio.areas().subscribe((a) => recibidas.push(a));

    http.expectOne(`${API_PRUEBA}/areas?size=200`).flush(pagina([{ id: 'a1', nombre: 'Ventas' }]));

    expect(recibidas).toEqual([[{ id: 'a1', nombre: 'Ventas' }], [{ id: 'a1', nombre: 'Ventas' }]]);
    http.verify();
  });

  it('vuelve a leer las áreas tras crear o actualizar una', () => {
    const { servicio, http } = montarServicio(CatalogoService);
    servicio.areas().subscribe();
    http.expectOne(`${API_PRUEBA}/areas?size=200`).flush(pagina([]));

    servicio.crearArea('Ventas').subscribe();
    http.expectOne({ method: 'POST', url: `${API_PRUEBA}/areas` }).flush({ id: 'a1' });
    servicio.areas().subscribe();
    http.expectOne(`${API_PRUEBA}/areas?size=200`).flush(pagina([{ id: 'a1', nombre: 'Ventas' }]));

    servicio.actualizarArea('a1', 'Comercial').subscribe();
    http.expectOne({ method: 'PUT', url: `${API_PRUEBA}/areas/a1` }).flush({ id: 'a1' });
    servicio.areas().subscribe();
    http.expectOne(`${API_PRUEBA}/areas?size=200`).flush(pagina([]));
    http.verify();
  });

  it('lee los cargos una sola vez y vuelve a leer tras modificar', () => {
    const { servicio, http } = montarServicio(CatalogoService);
    servicio.cargos().subscribe();
    servicio.cargos().subscribe();
    http.expectOne(`${API_PRUEBA}/cargos?size=200`).flush(pagina([]));

    servicio.eliminarCargo('c1').subscribe();
    http.expectOne({ method: 'DELETE', url: `${API_PRUEBA}/cargos/c1` }).flush(null);

    servicio.cargos().subscribe();
    http.expectOne(`${API_PRUEBA}/cargos?size=200`).flush(pagina([]));
    http.verify();
  });
});
