import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { NotificacionService } from '../../core/http/notificacion.service';
import { EncabezadoPagina } from '../../shared/encabezado-pagina';
import { EmpleadosService, ResultadoImportacion } from './empleados.service';

const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAXIMO_BYTES = 5 * 1024 * 1024;

/** Importación masiva: primero se valida (simulación) y después se importan las filas válidas. */
@Component({
  selector: 'app-empleados-importar',
  imports: [RouterLink, MatButtonModule, EncabezadoPagina],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-encabezado-pagina
      titulo="Importar empleados"
      subtitulo="Carga masiva desde un archivo de Excel (.xlsx)"
    >
      <a mat-stroked-button routerLink="/panel/empleados">Volver a la lista</a>
    </app-encabezado-pagina>

    <div class="pila">
      <section class="tarjeta">
        <h2>1. Prepara el archivo</h2>
        <p>
          Descarga la plantilla, complétala con un empleado por fila y guárdala como .xlsx. Primero
          validaremos el archivo; no se crea nada hasta que lo confirmes.
        </p>
        <button mat-stroked-button type="button" (click)="descargarPlantilla()">
          Descargar plantilla
        </button>
      </section>

      <section class="tarjeta">
        <h2>2. Valida el archivo</h2>
        <label class="archivo" for="archivo-importacion">Archivo de Excel</label>
        <input
          id="archivo-importacion"
          type="file"
          [accept]="'.xlsx,' + tipoXlsx"
          (change)="elegir($event)"
        />
        @if (errorArchivo(); as m) {
          <p class="aviso aviso--error" role="alert">{{ m }}</p>
        }
        <div class="acciones-form">
          <button
            mat-flat-button
            type="button"
            [disabled]="!archivo() || trabajando()"
            (click)="validar()"
          >
            Validar archivo
          </button>
        </div>
      </section>

      @if (resultado(); as r) {
        <section class="tarjeta" aria-live="polite">
          <h2>{{ r.simulacion ? '3. Resultado de la validación' : 'Importación terminada' }}</h2>
          <ul class="cifras">
            <li>
              <strong>{{ r.totalFilas }}</strong> filas leídas
            </li>
            <li>
              <strong>{{ r.validas }}</strong> válidas
            </li>
            <li>
              <strong>{{ r.errores.length }}</strong> con errores
            </li>
            @if (!r.simulacion) {
              <li>
                <strong>{{ r.importadas }}</strong> importadas
              </li>
            }
          </ul>
          @if (r.errores.length > 0) {
            <div class="tabla-caja">
              <table class="tabla">
                <caption class="solo-lector">
                  Errores por fila
                </caption>
                <thead>
                  <tr>
                    <th scope="col" class="cifra">Fila</th>
                    <th scope="col">Campo</th>
                    <th scope="col">Problema</th>
                  </tr>
                </thead>
                <tbody>
                  @for (e of r.errores; track $index) {
                    <tr>
                      <td class="cifra">{{ e.fila }}</td>
                      <td>{{ e.campo || '—' }}</td>
                      <td>{{ e.mensaje }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          @if (r.simulacion) {
            <div class="acciones-form">
              <button
                mat-flat-button
                type="button"
                [disabled]="r.validas === 0 || trabajando()"
                (click)="importar()"
              >
                Importar {{ r.validas }} filas válidas
              </button>
            </div>
            @if (r.errores.length > 0 && r.validas > 0) {
              <p class="aviso aviso--advertencia">
                Las filas con errores no se importarán. Corrígelas en el archivo y vuelve a
                cargarlo.
              </p>
            }
          } @else {
            <a mat-flat-button routerLink="/panel/empleados">Ver empleados</a>
          }
        </section>
      }
    </div>
  `,
  styles: `
    p {
      margin: 0 0 12px;
      color: var(--color-texto-secundario);
    }
    .archivo {
      display: block;
      margin-bottom: 4px;
      font-weight: 500;
    }
    .cifras {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      margin: 0 0 16px;
      padding: 0;
      list-style: none;
    }
  `,
})
export class EmpleadosImportar {
  private readonly servicio = inject(EmpleadosService);
  private readonly avisos = inject(NotificacionService);

  protected readonly tipoXlsx = TIPO_XLSX;
  protected readonly archivo = signal<File | null>(null);
  protected readonly errorArchivo = signal<string | null>(null);
  protected readonly trabajando = signal(false);
  protected readonly resultado = signal<ResultadoImportacion | null>(null);

  protected elegir(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const f = entrada.files?.[0] ?? null;
    this.resultado.set(null);
    this.errorArchivo.set(null);
    this.archivo.set(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.xlsx')) {
      this.errorArchivo.set('El archivo debe ser un Excel (.xlsx).');
      return;
    }
    if (f.size > MAXIMO_BYTES) {
      this.errorArchivo.set('El archivo supera los 5 MB permitidos.');
      return;
    }
    this.archivo.set(f);
  }

  protected descargarPlantilla(): void {
    this.servicio.plantillaImportacion().subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla-empleados.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  protected validar(): void {
    this.ejecutar(true);
  }

  protected importar(): void {
    this.ejecutar(false);
  }

  private ejecutar(simular: boolean): void {
    const f = this.archivo();
    if (!f) return;
    this.trabajando.set(true);
    this.servicio.importar(f, simular).subscribe({
      next: (r) => {
        this.trabajando.set(false);
        this.resultado.set(r);
        if (!simular) this.avisos.exito(`Se importaron ${r.importadas} empleados.`);
      },
      error: () => this.trabajando.set(false),
    });
  }
}
