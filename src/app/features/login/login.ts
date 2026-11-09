import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { rutaInicialPara } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/http/api-error';

/** Solo se acepta volver a rutas internas (evita redirecciones abiertas). */
export function destinoSeguro(returnUrl: string | null): string | null {
  return returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : null;
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected ingresar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.enviando()) return;
    this.enviando.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.iniciarSesion(email.trim(), password).subscribe({
      next: (usuario) => {
        const destino = destinoSeguro(this.ruta.snapshot.queryParamMap.get('returnUrl'));
        void this.router.navigateByUrl(destino ?? rutaInicialPara(usuario.rol));
      },
      error: (e: unknown) => {
        this.enviando.set(false);
        this.error.set(
          e instanceof ApiError && e.estado === 401
            ? 'Correo o contraseña incorrectos.'
            : e instanceof ApiError
              ? e.mensaje
              : 'No se pudo iniciar sesión. Inténtalo de nuevo.',
        );
      },
    });
  }
}
