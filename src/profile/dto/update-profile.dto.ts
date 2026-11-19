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
  ValidateIf,
} from 'class-validator';
import { recortar } from '../../admin/dto/recortar.js';

// campos editables de "Mi Perfil"; el correo institucional no se puede cambiar
export class UpdateProfileDto {
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'El nombre debe ser un texto.' })
  @Length(1, 251, { message: 'Ingresa tu nombre completo.' })
  nombreCompleto?: string;

  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'El género debe ser un texto.' })
  @Length(1, 255, { message: 'Selecciona una opción de género.' })
  genero?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha de nacimiento no es válida.' })
  @IsISO8601({ strict: true }, { message: 'La fecha de nacimiento no es válida.' })
  fechaNacimiento?: string;

  @IsOptional()
  @IsArray({ message: 'Selecciona al menos un rol.' })
  @ArrayMinSize(1, { message: 'Selecciona al menos un rol.' })
  @ArrayMaxSize(2)
  @ArrayUnique()
  @IsIn(['conductor', 'pasajero'], { each: true, message: 'El rol no es válido.' })
  roles?: ('conductor' | 'pasajero')[];

  // null o "" borra el teléfono
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || null : value,
  )
  @ValidateIf((_, value) => value !== null)
  @Matches(/^\+?[0-9 -]{8,20}$/, { message: 'El teléfono no es válido.' })
  telefono?: string | null;
}
