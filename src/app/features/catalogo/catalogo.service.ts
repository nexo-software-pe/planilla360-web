import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay, tap } from 'rxjs';
import { API_URL } from '../../core/config/api-url';
import { Pagina } from '../../shared/pagina';

export interface Area {
  id: string;
  nombre: string;
}

export interface Cargo {
  id: string;
  areaId: string;
  nombre: string;
  sueldoReferencial: number;
}

export interface Afp {
  id: string;
  nombre: string;
  comisionFlujo: number;
  comisionMixta: number;
  vigenteDesde: string;
}

/** Áreas y cargos de la empresa activa. Las listas se guardan en memoria hasta que se modifican. */
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);

  private areas$: Observable<Area[]> | null = null;
  private cargos$: Observable<Cargo[]> | null = null;

  areas(): Observable<Area[]> {
    this.areas$ ??= this.http
      .get<Pagina<Area>>(`${this.api}/areas`, { params: new HttpParams().set('size', 200) })
      .pipe(
        map((p) => p.contenido),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.areas$;
  }

  cargos(): Observable<Cargo[]> {
    this.cargos$ ??= this.http
      .get<Pagina<Cargo>>(`${this.api}/cargos`, { params: new HttpParams().set('size', 200) })
      .pipe(
        map((p) => p.contenido),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.cargos$;
  }

  crearArea(nombre: string): Observable<Area> {
    return this.http.post<Area>(`${this.api}/areas`, { nombre }).pipe(tap(() => this.olvidar()));
  }

  actualizarArea(id: string, nombre: string): Observable<Area> {
    return this.http
      .put<Area>(`${this.api}/areas/${id}`, { nombre })
      .pipe(tap(() => this.olvidar()));
  }

  eliminarArea(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/areas/${id}`).pipe(tap(() => this.olvidar()));
  }

  crearCargo(datos: Omit<Cargo, 'id'>): Observable<Cargo> {
    return this.http.post<Cargo>(`${this.api}/cargos`, datos).pipe(tap(() => this.olvidar()));
  }

  actualizarCargo(id: string, datos: Omit<Cargo, 'id'>): Observable<Cargo> {
    return this.http.put<Cargo>(`${this.api}/cargos/${id}`, datos).pipe(tap(() => this.olvidar()));
  }

  eliminarCargo(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/cargos/${id}`).pipe(tap(() => this.olvidar()));
  }

  afps(): Observable<Afp[]> {
    return this.http.get<Afp[]>(`${this.api}/afps`);
  }

  /** Fuerza una lectura nueva (p. ej. al cambiar de empresa o tras editar). */
  olvidar(): void {
    this.areas$ = null;
    this.cargos$ = null;
  }
}
