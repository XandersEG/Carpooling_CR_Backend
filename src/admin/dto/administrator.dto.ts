// Autor: Valeria Cascante, 2026-11-14
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { recortar } from './recortar.js';
import { SiSeEnvia } from './si-se-envia.js';

// datos para registrar un administrador
export class CreateAdministratorDto {
  @Transform(recortar)
  @IsString({ message: 'El nombre debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MaxLength(100, {
    message: 'El nombre no puede tener más de 100 caracteres.',
  })
  nombre: string;

  @Transform(recortar)
  @IsEmail({}, { message: 'El correo no es válido.' })
  @MaxLength(255, {
    message: 'El correo no puede tener más de 255 caracteres.',
  })
  correo: string;

  // la contraseña no se recorta: los espacios también cuentan
  @IsString({ message: 'La contraseña debe ser un texto.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(128, {
    message: 'La contraseña no puede tener más de 128 caracteres.',
  })
  password: string;
}

// cambios a un administrador; solo se modifica lo que se envía
export class UpdateAdministratorDto {
  @SiSeEnvia()
  @Transform(recortar)
  @IsString({ message: 'El nombre debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MaxLength(100, {
    message: 'El nombre no puede tener más de 100 caracteres.',
  })
  nombre?: string;

  @SiSeEnvia()
  @Transform(recortar)
  @IsEmail({}, { message: 'El correo no es válido.' })
  @MaxLength(255, {
    message: 'El correo no puede tener más de 255 caracteres.',
  })
  correo?: string;

  // si se envía, reemplaza la contraseña actual
  @SiSeEnvia()
  @IsString({ message: 'La contraseña debe ser un texto.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(128, {
    message: 'La contraseña no puede tener más de 128 caracteres.',
  })
  password?: string;

  @SiSeEnvia()
  @IsBoolean({ message: 'El estado debe ser verdadero o falso.' })
  activo?: boolean;
}
