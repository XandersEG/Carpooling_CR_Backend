import { Body, Controller, Get, Patch, Req, UseGuards, UsePipes } from '@nestjs/common';
import { validacion } from '../admin/validacion.js';
import { UserGuard, type PeticionDeUsuario } from '../auth/user.guard.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ProfileService } from './profile.service.js';

// "Mi Perfil" y datos personales del usuario de la app; todas las rutas piden sesión
@Controller('me')
@UseGuards(UserGuard)
@UsePipes(validacion)
export class ProfileController {
  constructor(private readonly perfil: ProfileService) {}

  // GET /api/me/profile
  @Get('profile')
  obtener(@Req() peticion: PeticionDeUsuario) {
    return this.perfil.obtener(peticion.usuarioId);
  }

  // PATCH /api/me/profile
  @Patch('profile')
  actualizar(@Body() dto: UpdateProfileDto, @Req() peticion: PeticionDeUsuario) {
    return this.perfil.actualizar(peticion.usuarioId, dto);
  }

  // GET /api/me/frequent-places: lugares más usados en sus viajes (pantalla de inicio)
  @Get('frequent-places')
  lugaresFrecuentes(@Req() peticion: PeticionDeUsuario) {
    return this.perfil.lugaresFrecuentes(peticion.usuarioId);
  }
}
