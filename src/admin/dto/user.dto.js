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
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, } from 'class-validator';
import { recortar } from './recortar.js';
import { SiSeEnvia } from './si-se-envia.js';
export class ListUsersDto {
    buscar;
    institucionId;
    pagina;
}
__decorate([
    IsOptional(),
    Transform(recortar),
    IsString({ message: 'La búsqueda debe ser un texto.' }),
    MaxLength(100, {
        message: 'La búsqueda no puede tener más de 100 caracteres.',
    }),
    __metadata("design:type", String)
], ListUsersDto.prototype, "buscar", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt({ message: 'La institución no es válida.' }),
    Min(1, { message: 'La institución no es válida.' }),
    __metadata("design:type", Number)
], ListUsersDto.prototype, "institucionId", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt({ message: 'La página debe ser un número entero.' }),
    Min(1, { message: 'La página debe ser mayor o igual a 1.' }),
    __metadata("design:type", Number)
], ListUsersDto.prototype, "pagina", void 0);
export class UpdateUserDto {
    nombre;
    apellidos;
    telefono;
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
], UpdateUserDto.prototype, "nombre", void 0);
__decorate([
    SiSeEnvia(),
    Transform(recortar),
    IsString({ message: 'Los apellidos deben ser un texto.' }),
    IsNotEmpty({ message: 'Los apellidos son obligatorios.' }),
    MaxLength(150, {
        message: 'Los apellidos no pueden tener más de 150 caracteres.',
    }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "apellidos", void 0);
__decorate([
    IsOptional(),
    Transform(recortar),
    IsString({ message: 'El teléfono debe ser un texto.' }),
    MaxLength(30, {
        message: 'El teléfono no puede tener más de 30 caracteres.',
    }),
    __metadata("design:type", Object)
], UpdateUserDto.prototype, "telefono", void 0);
__decorate([
    SiSeEnvia(),
    IsBoolean({ message: 'El estado debe ser verdadero o falso.' }),
    __metadata("design:type", Boolean)
], UpdateUserDto.prototype, "activo", void 0);
//# sourceMappingURL=user.dto.js.map