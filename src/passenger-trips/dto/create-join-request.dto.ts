import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { recortar } from '../../admin/dto/recortar.js';

// punto donde el pasajero quiere que lo recojan
export class CreateJoinRequestDto {
  @Transform(recortar)
  @IsString({ message: 'El nombre del punto debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre del punto es obligatorio.' })
  @MaxLength(200, { message: 'El nombre del punto es demasiado largo.' })
  nombre!: string;

  @IsNumber({}, { message: 'La latitud debe ser un número.' })
  @Min(-90, { message: 'La latitud no es válida.' })
  @Max(90, { message: 'La latitud no es válida.' })
  lat!: number;

  @IsNumber({}, { message: 'La longitud debe ser un número.' })
  @Min(-180, { message: 'La longitud no es válida.' })
  @Max(180, { message: 'La longitud no es válida.' })
  lng!: number;
}