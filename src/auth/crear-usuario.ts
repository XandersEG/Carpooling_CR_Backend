// crea un usuario de la app desde la terminal, en la base que diga DATABASE_URL.
// sirve para probar el inicio de sesión mientras no exista el registro: npx tsx src/auth/crear-usuario.ts
// autor: Juan Carlos Monsalve, 2026-11-16
import { createInterface } from 'node:readline';
import { PasswordHasher } from '@nestjs/authentication';
import {
  buscarInstitucionPorCorreo,
  buscarUsuarioPorCorreo,
  crearUsuario,
  db,
  listarInstituciones,
  listarOpcionesGenero,
} from '../database/queries.js';

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LARGO_MINIMO_PASSWORD = 8;

const terminal = createInterface({ input: process.stdin });
const lineas = terminal[Symbol.asyncIterator]();

async function preguntar(pregunta: string): Promise<string> {
  process.stdout.write(pregunta);
  const respuesta = await lineas.next();
  if (respuesta.done) {
    throw new Error('se canceló la entrada de datos.');
  }
  return respuesta.value.trim();
}

async function crear(): Promise<string> {
  const nombre = await preguntar('Nombre: ');
  const apellidos = await preguntar('Apellidos: ');
  const correo = (await preguntar('Correo institucional: ')).toLowerCase();
  const password = await preguntar(
    `Contraseña (mínimo ${LARGO_MINIMO_PASSWORD} caracteres): `,
  );

  if (!nombre || !apellidos) {
    throw new Error('el nombre y los apellidos son obligatorios.');
  }
  if (!CORREO_VALIDO.test(correo)) {
    throw new Error('el correo no es válido.');
  }
  if (password.length < LARGO_MINIMO_PASSWORD) {
    throw new Error(
      `la contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`,
    );
  }

  // el dominio del correo decide la institución, igual que en el registro
  const institucion = await buscarInstitucionPorCorreo(correo);
  if (!institucion) {
    const dominios = (await listarInstituciones()).map((i) => i.dominioCorreo);
    throw new Error(
      dominios.length > 0
        ? `no hay una institución activa para ese dominio. Dominios registrados: ${dominios.join(', ')}.`
        : 'no hay instituciones registradas. Registra una desde el portal administrativo.',
    );
  }

  const [genero] = await listarOpcionesGenero();
  if (!genero) {
    throw new Error('el catálogo de opciones de género está vacío.');
  }
  if (await buscarUsuarioPorCorreo(correo)) {
    throw new Error('ya existe un usuario con ese correo.');
  }

  // el mismo hash scrypt con el que el inicio de sesión comprueba la contraseña
  const passwordHash = await new PasswordHasher().hash(password);
  const usuario = await crearUsuario({
    institucionId: institucion.id,
    generoId: genero.id,
    correoInstitucional: correo,
    passwordHash,
    nombre,
    apellidos,
    // datos de relleno: se cambian luego desde el perfil
    fechaNacimiento: '2000-01-01',
    aceptoTerminos: true,
    // null = correo verificado, para poder iniciar sesión de una vez
    tokenVerificacion: null,
  });
  return usuario.correoInstitucional;
}

try {
  console.log(`Usuario creado: ${await crear()}`);
} catch (error) {
  console.error(
    `No se creó el usuario: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
} finally {
  terminal.close();
  await db.$client.end();
}
