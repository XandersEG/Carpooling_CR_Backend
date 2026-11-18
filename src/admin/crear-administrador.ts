import { createInterface } from 'node:readline';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdministratorsService } from './administrators.service.js';
import { CreateAdministratorDto } from './dto/administrator.dto.js';

// crea un administrador desde la terminal, en la base que diga DATABASE_URL.
// sirve para el primero, cuando todavía nadie puede entrar al portal a registrarlo.
// uso: npx tsx src/admin/crear-administrador.ts
// autor: kaleb lizano, 2026-11-13

const lineas = createInterface({ input: process.stdin })[
  Symbol.asyncIterator
]();

// muestra una pregunta y devuelve la línea que se escriba
async function preguntar(texto: string): Promise<string> {
  process.stdout.write(texto);
  const { value } = await lineas.next();
  return typeof value === 'string' ? value : '';
}

const datos = plainToInstance(CreateAdministratorDto, {
  nombre: await preguntar('Nombre: '),
  correo: await preguntar('Correo: '),
  // la terminal muestra lo que se escribe, también la contraseña
  password: await preguntar(
    'Contraseña (mínimo 8 caracteres; se verá mientras la escribes): ',
  ),
});

// las mismas reglas que al registrarlo desde el portal
const errores = await validate(datos);
if (errores.length > 0) {
  for (const error of errores) {
    console.error(Object.values(error.constraints ?? {}).join(' '));
  }
  process.exit(1);
}

try {
  const administrador = await new AdministratorsService().crear(datos);
  console.log(
    `Listo: ${administrador.nombre} (${administrador.correo}) ya puede entrar al portal.`,
  );
  process.exit(0);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
