
import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { validacion } from '../admin/validacion.js';
import { UserGuard, type PeticionDeUsuario } from '../auth/user.guard.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ProfileService } from './profile.service.js';

// "Mi Perfil" de la app móvil. todas las rutas piden la sesión del usuario.
@Controller('profile')
@UseGuards(UserGuard)
@UsePipes(validacion)
export class ProfileController {
  constructor(private readonly perfil: ProfileService) {}

  @Get()
  obtener(@Req() peticion: PeticionDeUsuario) {
    return this.perfil.obtener(peticion.usuarioId);
  }

  @Patch()
  actualizar(
    @Req() peticion: PeticionDeUsuario,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.perfil.actualizar(peticion.usuarioId, dto);
  }
}