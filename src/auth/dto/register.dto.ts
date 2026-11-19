 import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsISO8601,
  IsString,
  Length,
  Matches,
  MaxLength,
  Equals,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class RegisterDto {
  @Transform(trim)
  @IsString()
  @Length(1, 251)
  fullName!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @Transform(trim)
  @IsString()
  @Length(1, 255)
  gender!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ArrayUnique()
  @IsIn(['conductor', 'pasajero'], { each: true })
  roles!: ('conductor' | 'pasajero')[];

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  birthDate!: string;

  @IsString()
  @Length(12, 128)
  password!: string;

  // Los términos del proyecto exigen aceptación explícita.
  @Equals(true, { message: 'Debes aceptar los términos y condiciones.' })
  @IsBoolean()
  acceptedTerms!: boolean;
}

