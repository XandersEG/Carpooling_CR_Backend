import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';

// correo al que se reenvía el enlace de verificación
export class ResendVerificationDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Ingresa un correo válido.' })
  @MaxLength(255)
  correo!: string;
}
