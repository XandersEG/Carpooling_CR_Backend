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
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, } from 'class-validator';
import { recortar } from './recortar.js';
import { SiSeEnvia } from './si-se-envia.js';
const VALOR_MAXIMO = 999.999999;
class CamposDeCatalogo {
    descripcion;
    capacidadMaxima;
    edadMinima;
    edadMaxima;
    valor;
    unidad;
}
__decorate([
    IsOptional(),
    Transform(recortar),
    IsString({ message: 'La descripción debe ser un texto.' }),
    MaxLength(255, {
        message: 'La descripción no puede tener más de 255 caracteres.',
    }),
    __metadata("design:type", Object)
], CamposDeCatalogo.prototype, "descripcion", void 0);
__decorate([
    IsOptional(),
    IsInt({ message: 'La capacidad máxima debe ser un número entero.' }),
    Min(1, { message: 'La capacidad máxima debe ser al menos 1.' }),
    Max(100, { message: 'La capacidad máxima no puede ser mayor que 100.' }),
    __metadata("design:type", Object)
], CamposDeCatalogo.prototype, "capacidadMaxima", void 0);
__decorate([
    IsOptional(),
    IsInt({ message: 'La edad mínima debe ser un número entero.' }),
    Min(0, { message: 'La edad mínima no puede ser negativa.' }),
    Max(150, { message: 'La edad mínima no puede ser mayor que 150.' }),
    __metadata("design:type", Object)
], CamposDeCatalogo.prototype, "edadMinima", void 0);
__decorate([
    IsOptional(),
    IsInt({ message: 'La edad máxima debe ser un número entero.' }),
    Min(0, { message: 'La edad máxima no puede ser negativa.' }),
    Max(150, { message: 'La edad máxima no puede ser mayor que 150.' }),
    __metadata("design:type", Object)
], CamposDeCatalogo.prototype, "edadMaxima", void 0);
__decorate([
    IsOptional(),
    IsNumber({}, { message: 'El valor debe ser un número.' }),
    Min(0, { message: 'El valor no puede ser negativo.' }),
    Max(VALOR_MAXIMO, {
        message: `El valor no puede ser mayor que ${VALOR_MAXIMO}.`,
    }),
    __metadata("design:type", Object)
], CamposDeCatalogo.prototype, "valor", void 0);
__decorate([
    IsOptional(),
    Transform(recortar),
    IsString({ message: 'La unidad debe ser un texto.' }),
    MaxLength(50, { message: 'La unidad no puede tener más de 50 caracteres.' }),
    __metadata("design:type", Object)
], CamposDeCatalogo.prototype, "unidad", void 0);
export class CreateCatalogValueDto extends CamposDeCatalogo {
    nombre;
    activo;
}
__decorate([
    Transform(recortar),
    IsString({ message: 'El nombre debe ser un texto.' }),
    IsNotEmpty({ message: 'El nombre es obligatorio.' }),
    MaxLength(100, {
        message: 'El nombre no puede tener más de 100 caracteres.',
    }),
    __metadata("design:type", String)
], CreateCatalogValueDto.prototype, "nombre", void 0);
__decorate([
    IsOptional(),
    IsBoolean({ message: 'El estado debe ser verdadero o falso.' }),
    __metadata("design:type", Boolean)
], CreateCatalogValueDto.prototype, "activo", void 0);
export class UpdateCatalogValueDto extends CamposDeCatalogo {
    nombre;
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
], UpdateCatalogValueDto.prototype, "nombre", void 0);
__decorate([
    SiSeEnvia(),
    IsBoolean({ message: 'El estado debe ser verdadero o falso.' }),
    __metadata("design:type", Boolean)
], UpdateCatalogValueDto.prototype, "activo", void 0);
//# sourceMappingURL=catalog-value.dto.js.map