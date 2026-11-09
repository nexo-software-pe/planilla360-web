import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  EMPTY,
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { API_URL } from '../config/api-url';
import { ApiError } from '../http/api-error';
import { OMITIR_CARGA, OMITIR_TOAST } from '../http/contexto-http';
import { NotificacionService } from '../http/notificacion.service';
import { AlmacenTokens } from './almacen-tokens';
import { EmpresaResumen, Perfil, Rol, TokenResponse, Usuario } from './auth.models';

const SIN_AVISO = new HttpContext().set(OMITIR_TOAST, true);

/**
 * Sesión del usuario. El access token vive solo en memoria; el refresh token en el almacén
 * local para sobrevivir a una recarga. El refresh es de "vuelo único": si varias peticiones
 * reciben 401 a la vez, comparten una sola llamada a `/auth/refresh`.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly api = inject(API_URL);
  private readonly almacen = inject(AlmacenTokens);
  private readonly notificaciones = inject(NotificacionService);

  private accessToken: string | null = null;
  private refrescando$: Observable<string> | null = null;

  private readonly _usuario = signal<Usuario | null>(null);
  private readonly _empresa = signal<EmpresaResumen | null>(null);

  readonly usuario = this._usuario.asReadonly();
  readonly empresa = this._empresa.asReadonly();
  readonly autenticado = computed(() => this._usuario() !== null);
  readonly rol = computed<Rol | null>(() => this._usuario()?.rol ?? null);

  token(): string | null {
    return this.accessToken;
  }

  tieneRefresh(): boolean {
    return this.almacen.leerRefresh() !== null;
  }

  iniciarSesion(email: string, password: string): Observable<Usuario> {
    return this.http
      .post<TokenResponse>(`${this.api}/auth/login`, { email, password }, { context: SIN_AVISO })
      .pipe(
        tap((t) => this.guardarTokens(t)),
        switchMap((t) =>
          this.cargarPerfil().pipe(
            map(() => t.usuario),
            catchError((e: unknown) => {
              this.limpiar();
              return throwError(() => e);
            }),
          ),
        ),
      );
  }

  /** Pide un access token nuevo con el refresh token guardado (rotación incluida). */
  refrescar(): Observable<string> {
    if (this.refrescando$) return this.refrescando$;
    const refreshToken = this.almacen.leerRefresh();
    if (!refreshToken) return throwError(() => new Error('No hay sesión para renovar.'));
    this.refrescando$ = this.http
      .post<TokenResponse>(
        `${this.api}/auth/refresh`,
        { refreshToken },
        { context: SIN_AVISO.set(OMITIR_CARGA, true) },
      )
      .pipe(
        tap((t) => this.guardarTokens(t)),
        map((t) => t.accessToken),
        catchError((e: unknown) => {
          // solo un rechazo del servidor invalida la sesión; un corte de red no
          if (e instanceof ApiError && e.estado >= 400 && e.estado < 500) this.limpiar();
          return throwError(() => e);
        }),
        finalize(() => (this.refrescando$ = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.refrescando$;
  }

  /** Al arrancar la app: si hay refresh token, recupera la sesión sin pedir credenciales. */
  restaurarSesion(): Observable<void> {
    if (!this.tieneRefresh()) return of(undefined);
    return this.refrescar().pipe(
      switchMap(() => this.cargarPerfil()),
      map(() => undefined),
      catchError(() => of(undefined)),
    );
  }

  cargarPerfil(): Observable<Perfil> {
    return this.http.get<Perfil>(`${this.api}/auth/me`, { context: SIN_AVISO }).pipe(
      tap((p) => {
        this._usuario.set(p.usuario);
        this._empresa.set(p.empresa ?? null);
      }),
    );
  }

  cerrarSesion(): Observable<void> {
    const refreshToken = this.almacen.leerRefresh();
    const aviso$: Observable<unknown> = refreshToken
      ? this.http.post(`${this.api}/auth/logout`, { refreshToken }, { context: SIN_AVISO })
      : of(null);
    return aviso$.pipe(
      catchError(() => EMPTY),
      finalize(() => {
        this.limpiar();
        void this.router.navigate(['/login']);
      }),
      map(() => undefined),
    );
  }

  /** El refresh falló: se avisa y se manda al login recordando a dónde iba. */
  sesionExpirada(): void {
    const destino = this.router.url;
    this.limpiar();
    this.notificaciones.info('Tu sesión expiró. Inicia sesión nuevamente.');
    void this.router.navigate(['/login'], {
      queryParams: destino && !destino.startsWith('/login') ? { returnUrl: destino } : {},
    });
  }

  private guardarTokens(t: TokenResponse): void {
    this.accessToken = t.accessToken;
    this.almacen.guardarRefresh(t.refreshToken);
    this._usuario.set(t.usuario);
  }

  private limpiar(): void {
    this.accessToken = null;
    this.almacen.borrar();
    this._usuario.set(null);
    this._empresa.set(null);
  }
}
