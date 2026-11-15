//Autor: Valeria Cascante Arce 
//Fecha: 14/11/2026
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsNotEmpty, IsString, MaxLength, MinLength, } from 'class-validator';
import { recortar } from './recortar.js';
import { SiSeEnvia } from './si-se-envia.js';
export class CreateAdministratorDto {
    nombre;
    correo;
    password;
}
__decorate([
    Transform(recortar),
    IsString({ message: 'El nombre debe ser un texto.' }),
    IsNotEmpty({ message: 'El nombre es obligatorio.' }),
    MaxLength(100, {
        message: 'El nombre no puede tener más de 100 caracteres.',
    }),
    __metadata("design:type", String)
], CreateAdministratorDto.prototype, "nombre", void 0);
__decorate([
    Transform(recortar),
    IsEmail({}, { message: 'El correo no es válido.' }),
    MaxLength(255, {
        message: 'El correo no puede tener más de 255 caracteres.',
    }),
    __metadata("design:type", String)
], CreateAdministratorDto.prototype, "correo", void 0);
__decorate([
    IsString({ message: 'La contraseña debe ser un texto.' }),
    MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' }),
    MaxLength(128, {
        message: 'La contraseña no puede tener más de 128 caracteres.',
    }),
    __metadata("design:type", String)
], CreateAdministratorDto.prototype, "password", void 0);
export class UpdateAdministratorDto {
    nombre;
    correo;
    password;
    activo;
}
__decorate([
    SiSeEnvia(),
    Transform(recortar),
    IsString({ message: 'El nombre debe ser un texto.' }),
    IsNotEmpty({ message: 'El nombre es obligatorio.' }),
    MaxLength(100, {
        message: 'El nombre no puede tener más de 100 caracteres.',
    }),
    __metadata("design:type", String)
], UpdateAdministratorDto.prototype, "nombre", void 0);
__decorate([
    SiSeEnvia(),
    Transform(recortar),
    IsEmail({}, { message: 'El correo no es válido.' }),
    MaxLength(255, {
        message: 'El correo no puede tener más de 255 caracteres.',
    }),
    __metadata("design:type", String)
], UpdateAdministratorDto.prototype, "correo", void 0);
__decorate([
    SiSeEnvia(),
    IsString({ message: 'La contraseña debe ser un texto.' }),
    MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' }),
    MaxLength(128, {
        message: 'La contraseña no puede tener más de 128 caracteres.',
    }),
    __metadata("design:type", String)
], UpdateAdministratorDto.prototype, "password", void 0);
__decorate([
    SiSeEnvia(),
    IsBoolean({ message: 'El estado debe ser verdadero o falso.' }),
    __metadata("design:type", Boolean)
], UpdateAdministratorDto.prototype, "activo", void 0);
//# sourceMappingURL=administrator.dto.js.map