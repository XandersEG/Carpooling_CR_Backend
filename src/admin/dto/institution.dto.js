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
import { IsBoolean, IsNotEmpty, IsString, MaxLength, MinLength, } from 'class-validator';
import { recortar } from './recortar.js';
import { SiSeEnvia } from './si-se-envia.js';
export class CreateInstitutionDto {
    nombre;
    dominioCorreo;
}
__decorate([
    Transform(recortar),
    IsString({ message: 'El nombre debe ser un texto.' }),
    MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
    MaxLength(150, {
        message: 'El nombre no puede tener más de 150 caracteres.',
    }),
    __metadata("design:type", String)
], CreateInstitutionDto.prototype, "nombre", void 0);
__decorate([
    Transform(recortar),
    IsString({ message: 'El dominio de correo debe ser un texto.' }),
    IsNotEmpty({ message: 'El dominio de correo es obligatorio.' }),
    MaxLength(150, {
        message: 'El dominio de correo no puede tener más de 150 caracteres.',
    }),
    __metadata("design:type", String)
], CreateInstitutionDto.prototype, "dominioCorreo", void 0);
export class UpdateInstitutionDto {
    nombre;
    dominioCorreo;
    activo;
}
__decorate([
    SiSeEnvia(),
    Transform(recortar),
    IsString({ message: 'El nombre debe ser un texto.' }),
    MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
    MaxLength(150, {
        message: 'El nombre no puede tener más de 150 caracteres.',
    }),
    __metadata("design:type", String)
], UpdateInstitutionDto.prototype, "nombre", void 0);
__decorate([
    SiSeEnvia(),
    Transform(recortar),
    IsString({ message: 'El dominio de correo debe ser un texto.' }),
    IsNotEmpty({ message: 'El dominio de correo es obligatorio.' }),
    MaxLength(150, {
        message: 'El dominio de correo no puede tener más de 150 caracteres.',
    }),
    __metadata("design:type", String)
], UpdateInstitutionDto.prototype, "dominioCorreo", void 0);
__decorate([
    SiSeEnvia(),
    IsBoolean({ message: 'El estado debe ser verdadero o falso.' }),
    __metadata("design:type", Boolean)
], UpdateInstitutionDto.prototype, "activo", void 0);
//# sourceMappingURL=institution.dto.js.map