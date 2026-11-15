// Autor: Valeria Cascante, 2026-11-14
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { recortar } from './recortar.js';
import { SiSeEnvia } from './si-se-envia.js';

// la columna valor es numeric(9,6): no admite más de 999.999999
const VALOR_MAXIMO = 999.999999;

// campos propios de los catálogos; cada catálogo usa solo los suyos
class CamposDeCatalogo {
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'La descripción debe ser un texto.' })
  @MaxLength(255, {
    message: 'La descripción no puede tener más de 255 caracteres.',
  })
  descripcion?: string | null;

  @IsOptional()
  @IsInt({ message: 'La capacidad máxima debe ser un número entero.' })
  @Min(1, { message: 'La capacidad máxima debe ser al menos 1.' })
  @Max(100, { message: 'La capacidad máxima no puede ser mayor que 100.' })
  capacidadMaxima?: number | null;

  @IsOptional()
  @IsInt({ message: 'La edad mínima debe ser un número entero.' })
  @Min(0, { message: 'La edad mínima no puede ser negativa.' })
  @Max(150, { message: 'La edad mínima no puede ser mayor que 150.' })
  edadMinima?: number | null;

  @IsOptional()
  @IsInt({ message: 'La edad máxima debe ser un número entero.' })
  @Min(0, { message: 'La edad máxima no puede ser negativa.' })
  @Max(150, { message: 'La edad máxima no puede ser mayor que 150.' })
  edadMaxima?: number | null;

  @IsOptional()
  @IsNumber({}, { message: 'El valor debe ser un número.' })
  @Min(0, { message: 'El valor no puede ser negativo.' })
  @Max(VALOR_MAXIMO, {
    message: `El valor no puede ser mayor que ${VALOR_MAXIMO}.`,
  })
  valor?: number | null;

  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'La unidad debe ser un texto.' })
  @MaxLength(50, { message: 'La unidad no puede tener más de 50 caracteres.' })
  unidad?: string | null;
}

// datos para crear un parámetro (un valor de catálogo)
export class CreateCatalogValueDto extends CamposDeCatalogo {
  @Transform(recortar)
  @IsString({ message: 'El nombre debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MaxLength(100, {
    message: 'El nombre no puede tener más de 100 caracteres.',
  })
  nombre: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado debe ser verdadero o falso.' })
  activo?: boolean;
}

// cambios a un parámetro; solo se modifica lo que se envía
export class UpdateCatalogValueDto extends CamposDeCatalogo {
  // el nombre y el estado se pueden omitir, pero no dejar vacíos
  @SiSeEnvia()
  @Transform(recortar)
  @IsString({ message: 'El nombre debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MaxLength(100, {
    message: 'El nombre no puede tener más de 100 caracteres.',
  })
  nombre?: string;

  @SiSeEnvia()
  @IsBoolean({ message: 'El estado debe ser verdadero o falso.' })
  activo?: boolean;
}
