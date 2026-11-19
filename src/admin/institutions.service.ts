import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  actualizarInstitucion,
  buscarInstitucion,
  buscarInstitucionConAcronimo,
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
// de 2 a 10 letras o números, sin espacios ni tildes
const ACRONIMO_VALIDO = /^[A-ZÑ0-9]{2,10}$/;

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

  // registra una institución; el dominio y el acrónimo (si lo trae) no pueden estar en uso. autor: kaleb lizano, 2026-11-13
  async crear(dto: CreateInstitutionDto) {
    const acronimo = await this.acronimoLibre(dto.acronimo);
    const dominioCorreo = await this.dominioLibre(dto.dominioCorreo);
    return insertarInstitucion({ nombre: dto.nombre, acronimo, dominioCorreo });
  }

  // cambia nombre, acrónimo, dominio o estado; sirve para activar y desactivar. autor: kaleb lizano, 2026-11-13
  async actualizar(id: number, dto: UpdateInstitutionDto) {
    const institucion = await buscarInstitucion(id);
    if (!institucion) {
      throw new NotFoundException('La institución no existe.');
    }

    const cambios = {
      nombre: dto.nombre,
      activo: dto.activo,
      acronimo:
        dto.acronimo === undefined
          ? undefined
          : await this.acronimoLibre(dto.acronimo, id),
      dominioCorreo:
        dto.dominioCorreo === undefined
          ? undefined
          : await this.dominioLibre(dto.dominioCorreo, id),
    };
    return sinCambios(cambios)
      ? institucion
      : actualizarInstitucion(id, cambios);
  }

  // devuelve el acrónimo en mayúsculas, o falla si es inválido o ya es de otra institución
  private async acronimoLibre(texto = '', idPropio?: number) {
    // el acrónimo es opcional: si viene vacío, la institución queda sin acrónimo
    if (!texto) {
      return null;
    }
    const acronimo = texto.toUpperCase();
    if (!ACRONIMO_VALIDO.test(acronimo)) {
      throw new BadRequestException(
        'El acrónimo no es válido. Usa de 2 a 10 letras o números, sin espacios ni tildes.',
      );
    }
    const existente = await buscarInstitucionConAcronimo(acronimo);
    if (existente && existente.id !== idPropio) {
      throw new ConflictException(
        `Ya existe una institución con el acrónimo "${acronimo}".`,
      );
    }
    return acronimo;
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
