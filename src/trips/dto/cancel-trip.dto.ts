// Autor: Wes, 2026-11-18
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { recortar } from '../../admin/dto/recortar.js';

// datos para cancelar un viaje; la app no pide motivo, así que es opcional
export class CancelTripDto {
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'El motivo debe ser un texto.' })
  @MaxLength(500, {
    message: 'El motivo no puede tener más de 500 caracteres.',
  })
  motivo?: string;
}
