import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { IdPipe } from '../common/pipes/id.pipe.js';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto.js';
import { PerfilService } from './perfil.service.js';

/**
 * Perfil del usuario.
 *
 * Todavía no hay autenticación en el backend, por eso el usuario viaja en la
 * ruta. Cuando exista un guard, `:usuarioId` se reemplaza por el usuario de la sesión.
 */
@Controller()
export class PerfilController {
  constructor(private readonly perfilService: PerfilService) {}

  /** Carga "Mi Perfil". */
  @Get('usuarios/:usuarioId/perfil')
  obtener(@Param('usuarioId', IdPipe) usuarioId: number) {
    return this.perfilService.obtener(usuarioId);
  }

  /** "Guardar Cambios" en "Mi Perfil". Solo se modifican los campos enviados. */
  @Patch('usuarios/:usuarioId/perfil')
  actualizar(
    @Param('usuarioId', IdPipe) usuarioId: number,
    @Body() cuerpo: ActualizarPerfilDto,
  ) {
    return this.perfilService.actualizar(usuarioId, cuerpo);
  }

  /** Opciones de la lista desplegable "Género". */
  @Get('catalogos/opciones-genero')
  opcionesGenero() {
    return this.perfilService.opcionesGenero();
  }
}
