
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateViajeDto {
  @IsInt()
  @Min(1)
  vehiculoId!: number;

  @IsInt()
  @Min(1)
  metodoPagoId!: number;

  // se recorta antes de validar: un nombre de solo espacios cuenta como vacío
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  origenNombre!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  origenLat!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  origenLng!: number;

  // se recorta antes de validar: un nombre de solo espacios cuenta como vacío
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  destinoNombre!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  destinoLat!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  destinoLng!: number;

  @IsOptional()
  @IsString()
  rutaPolyline?: string;

  @Type(() => Date)
  @IsDate()
  fechaHoraSalida!: Date;

  @IsInt()
  @Min(1)
  @Max(32767)
  cuposTotales!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costo!: number;
}
