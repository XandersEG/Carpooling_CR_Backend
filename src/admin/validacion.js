//Autor: Valeria Cascante Arce 
//Fecha: 14/11/2026
import { ValidationPipe } from '@nestjs/common';
export const validacion = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
});
//# sourceMappingURL=validacion.js.map