import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { recortar } from '../../admin/dto/recortar.js';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export class PuntosConcurrentesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La institución no es válida.' })
  @Min(1, { message: 'La institución no es válida.' })
  institucionId?: number;

  @IsOptional()
  @Transform(recortar)
  @Matches(FECHA, {
    message: 'La fecha inicial debe tener el formato AAAA-MM-DD.',
  })
  desde?: string;

  @IsOptional()
  @Transform(recortar)
  @Matches(FECHA, {
    message: 'La fecha final debe tener el formato AAAA-MM-DD.',
  })
  hasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El top debe ser un número entero.' })
  @Min(1, { message: 'El top debe ser mayor o igual a 1.' })
  @Max(50, { message: 'El top no puede ser mayor a 50.' })
  top?: number;
}

export class UsuariosNuevosDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La institución no es válida.' })
  @Min(1, { message: 'La institución no es válida.' })
  institucionId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La cantidad de meses debe ser un número entero.' })
  @Min(1, { message: 'La cantidad de meses debe ser mayor o igual a 1.' })
  @Max(12, { message: 'La cantidad de meses no puede ser mayor a 12.' })
  meses?: number;

  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'La búsqueda no es válida.' })
  @MaxLength(100, { message: 'La búsqueda no puede superar 100 caracteres.' })
  buscar?: string;
}

export class ListadoViajesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La institución no es válida.' })
  @Min(1, { message: 'La institución no es válida.' })
  institucionId?: number;

  @IsOptional()
  @Transform(recortar)
  @Matches(FECHA, {
    message: 'La fecha inicial debe tener el formato AAAA-MM-DD.',
  })
  desde?: string;

  @IsOptional()
  @Transform(recortar)
  @Matches(FECHA, {
    message: 'La fecha final debe tener el formato AAAA-MM-DD.',
  })
  hasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El top debe ser un número entero.' })
  @Min(1, { message: 'El top debe ser mayor o igual a 1.' })
  @Max(50, { message: 'El top no puede ser mayor a 50.' })
  top?: number;
}