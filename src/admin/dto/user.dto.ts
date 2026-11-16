// Autor: Valeria Cascante, 2026-11-14
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { recortar } from './recortar.js';
import { SiSeEnvia } from './si-se-envia.js';

// filtros del listado de usuarios
export class ListUsersDto {
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'La búsqueda debe ser un texto.' })
  @MaxLength(100, {
    message: 'La búsqueda no puede tener más de 100 caracteres.',
  })
  buscar?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La institución no es válida.' })
  @Min(1, { message: 'La institución no es válida.' })
  institucionId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero.' })
  @Min(1, { message: 'La página debe ser mayor o igual a 1.' })
  pagina?: number;
}

// cambios a un usuario; solo se modifica lo que se envía
export class UpdateUserDto {
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
  @IsString({ message: 'Los apellidos deben ser un texto.' })
  @IsNotEmpty({ message: 'Los apellidos son obligatorios.' })
  @MaxLength(150, {
    message: 'Los apellidos no pueden tener más de 150 caracteres.',
  })
  apellidos?: string;

  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'El teléfono debe ser un texto.' })
  @MaxLength(30, {
    message: 'El teléfono no puede tener más de 30 caracteres.',
  })
  telefono?: string | null;

  @SiSeEnvia()
  @IsBoolean({ message: 'El estado debe ser verdadero o falso.' })
  activo?: boolean;
}
