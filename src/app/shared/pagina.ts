/** Respuesta paginada de la API (`?page=&size=&sort=`). */
export interface Pagina<T> {
  contenido: T[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
}
