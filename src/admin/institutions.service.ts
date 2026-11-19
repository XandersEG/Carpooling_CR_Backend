import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  actualizarInstitucion,
  buscarInstitucion,
  buscarInstitucionConDominio,
  insertarInstitucion,
  listarInstituciones,
  sinCambios,
} from './admin.queries.js';
import {
  CreateInstitutionDto,
  UpdateInstitutionDto,
} from './dto/institution.dto.js';

const DOMINIO_VALIDO = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

// deja solo el dominio, en minúsculas: "ana@UCR.ac.cr" queda como "ucr.ac.cr"
function normalizarDominio(texto: string): string {
  const limpio = texto.trim().toLowerCase();
  return limpio.slice(limpio.lastIndexOf('@') + 1);
}

// reglas de las instituciones del portal
@Injectable()
export class InstitutionsService {
  // todas las instituciones, por nombre. autor: kaleb lizano, 2026-11-13
  listar() {
    return listarInstituciones();
  }

  // registra una institución con un dominio que no esté en uso. autor: kaleb lizano, 2026-11-13
  async crear(dto: CreateInstitutionDto) {
    const dominioCorreo = await this.dominioLibre(dto.dominioCorreo);
    return insertarInstitucion({ nombre: dto.nombre, dominioCorreo });
  }

  // cambia nombre, dominio o estado; sirve para activar y desactivar. autor: kaleb lizano, 2026-11-13
  async actualizar(id: number, dto: UpdateInstitutionDto) {
    const institucion = await buscarInstitucion(id);
    if (!institucion) {
      throw new NotFoundException('La institución no existe.');
    }

    const cambios = {
      nombre: dto.nombre,
      activo: dto.activo,
      dominioCorreo:
        dto.dominioCorreo === undefined
          ? undefined
          : await this.dominioLibre(dto.dominioCorreo, id),
    };
    return sinCambios(cambios)
      ? institucion
      : actualizarInstitucion(id, cambios);
  }

  // devuelve el dominio normalizado, o falla si es inválido o ya es de otra institución
  private async dominioLibre(texto: string, idPropio?: number) {
    const dominio = normalizarDominio(texto);
    if (!DOMINIO_VALIDO.test(dominio)) {
      throw new BadRequestException(
        'El dominio de correo no es válido. Usa un formato como institucion.ac.cr.',
      );
    }
    const existente = await buscarInstitucionConDominio(dominio);
    if (existente && existente.id !== idPropio) {
      throw new ConflictException(
        `Ya existe una institución con el dominio "${dominio}".`,
      );
    }
    return dominio;
  }
}
