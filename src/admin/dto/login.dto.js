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
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, } from 'class-validator';
import { recortar } from './recortar.js';
export class LoginDto {
    correo;
    password;
    recordar;
}
__decorate([
    Transform(recortar),
    IsString({ message: 'El correo debe ser un texto.' }),
    IsNotEmpty({ message: 'El correo es obligatorio.' }),
    MaxLength(255, {
        message: 'El correo no puede tener más de 255 caracteres.',
    }),
    __metadata("design:type", String)
], LoginDto.prototype, "correo", void 0);
__decorate([
    IsString({ message: 'La contraseña debe ser un texto.' }),
    IsNotEmpty({ message: 'La contraseña es obligatoria.' }),
    MaxLength(128, {
        message: 'La contraseña no puede tener más de 128 caracteres.',
    }),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
__decorate([
    IsOptional(),
    IsBoolean({ message: 'Recordar debe ser verdadero o falso.' }),
    __metadata("design:type", Boolean)
], LoginDto.prototype, "recordar", void 0);
//# sourceMappingURL=login.dto.js.map