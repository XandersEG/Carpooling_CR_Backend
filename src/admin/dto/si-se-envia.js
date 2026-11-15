//Autor: Valeria Cascante Arce 
//Fecha: 14/11/2026
import { ValidateIf } from 'class-validator';
export function SiSeEnvia() {
    return ValidateIf((_, valor) => valor !== undefined);
}
//# sourceMappingURL=si-se-envia.js.map