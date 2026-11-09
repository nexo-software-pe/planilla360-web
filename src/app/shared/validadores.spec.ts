import { FormControl } from '@angular/forms';
import {
  dniValidator,
  mensajeDeError,
  noFuturaValidator,
  passwordValidator,
  rucValidator,
  telefonoValidator,
} from './validadores';

const control = (valor: string) => new FormControl(valor);

describe('validadores', () => {
  describe('DNI', () => {
    it.each(['12345678', '00000001'])('acepta %s', (dni) => {
      expect(dniValidator(control(dni))).toBeNull();
    });

    it.each(['1234567', '123456789', '1234567a', ' 1234 678'])('rechaza %s', (dni) => {
      expect(dniValidator(control(dni))).toEqual({ dni: true });
    });

    it('deja pasar el vacío (lo exige Validators.required)', () => {
      expect(dniValidator(control(''))).toBeNull();
    });
  });

  describe('RUC', () => {
    it.each(['20601234565', '20100070970'])('acepta el RUC válido %s', (ruc) => {
      expect(rucValidator(control(ruc))).toBeNull();
    });

    it('rechaza un dígito verificador incorrecto', () => {
      expect(rucValidator(control('20601234566'))).toEqual({ ruc: true });
    });

    it('rechaza un prefijo que no existe y longitudes incorrectas', () => {
      expect(rucValidator(control('30601234565'))).toEqual({ ruc: true });
      expect(rucValidator(control('2060123456'))).toEqual({ ruc: true });
    });
  });

  describe('teléfono', () => {
    it.each(['987654321', '+51 987 654 321', '01-2345678'])('acepta %s', (t) => {
      expect(telefonoValidator(control(t))).toBeNull();
    });

    it('rechaza letras y números muy cortos', () => {
      expect(telefonoValidator(control('abc'))).toEqual({ telefono: true });
      expect(telefonoValidator(control('12345'))).toEqual({ telefono: true });
    });
  });

  describe('contraseña', () => {
    it('exige 10 caracteres con letras y números, como la API', () => {
      expect(passwordValidator(control('Clave12345'))).toBeNull();
      expect(passwordValidator(control('corta1'))).toEqual({ password: true });
      expect(passwordValidator(control('sololetrassololetras'))).toEqual({ password: true });
      expect(passwordValidator(control('12345678901234'))).toEqual({ password: true });
    });
  });

  describe('fecha no futura', () => {
    const validar = noFuturaValidator(() => '2026-11-09');

    it('acepta hoy y el pasado, rechaza el futuro', () => {
      expect(validar(control('2026-11-09'))).toBeNull();
      expect(validar(control('1990-01-01'))).toBeNull();
      expect(validar(control('2026-11-10'))).toEqual({ futura: true });
    });
  });

  describe('mensajeDeError', () => {
    it('traduce cada error a un texto para la persona', () => {
      const c = new FormControl('12');
      c.setErrors({ dni: true });
      expect(mensajeDeError(c)).toBe('El DNI debe tener 8 dígitos.');
      c.setErrors({ required: true });
      expect(mensajeDeError(c)).toBe('Este campo es obligatorio.');
      c.setErrors({ servidor: 'El DNI ya existe.' });
      expect(mensajeDeError(c)).toBe('El DNI ya existe.');
    });

    it('no devuelve nada si el control es válido', () => {
      expect(mensajeDeError(new FormControl('ok'))).toBe('');
      expect(mensajeDeError(null)).toBe('');
    });
  });
});
