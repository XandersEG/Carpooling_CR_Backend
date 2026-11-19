import { randomBytes } from 'node:crypto';
import { PasswordHasher } from '@nestjs/authentication';
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { huellaDe } from '../admin/admin.guard.js';
import {
  buscarUsuarioPorCorreo,
  guardarTokenRefresco,
  obtenerPerfilUsuario,
  revocarTokenRefresco,
} from '../database/queries.js';
import { LoginDto } from './dto/login.dto.js';

// duración de la sesión en la app: un mes
const DURACION_SESION_MS = 30 * 24 * 60 * 60 * 1000;

// el mismo mensaje para un correo que no existe, una cuenta inactiva y una contraseña equivocada
const DATOS_INCORRECTOS = 'Correo o contraseña incorrectos.';

// inicio y cierre de sesión de los usuarios de la app móvil
@Injectable()
export class AuthService {
  // el mismo hash scrypt con el que se guardan las contraseñas
  private readonly hasher = new PasswordHasher();

  // comprueba el correo y la contraseña y abre una sesión. autor: Juan Carlos Monsalve, 2026-11-16
  async iniciar(dto: LoginDto) {
    const usuario = await buscarUsuarioPorCorreo(dto.correo);
    // aunque el correo no exista se hace la comprobación, para tardar lo mismo y no revelar cuáles existen
    const coincide = await this.hasher.verify(
      dto.password,
      usuario?.passwordHash,
    );
    if (!usuario || !coincide || !usuario.activo) {
      throw new UnauthorizedException(DATOS_INCORRECTOS);
    }
  

    // el token viaja una sola vez a la app; en la base queda solo su huella
    const token = randomBytes(32).toString('base64url');
    const tokenHash = huellaDe(token);
    await guardarTokenRefresco({
      usuarioId: usuario.id,
      tokenHash,
      expiraEn: new Date(Date.now() + DURACION_SESION_MS),
    });

    // comprobar la contraseña tarda: si mientras tanto lo desactivaron o se la cambiaron, la sesión no se abre
    const ahora = await buscarUsuarioPorCorreo(dto.correo);
    if (!ahora?.activo || ahora.passwordHash !== usuario.passwordHash) {
      await revocarTokenRefresco(tokenHash);
      throw new UnauthorizedException(DATOS_INCORRECTOS);
    }
    return { token, nombre: usuario.nombre };
  }

  // cierra la sesión: el token deja de servir. autor: Juan Carlos Monsalve, 2026-11-16
  cerrar(token: string) {
    return revocarTokenRefresco(huellaDe(token));
  }

  // perfil del usuario de la sesión, sin datos sensibles. autor: Juan Carlos Monsalve, 2026-11-16
  async perfil(usuarioId: number) {
    const perfil = await obtenerPerfilUsuario(usuarioId);
    if (!perfil) {
      throw new UnauthorizedException(
        'Tu sesión venció. Inicia sesión de nuevo.',
      );
    }
    return perfil;
  }
}
