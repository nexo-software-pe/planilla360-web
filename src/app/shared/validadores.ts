import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** DNI peruano: exactamente 8 dígitos. */
export const dniValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = String(control.value ?? '').trim();
  if (valor === '') return null; // la obligatoriedad la decide `Validators.required`
  return /^\d{8}$/.test(valor) ? null : { dni: true };
};

/** RUC peruano: 11 dígitos que empiezan por 10, 15, 16, 17 o 20, con dígito verificador. */
export const rucValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = String(control.value ?? '').trim();
  if (valor === '') return null;
  if (!/^(10|15|16|17|20)\d{9}$/.test(valor)) return { ruc: true };
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((acc, peso, i) => acc + peso * Number(valor[i]), 0);
  const verificador = (11 - (suma % 11)) % 10;
  return verificador === Number(valor[10]) ? null : { ruc: true };
};

/** Teléfono: de 7 a 15 dígitos, con `+`, espacios y guiones opcionales. */
export const telefonoValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const valor = String(control.value ?? '').trim();
  if (valor === '') return null;
  const digitos = valor.replace(/[\s+-]/g, '');
  return /^\d{7,15}$/.test(digitos) ? null : { telefono: true };
};

/** Contraseña de la API: 10–72 caracteres con al menos una letra y un número. */
export const passwordValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const valor = String(control.value ?? '');
  if (valor === '') return null;
  return /^(?=.*[A-Za-z])(?=.*\d).{10,72}$/.test(valor) ? null : { password: true };
};

/** Fecha que no puede ser posterior a hoy (nacimientos). */
export function noFuturaValidator(hoy: () => string): ValidatorFn {
  return (control) => {
    const valor = String(control.value ?? '');
    return valor !== '' && valor > hoy() ? { futura: true } : null;
  };
}

/** Grupo con `desde`/`hasta`: la fecha final no puede ser anterior a la inicial. */
export const rangoFechasValidator: ValidatorFn = (grupo) => {
  const desde = String(grupo.get('desde')?.value ?? '');
  const hasta = String(grupo.get('hasta')?.value ?? '');
  return desde !== '' && hasta !== '' && hasta < desde ? { rango: true } : null;
};

/** Mensaje de error de un control, en español, listo para `<mat-error>`. */
export function mensajeDeError(control: AbstractControl | null): string {
  const e = control?.errors;
  if (!e) return '';
  if (e['required']) return 'Este campo es obligatorio.';
  if (e['dni']) return 'El DNI debe tener 8 dígitos.';
  if (e['ruc']) return 'El RUC no es válido: 11 dígitos con dígito verificador.';
  if (e['telefono']) return 'Ingresa un teléfono de 7 a 15 dígitos.';
  if (e['email']) return 'Ingresa un correo válido.';
  if (e['password']) return 'Mínimo 10 caracteres, con letras y números.';
  if (e['futura']) return 'La fecha no puede ser futura.';
  if (e['maxlength']) {
    return `Máximo ${(e['maxlength'] as { requiredLength: number }).requiredLength} caracteres.`;
  }
  if (e['min']) return `El valor mínimo es ${(e['min'] as { min: number }).min}.`;
  if (e['servidor']) return String(e['servidor']);
  return 'Valor no válido.';
}
