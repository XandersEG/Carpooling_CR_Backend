import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';

/**
 * Hash de contraseñas de los usuarios de la app.
 *
 * Usa el mismo `PasswordHasher` (scrypt, formato `$scrypt$ln=17,r=8,p=1$...`) con el
 * que `AuthService` comprueba la contraseña al iniciar sesión. Antes este servicio
 * generaba su propio formato (`scrypt$131072$...`) y las cuentas creadas desde el
 * registro nunca podían iniciar sesión.
 */
@Injectable()
export class PasswordService {
  private readonly hasher = new PasswordHasher();

  hash(password: string): Promise<string> {
    return this.hasher.hash(password);
  }

  verify(password: string, hash: string | null | undefined): Promise<boolean> {
    return this.hasher.verify(password, hash);
  }
}
