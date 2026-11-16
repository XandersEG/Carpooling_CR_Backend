import { PasswordHasher } from '@nestjs/authentication';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  cambiarEstadoAdministrador,
  listarAdministradores,
  revocarTokensDeAdministrador,
} from '../database/queries.js';
import {
  actualizarAdministrador,
  codigoDeError,
  insertarAdministrador,
  sinCambios,
} from './admin.queries.js';
import {
  CreateAdministratorDto,
  UpdateAdministratorDto,
} from './dto/administrator.dto.js';

// código de postgres cuando un valor que debe ser único ya existe
const VALOR_REPETIDO = '23505';

// reglas de los administradores del portal
@Injectable()
export class AdministratorsService {
  // hash scrypt de nestjs; el inicio de sesión verifica con este mismo
  private readonly hasher = new PasswordHasher();
  private readonly registro = new Logger(AdministratorsService.name);

  // todos los administradores, sin la contraseña. usa la consulta del equipo. autor: kaleb lizano, 2026-11-13
  listar() {
    return listarAdministradores();
  }

  // registra un administrador; el correo va en minúsculas y la contraseña se guarda como hash. autor: kaleb lizano, 2026-11-13
  async crear(dto: CreateAdministratorDto) {
    const passwordHash = await this.hasher.hash(dto.password);
    return this.guardar(() =>
      insertarAdministrador({
        nombre: dto.nombre,
        correo: dto.correo.toLowerCase(),
        passwordHash,
      }),
    );
  }

  // cambia los datos, la contraseña o el estado de un administrador. autor: kaleb lizano, 2026-11-13
  async actualizar(id: number, dto: UpdateAdministratorDto, quienId: number) {
    // así siempre queda al menos un administrador que puede entrar
    if (dto.activo === false && id === quienId) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta.');
    }
    const cambios = {
      nombre: dto.nombre,
      correo: dto.correo?.toLowerCase(),
      passwordHash:
        dto.password === undefined
          ? undefined
          : await this.hasher.hash(dto.password),
    };
    if (
      !sinCambios(cambios) &&
      !(await this.guardar(() => actualizarAdministrador(id, cambios)))
    ) {
      throw new NotFoundException('El administrador no existe.');
    }
    // con una contraseña nueva, las sesiones abiertas dejan de servir
    if (dto.password !== undefined) {
      await revocarTokensDeAdministrador(id);
    }
    // el estado se cambia con la consulta del equipo, que también cierra las sesiones de quien queda inactivo
    if (
      dto.activo !== undefined &&
      !(await cambiarEstadoAdministrador(id, dto.activo))
    ) {
      throw new NotFoundException('El administrador no existe.');
    }
  }

  // hace una escritura y traduce el error del correo repetido
  private async guardar<T>(escritura: () => Promise<T>): Promise<T> {
    try {
      return await escritura();
    } catch (error) {
      if (codigoDeError(error) === VALOR_REPETIDO) {
        throw new ConflictException(
          'Ya existe un administrador con ese correo.',
        );
      }
      // el error de la base trae los datos de la consulta, entre ellos el hash: al registro del servidor va solo su código
      this.registro.error(
        `no se pudieron guardar los datos de un administrador (código ${codigoDeError(error) ?? 'desconocido'})`,
      );
      throw new InternalServerErrorException(
        'No se pudieron guardar los datos del administrador.',
      );
    }
  }
}
