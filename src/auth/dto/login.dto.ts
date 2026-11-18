// Autor: Juan Carlos Monsalve, 2026-11-16
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { recortar } from '../../admin/dto/recortar.js';

// datos para iniciar sesión en la app móvil
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
}
