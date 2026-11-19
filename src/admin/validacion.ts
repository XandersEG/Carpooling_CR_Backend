import { ValidationPipe } from '@nestjs/common';

// valida los datos de entrada de las rutas del portal y rechaza los campos desconocidos, autor: Valeria Cascante, 2026-11-14
export const validacion = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
