import { randomBytes } from 'node:crypto';
import { PasswordHasher } from '@nestjs/authentication';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  buscarAdministradorPorCorreo,
  guardarTokenRefresco,
  revocarTokenRefresco,
} from '../database/queries.js';
import { huellaDe } from './admin.guard.js';
import { LoginDto } from './dto/login.dto.js';

// duración de la sesión: media jornada, o un mes si se marcó "recordarme"
const SESION_CORTA_MS = 12 * 60 * 60 * 1000;
const SESION_LARGA_MS = 30 * 24 * 60 * 60 * 1000;

// el mismo mensaje para un correo que no existe, una cuenta inactiva y una contraseña equivocada
const DATOS_INCORRECTOS = 'Revisa tu correo y contraseña para continuar.';

// inicio y cierre de sesión de los administradores del portal
@Injectable()
export class SessionsService {
  // el mismo hash scrypt con el que se guardan las contraseñas
  private readonly hasher = new PasswordHasher();

  // comprueba el correo y la contraseña y abre una sesión. autor: Valeria Cascante, 2026-11-14
  async iniciar(dto: LoginDto) {
    // la consulta del equipo solo devuelve administradores activos
    const administrador = await buscarAdministradorPorCorreo(dto.correo);
    // aunque el correo no exista se hace la comprobación, para tardar lo mismo y no revelar cuáles existen
    const coincide = await this.hasher.verify(
      dto.password,
      administrador?.passwordHash,
    );
    if (!administrador || !coincide) {
      throw new UnauthorizedException(DATOS_INCORRECTOS);
    }

    // el token viaja una sola vez al portal; en la base queda solo su huella
    const token = randomBytes(32).toString('base64url');
    const tokenHash = huellaDe(token);
    await guardarTokenRefresco({
      administradorId: administrador.id,
      tokenHash,
      expiraEn: new Date(
        Date.now() + (dto.recordar ? SESION_LARGA_MS : SESION_CORTA_MS),
      ),
    });

    // comprobar la contraseña tarda: si mientras tanto lo desactivaron o se la cambiaron, la sesión no se abre
    const ahora = await buscarAdministradorPorCorreo(dto.correo);
    if (ahora?.passwordHash !== administrador.passwordHash) {
      await revocarTokenRefresco(tokenHash);
      throw new UnauthorizedException(DATOS_INCORRECTOS);
    }
    return { token, nombre: administrador.nombre };
  }

  // cierra la sesión: el token deja de servir. autor: Valeria Cascante, 2026-11-14
  cerrar(token: string) {
    return revocarTokenRefresco(huellaDe(token));
  }
}
