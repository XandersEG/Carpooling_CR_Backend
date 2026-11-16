import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { huellaDe } from '../admin/admin.guard.js';
import { buscarSesionDeUsuario } from './auth.queries.js';

// petición que ya pasó por el guard: trae el token y el usuario que la hace
export type PeticionDeUsuario = Request & {
  token: string;
  usuarioId: number;
};

// deja pasar solo a quien trae el token de una sesión abierta de un usuario activo.
// sirve para proteger cualquier ruta de la app: @UseGuards(UserGuard). autor: Juan Carlos Monsalve, 2026-11-16
@Injectable()
export class UserGuard implements CanActivate {
  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const peticion = contexto.switchToHttp().getRequest<PeticionDeUsuario>();
    const [tipo, token] = (peticion.headers.authorization ?? '').split(' ');
    // el token de un administrador no sirve: la consulta solo encuentra sesiones de usuarios
    const sesion =
      tipo === 'Bearer' && token
        ? await buscarSesionDeUsuario(huellaDe(token))
        : null;
    if (!sesion) {
      throw new UnauthorizedException(
        'Tu sesión venció. Inicia sesión de nuevo.',
      );
    }
    peticion.token = token;
    peticion.usuarioId = sesion.usuarioId;
    return true;
  }
}
