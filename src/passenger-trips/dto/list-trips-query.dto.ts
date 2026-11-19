import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { recortar } from '../../admin/dto/recortar.js';

// filtros opcionales para buscar viajes; origenLat/origenLng y destinoLat/destinoLng van en pareja
export class ListTripsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'La latitud debe ser un número.' })
  @Min(-90, { message: 'La latitud no es válida.' })
  @Max(90, { message: 'La latitud no es válida.' })
  origenLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'La longitud debe ser un número.' })
  @Min(-180, { message: 'La longitud no es válida.' })
  @Max(180, { message: 'La longitud no es válida.' })
  origenLng?: number;

  // en grados: 0.05 son ~5 km
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El radio debe ser un número.' })
  @Min(0.001, { message: 'El radio es demasiado pequeño.' })
  @Max(1, { message: 'El radio es demasiado grande.' })
  radioGrados?: number;

  // destination point (searched with the same radius as the origin)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'La latitud debe ser un número.' })
  @Min(-90, { message: 'La latitud no es válida.' })
  @Max(90, { message: 'La latitud no es válida.' })
  destinoLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'La longitud debe ser un número.' })
  @Min(-180, { message: 'La longitud no es válida.' })
  @Max(180, { message: 'La longitud no es válida.' })
  destinoLng?: number;

  // departure window in ISO 8601 (e.g. 2026-11-20T06:30:00-06:00)
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'La fecha inicial no es válida.' })
  desde?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'La fecha final no es válida.' })
  hasta?: Date;

  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'El destino debe ser un texto.' })
  @MaxLength(100, { message: 'El destino es demasiado largo.' })
  destinoNombre?: string;
}