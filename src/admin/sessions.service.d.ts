import { LoginDto } from './dto/login.dto.js';
export declare class SessionsService {
    private readonly hasher;
    iniciar(dto: LoginDto): Promise<{
        token: string;
        nombre: string;
    }>;
    cerrar(token: string): Promise<void>;
}
