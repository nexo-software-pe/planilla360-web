import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { App } from './app';
import { CargaService } from './core/http/carga.service';

describe('App', () => {
  it('no muestra el indicador de carga sin peticiones', async () => {
    await render(App, { providers: [provideRouter([])] });
    expect(screen.queryByRole('progressbar', { name: 'Cargando' })).not.toBeInTheDocument();
  });

  it('muestra el indicador global mientras hay peticiones en curso', async () => {
    await render(App, {
      providers: [provideRouter([]), { provide: CargaService, useValue: { activa: signal(true) } }],
    });
    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeInTheDocument();
  });
});
