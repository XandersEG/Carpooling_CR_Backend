//Autor: Valeria Cascante Arce 
//Fecha: 14/11/2026
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { randomBytes } from 'node:crypto';
import { PasswordHasher } from '@nestjs/authentication';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { buscarAdministradorPorCorreo, guardarTokenRefresco, revocarTokenRefresco, } from '../database/queries.js';
import { huellaDe } from './admin.guard.js';
const SESION_CORTA_MS = 12 * 60 * 60 * 1000;
const SESION_LARGA_MS = 30 * 24 * 60 * 60 * 1000;
const DATOS_INCORRECTOS = 'Revisa tu correo y contraseña para continuar.';
let SessionsService = class SessionsService {
    hasher = new PasswordHasher();
    async iniciar(dto) {
        const administrador = await buscarAdministradorPorCorreo(dto.correo);
        const coincide = await this.hasher.verify(dto.password, administrador?.passwordHash);
        if (!administrador || !coincide) {
            throw new UnauthorizedException(DATOS_INCORRECTOS);
        }
        const token = randomBytes(32).toString('base64url');
        const tokenHash = huellaDe(token);
        await guardarTokenRefresco({
            administradorId: administrador.id,
            tokenHash,
            expiraEn: new Date(Date.now() + (dto.recordar ? SESION_LARGA_MS : SESION_CORTA_MS)),
        });
        const ahora = await buscarAdministradorPorCorreo(dto.correo);
        if (ahora?.passwordHash !== administrador.passwordHash) {
            await revocarTokenRefresco(tokenHash);
            throw new UnauthorizedException(DATOS_INCORRECTOS);
        }
        return { token, nombre: administrador.nombre };
    }
    cerrar(token) {
        return revocarTokenRefresco(huellaDe(token));
    }
};
SessionsService = __decorate([
    Injectable()
], SessionsService);
export { SessionsService };
//# sourceMappingURL=sessions.service.js.map