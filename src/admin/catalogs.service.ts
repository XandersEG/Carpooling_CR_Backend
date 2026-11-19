import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  actualizarValor,
  borrarValor,
  buscarValor,
  CATALOGOS,
  codigoDeError,
  contarValores,
  insertarValor,
  listarValores,
  quitarTildes,
  sinCambios,
  type Campo,
  type Catalogo,
  type DatosValor,
} from './admin.queries.js';
import {
  CreateCatalogValueDto,
  UpdateCatalogValueDto,
} from './dto/catalog-value.dto.js';

const FILA_EN_USO = ['23503', '23001'];
const OBLIGATORIOS: Partial<Record<Campo, string>> = {
  capacidadMaxima: 'La capacidad máxima es obligatoria.',
  edadMinima: 'La edad mínima es obligatoria.',
  edadMaxima: 'La edad máxima es obligatoria.',
};

function aPlano(nombre: string): string {
  return quitarTildes(nombre)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function vacioANulo(texto?: string | null) {
  return texto === '' ? null : texto;
}

@Injectable()
export class CatalogsService {
  // los catalogue con sus campos y la cantidad de valores de cada uno. autor: felipe gonzalez, 2026-11-15
  async listar() {
    const catalogos = [];
    for (const [clave, catalogo] of Object.entries(CATALOGOS)) {
      catalogos.push({
        clave,
        nombre: catalogo.nombre,
        campos: catalogo.campos,
        total: await contarValores(catalogo.tabla),
      });
    }
    return catalogos;
  }

  // valores de un catalogo. autor: felipe gonzalez, 2026-11-15
  listarValores(clave: string) {
    return listarValores(this.exigirCatalogo(clave).tabla);
  }

  // crea un valor con los campos de su catalogo. autor: felipe gonzalez, 2026-11-15
  async crearValor(clave: string, dto: CreateCatalogValueDto) {
    const catalogo = this.exigirCatalogo(clave);
    this.exigirObligatorios(catalogo, dto, true);
    const datos = this.datosDe(catalogo, dto);
    this.validarEdades(datos.edadMinima, datos.edadMaxima);
    this.validarDecimales(datos.valor, dto.valor);
    await this.exigirNombreLibre(catalogo, dto.nombre);

    return insertarValor(catalogo.tabla, {
      ...datos,
      nombre: dto.nombre,
      activo: dto.activo ?? true,
    });
  }

  // cambia el nombre, el estado o los campos propios de un valor. autor: felipe gonzalez, 2026-11-15
  async actualizarValor(
    clave: string,
    valorId: number,
    dto: UpdateCatalogValueDto,
  ) {
    const catalogo = this.exigirCatalogo(clave);
    const valor = await this.exigirValor(catalogo, valorId);
    this.exigirObligatorios(catalogo, dto, false);
    // el nombre solo se revisa si cambia, para poder editar valores que ya estaban repetidos
    if (
      dto.nombre !== undefined &&
      (!aPlano(dto.nombre) || aPlano(dto.nombre) !== aPlano(valor.nombre ?? ''))
    ) {
      await this.exigirNombreLibre(catalogo, dto.nombre, valorId);
    }
    const datos = this.datosDe(catalogo, dto);
    // las edades se validan como quedarian después del cambio
    this.validarEdades(
      datos.edadMinima ?? valor.edadMinima,
      datos.edadMaxima ?? valor.edadMaxima,
    );
    this.validarDecimales(datos.valor, dto.valor);

    const cambios = { ...datos, nombre: dto.nombre, activo: dto.activo };
    return sinCambios(cambios)
      ? valor
      : actualizarValor(catalogo.tabla, valorId, cambios);
  }

  // borra un valor que nadie usa. Si esta en uso avisa que se puede desactivar. autor: felipe gonzalez, 2026-11-15
  async borrarValor(clave: string, valorId: number) {
    const catalogo = this.exigirCatalogo(clave);
    await this.exigirValor(catalogo, valorId);
    try {
      await borrarValor(catalogo.tabla, valorId);
    } catch (error) {
      if (FILA_EN_USO.includes(codigoDeError(error) ?? '')) {
        throw new ConflictException(
          'No se puede eliminar porque está en uso. Puedes desactivarlo desde Editar.',
        );
      }
      throw error;
    }
  }

  private exigirCatalogo(clave: string) {
    if (!Object.hasOwn(CATALOGOS, clave)) {
      throw new NotFoundException('El catálogo no existe.');
    }
    return CATALOGOS[clave];
  }

  private async exigirValor(catalogo: Catalogo, valorId: number) {
    const valor = await buscarValor(catalogo.tabla, valorId);
    if (!valor) {
      throw new NotFoundException('El parámetro no existe en este catálogo.');
    }
    return valor;
  }

  // en un valor nuevo los campos obligatorios deben venir. al editar no se pueden dejar vacios
  private exigirObligatorios(
    catalogo: Catalogo,
    dto: UpdateCatalogValueDto,
    esNuevo: boolean,
  ) {
    for (const campo of catalogo.campos) {
      const mensaje = OBLIGATORIOS[campo];
      const falta = esNuevo ? dto[campo] == null : dto[campo] === null;
      if (mensaje && falta) {
        throw new BadRequestException(mensaje);
      }
    }
  }

  // toma solo los campos del catalogo, los de otros catalogo se descartan
  private datosDe(catalogo: Catalogo, dto: UpdateCatalogValueDto): DatosValor {
    const tiene = (campo: Campo) => catalogo.campos.includes(campo);
    return {
      descripcion: tiene('descripcion')
        ? vacioANulo(dto.descripcion)
        : undefined,
      capacidadMaxima: tiene('capacidadMaxima')
        ? (dto.capacidadMaxima ?? undefined)
        : undefined,
      edadMinima: tiene('edadMinima')
        ? (dto.edadMinima ?? undefined)
        : undefined,
      edadMaxima: tiene('edadMaxima')
        ? (dto.edadMaxima ?? undefined)
        : undefined,
      valor: tiene('valor')
        ? dto.valor == null
          ? dto.valor
          : dto.valor.toFixed(6)
        : undefined,
      unidad: tiene('unidad') ? vacioANulo(dto.unidad) : undefined,
    };
  }

  // el nombre debe tener letras o numeros y no repetirse en el catalogo (no cuentan mayus o tildes)
  private async exigirNombreLibre(
    catalogo: Catalogo,
    nombre: string,
    idPropio?: number,
  ) {
    const buscado = aPlano(nombre);
    if (!buscado) {
      throw new BadRequestException('El nombre debe tener letras o números.');
    }
    const valores = await listarValores(catalogo.tabla);
    if (
      valores.some(
        (valor) =>
          valor.id !== idPropio && aPlano(valor.nombre ?? '') === buscado,
      )
    ) {
      throw new ConflictException(
        'Ya existe un parámetro con ese nombre en este catálogo.',
      );
    }
  }

  // el valor que se va a guardar debe ser igual al escrito, si no es asi tiene mas de 6 decimales y no se puede guardar
  private validarDecimales(guardado?: string | null, escrito?: number | null) {
    if (guardado != null && Number(guardado) !== escrito) {
      throw new BadRequestException(
        'El valor no puede tener más de 6 decimales.',
      );
    }
  }

  private validarEdades(edadMinima?: number, edadMaxima?: number) {
    if (
      edadMinima !== undefined &&
      edadMaxima !== undefined &&
      edadMinima > edadMaxima
    ) {
      throw new BadRequestException(
        'La edad mínima no puede ser mayor que la edad máxima.',
      );
    }
  }
}
