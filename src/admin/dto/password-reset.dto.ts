import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { recortar } from './recortar.js';

const ENLACE_INVALIDO =
  'El enlace no es válido o ya venció. Solicita uno nuevo.';

// correo de la cuenta que quiere recuperar su contraseña
export class RequestPasswordResetDto {
  @Transform(recortar)
  @IsEmail({}, { message: 'El correo no es válido.' })
  @MaxLength(255, {
    message: 'El correo no puede tener más de 255 caracteres.',
  })
  correo: string;
}

// token que llegó en el enlace del correo y la contraseña nueva
export class ResetPasswordDto {
  @IsString({ message: ENLACE_INVALIDO })
  @MaxLength(200, { message: ENLACE_INVALIDO })
  token: string;

  // las mismas reglas que al registrar un administrador; no se recorta
  @IsString({ message: 'La contraseña debe ser un texto.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(128, {
    message: 'La contraseña no puede tener más de 128 caracteres.',
  })
  password: string;
}
