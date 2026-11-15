import { type PeticionDeAdministrador } from './admin.guard.js';
import { LoginDto } from './dto/login.dto.js';
import { SessionsService } from './sessions.service.js';
export declare class SessionsController {
    private readonly sessions;
    constructor(sessions: SessionsService);
    iniciar(dto: LoginDto): Promise<{
        token: string;
        nombre: string;
    }>;
    cerrar(peticion: PeticionDeAdministrador): Promise<void>;
}
