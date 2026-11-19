// Autor: Valeria Cascante, 2026-11-14
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { recortar } from './recortar.js';
import { SiSeEnvia } from './si-se-envia.js';

// datos para registrar una institución
export class CreateInstitutionDto {
  @Transform(recortar)
  @IsString({ message: 'El nombre debe ser un texto.' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(150, {
    message: 'El nombre no puede tener más de 150 caracteres.',
  })
  nombre: string;

  @Transform(recortar)
  @IsString({ message: 'El dominio de correo debe ser un texto.' })
  @IsNotEmpty({ message: 'El dominio de correo es obligatorio.' })
  @MaxLength(150, {
    message: 'El dominio de correo no puede tener más de 150 caracteres.',
  })
  dominioCorreo: string;
}

// cambios a una institución; solo se modifica lo que se envía
export class UpdateInstitutionDto {
  @SiSeEnvia()
  @Transform(recortar)
  @IsString({ message: 'El nombre debe ser un texto.' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(150, {
    message: 'El nombre no puede tener más de 150 caracteres.',
  })
  nombre?: string;

  @SiSeEnvia()
  @Transform(recortar)
  @IsString({ message: 'El dominio de correo debe ser un texto.' })
  @IsNotEmpty({ message: 'El dominio de correo es obligatorio.' })
  @MaxLength(150, {
    message: 'El dominio de correo no puede tener más de 150 caracteres.',
  })
  dominioCorreo?: string;

  @SiSeEnvia()
  @IsBoolean({ message: 'El estado debe ser verdadero o falso.' })
  activo?: boolean;
}
