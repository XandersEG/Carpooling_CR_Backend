
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { recortar } from '../../admin/dto/recortar.js';

// cambios de "Mi Perfil". todos son opcionales: solo se cambia lo que se envía.
// usa los mismos nombres que el registro (fullName, gender, birthDate, roles).
export class UpdateProfileDto {
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'El nombre debe ser un texto.' })
  @Length(1, 251, {
    message: 'El nombre completo debe tener entre 1 y 251 caracteres.',
  })
  fullName?: string;

  // nombre de una opción activa del catálogo "Opciones de Género"
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'El género debe ser un texto.' })
  @Length(1, 255, { message: 'Selecciona una opción de género.' })
  gender?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de nacimiento debe tener el formato AAAA-MM-DD.',
  })
  @IsISO8601(
    { strict: true },
    { message: 'La fecha de nacimiento no es válida.' },
  )
  birthDate?: string;

  @IsOptional()
  @IsArray({ message: 'Los roles deben ser una lista.' })
  @ArrayMinSize(1, { message: 'Selecciona al menos un rol.' })
  @ArrayMaxSize(2, { message: 'Solo hay dos roles: conductor y pasajero.' })
  @ArrayUnique({ message: 'No repitas roles.' })
  @IsIn(['conductor', 'pasajero'], {
    each: true,
    message: 'Los roles válidos son conductor y pasajero.',
  })
  roles?: ('conductor' | 'pasajero')[];
}