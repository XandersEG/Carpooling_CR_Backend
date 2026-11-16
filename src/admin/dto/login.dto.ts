// Autor: Valeria Cascante, 2026-11-14
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { recortar } from './recortar.js';

// datos para iniciar sesión en el portal
export class LoginDto {
  @Transform(recortar)
  @IsString({ message: 'El correo debe ser un texto.' })
  @IsNotEmpty({ message: 'El correo es obligatorio.' })
  @MaxLength(255, {
    message: 'El correo no puede tener más de 255 caracteres.',
  })
  correo: string;

  @IsString({ message: 'La contraseña debe ser un texto.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MaxLength(128, {
    message: 'La contraseña no puede tener más de 128 caracteres.',
  })
  password: string;

  // con "recordarme" la sesión dura más tiempo
  @IsOptional()
  @IsBoolean({ message: 'Recordar debe ser verdadero o falso.' })
  recordar?: boolean;
}
