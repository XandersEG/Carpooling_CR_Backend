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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Body, Controller, HttpCode, Post, Req, UseGuards, UsePipes, } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AdminGuard } from './admin.guard.js';
import { LoginDto } from './dto/login.dto.js';
import { SessionsService } from './sessions.service.js';
import { validacion } from './validacion.js';
let SessionsController = class SessionsController {
    sessions;
    constructor(sessions) {
        this.sessions = sessions;
    }
    iniciar(dto) {
        return this.sessions.iniciar(dto);
    }
    cerrar(peticion) {
        return this.sessions.cerrar(peticion.token);
    }
};
__decorate([
    Post('login'),
    HttpCode(200),
    UseGuards(ThrottlerGuard),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LoginDto]),
    __metadata("design:returntype", void 0)
], SessionsController.prototype, "iniciar", null);
__decorate([
    Post('logout'),
    HttpCode(204),
    UseGuards(AdminGuard),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SessionsController.prototype, "cerrar", null);
SessionsController = __decorate([
    Controller('admin/auth'),
    UsePipes(validacion),
    __metadata("design:paramtypes", [SessionsService])
], SessionsController);
export { SessionsController };
//# sourceMappingURL=sessions.controller.js.map