import { createHash } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { buscarSesion } from './admin.queries.js';

// petición que ya pasó por el guard: trae el token y el administrador que la hace
export type PeticionDeAdministrador = Request & {
  token: string;
  administradorId: number;
};

// huella del token; es lo único que se guarda en la base
export function huellaDe(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// deja pasar solo a quien trae el token de una sesión abierta de un administrador activo. autor: kaleb lizano, 2026-11-13
@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const peticion = contexto
      .switchToHttp()
      .getRequest<PeticionDeAdministrador>();
    const [tipo, token] = (peticion.headers.authorization ?? '').split(' ');
    // el token de un usuario de la app no sirve: la consulta solo encuentra sesiones de administradores
    const sesion =
      tipo === 'Bearer' && token ? await buscarSesion(huellaDe(token)) : null;
    if (!sesion) {
      throw new UnauthorizedException(
        'Tu sesión venció. Inicia sesión de nuevo.',
      );
    }
    peticion.token = token;
    peticion.administradorId = sesion.administradorId;
    return true;
  }
}
