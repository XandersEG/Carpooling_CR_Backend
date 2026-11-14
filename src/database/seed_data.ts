import 'dotenv/config';
import { faker } from '@faker-js/faker';
import { randomBytes, scryptSync } from 'node:crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { 
    catalogoTiposDeVehiculo,
    catalogoRangosDeEdad,
    catalogoReglasYTarifas,
    catalogoMetodoDePagoTable, 
    catalogoOpcionesDeGenero, 
    administradorTable,
    institucionTable,
    usuarioTable,
    vehiculoTable 
} from './schemas.js'

export const db = drizzle(process.env.DATABASE_URL!);

export const PASSWORD_SEMILLA = 'Password123!';

export function hashPasswordSemilla(password: string = PASSWORD_SEMILLA) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `scrypt$${salt}$${hash}`;
}

function slug(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function generarPlaca() {
  return faker.string.alpha({ length: 3, casing: 'upper' }) + faker.string.numeric(3);
}

export async function sembrarInstituciones(cantidad = 3) {
  const valores = Array.from({ length: cantidad }, () => {
    const ciudad = faker.location.city();
    return {
      nombre: `Universidad de ${ciudad}`,
      dominioCorreo: `${slug(ciudad)}${faker.string.numeric(2)}.ac.cr`,
      activo: true,
    };
  });

  return db
    .insert(institucionTable)
    .values(valores)
    .onConflictDoNothing({ target: institucionTable.dominioCorreo })
    .returning();
}

export async function sembrarAdministradores(
  opciones: { cantidad?: number; passwordHash?: string } = {},
) {
  const { cantidad = 2, passwordHash = hashPasswordSemilla() } = opciones;

  const valores = Array.from({ length: cantidad }, () => {
    const nombre = faker.person.firstName();
    const apellido = faker.person.lastName();
    return {
      correo: `${slug(nombre)}.${slug(apellido)}${faker.string.numeric(2)}@admin.test`,
      passwordHash,
      nombre: `${nombre} ${apellido}`,
      activo: true,
    };
  });

  return db
    .insert(administradorTable)
    .values(valores)
    .onConflictDoNothing({ target: administradorTable.correo })
    .returning({
      id: administradorTable.id,
      correo: administradorTable.correo,
      nombre: administradorTable.nombre,
    });
}

export async function sembrarUsuarios(
  opciones: {
    cantidad?: number;
    /** Proporción (0 a 1) de usuarios que serán conductores. */
    proporcionConductores?: number;
    passwordHash?: string;
  } = {},
) {
  const {
    cantidad = 20,
    proporcionConductores = 0.4,
    passwordHash = hashPasswordSemilla(),
  } = opciones;

  const instituciones = await db
    .select({ id: institucionTable.id, dominio: institucionTable.dominioCorreo })
    .from(institucionTable)
    .where(eq(institucionTable.activo, true));
  if (instituciones.length === 0) {
    throw new Error('No hay instituciones activas: ejecuta sembrarInstituciones() primero');
  }

  const generos = await db
    .select({ id: catalogoOpcionesDeGenero.id })
    .from(catalogoOpcionesDeGenero)
    .where(eq(catalogoOpcionesDeGenero.activo, true));
  if (generos.length === 0) {
    throw new Error('No hay opciones de género activas: inserta primero el catálogo de géneros');
  }

  const valores = Array.from({ length: cantidad }, () => {
    const institucion = faker.helpers.arrayElement(instituciones);
    const genero = faker.helpers.arrayElement(generos);
    const nombre = faker.person.firstName();
    const apellidoPaterno = faker.person.lastName();
    const apellidoMaterno = faker.person.lastName();

    return {
      institucionId: institucion.id,
      generoId: genero.id,
      correoInstitucional: `${slug(nombre)}.${slug(apellidoPaterno)}${faker.string.numeric(3)}@${institucion.dominio}`,
      passwordHash,
      nombre,
      apellidos: `${apellidoPaterno} ${apellidoMaterno}`,
      fechaNacimiento: faker.date
        .birthdate({ min: 18, max: 32, mode: 'age' })
        .toISOString()
        .slice(0, 10), // 'YYYY-MM-DD'
      telefono: `+506 8${faker.string.numeric(3)}-${faker.string.numeric(4)}`,
      fotoUrl: faker.image.avatar(),
      esConductor: faker.datatype.boolean(proporcionConductores),
      tokenVerificacion: null, // null = correo verificado
      aceptoTerminos: true,
      fechaAceptacionTerminos: new Date(),
      activo: true,
    };
  });

  return db
    .insert(usuarioTable)
    .values(valores)
    .onConflictDoNothing({ target: usuarioTable.correoInstitucional })
    .returning({
      id: usuarioTable.id,
      correoInstitucional: usuarioTable.correoInstitucional,
      esConductor: usuarioTable.esConductor,
    });
}

export async function sembrarVehiculos(opciones: { maxPorConductor?: number } = {}) {
  const { maxPorConductor = 2 } = opciones;

  const conductores = await db
    .select({ id: usuarioTable.id })
    .from(usuarioTable)
    .where(eq(usuarioTable.esConductor, true));
  if (conductores.length === 0) {
    throw new Error('No hay conductores: ejecuta sembrarUsuarios() primero');
  }

  const placasUsadas = new Set<string>();
  const valores = conductores.flatMap((conductor) =>
    Array.from({ length: faker.number.int({ min: 1, max: maxPorConductor }) }, () => {
      let placa = generarPlaca();
      while (placasUsadas.has(placa)) placa = generarPlaca();
      placasUsadas.add(placa);

      return {
        usuarioId: conductor.id,
        placa,
        marca: faker.vehicle.manufacturer(),
        modelo: faker.vehicle.model(),
        color: faker.vehicle.color(),
        capacidadPasajeros: faker.number.int({ min: 3, max: 6 }),
        activo: true,
      };
    }),
  );

  return db
    .insert(vehiculoTable)
    .values(valores)
    .onConflictDoNothing({ target: vehiculoTable.placa })
    .returning({
      id: vehiculoTable.id,
      usuarioId: vehiculoTable.usuarioId,
      placa: vehiculoTable.placa,
    });
}

export async function insertarGenerosPorDefecto() {
    return db
        .insert(catalogoOpcionesDeGenero).values([
            {nombre: 'Masculino'},
            {nombre: 'Femenino'},
            {nombre: 'No binario'},
            {nombre: 'Prefiero no indicarlo'}
        ])
        .returning();
}

export async function insertarTiposDeVehiculosPorDefecto() {
    return db
        .insert(catalogoTiposDeVehiculo)
        .values([
            {nombre: 'Sedán', capacidadMaxima: 4, descripcion: 'Automóvil de cuatro puertas con maletero'},
            {nombre: 'Hatchback', capacidadMaxima: 4, descripcion: 'Automóvil compacto con puerta trasera'},
            {nombre: 'SUV', capacidadMaxima: 6, descripcion: 'Vehículo utilitario de tamaño mediano o grande'},
            {nombre: 'Pick-up', capacidadMaxima: 4, descripcion: 'Doble cabina; no se permiten pasajeros en el cajón'},
            {nombre: 'Microbus', capacidadMaxima: 12, descripcion: 'Requiere permiso de transporte del CTPs'}
        ])
        .returning();
}

export async function insertarMetodosDePagoPorDefecto() {
    return db
        .insert(catalogoMetodoDePagoTable)
        .values([
            {nombre: 'SINPE Móvil', descripcion: 'Transferencia al número del conductor al finalizar el viaje'},
            {nombre: 'Efectivo', descripcion: 'Pago en colones directamente al conductor'},
            {nombre: 'Gratuito / Solidario', descripcion: 'El conductor ofrece el viaje sin costo'}
        ])
        .returning();
}

export async function insertarRangosDeEdadPorDefecto() {
    return db
        .insert(catalogoRangosDeEdad)
        .values([
            {nombre: '18 a 24 años', edadMinima: 18, edadMaxima: 24},
            {nombre: '25 a 34 años', edadMinima: 25, edadMaxima: 34},
            {nombre: '35 a 49 años', edadMinima: 35, edadMaxima: 49},
            {nombre: '50 años o más', edadMinima: 50, edadMaxima: 999},
        ])
        .returning();
}

export async function insertarReglasYTarifasPorDefecto() {
    return db
        .insert(catalogoReglasYTarifas)
        .values([
            {nombre: 'Tarifa máxima por kilómetro', valor: 150, unidad: 'colones/km', descripcion: 'Monto máximo que el conductor puede cobrar por km'},
            {nombre: 'Aporte máximo por viaje', valor: 3000, unidad: 'colones', descripcion: 'Tope de cobro por pasajero en un mismo viaje'},
            {nombre: 'Cancelación sin penalización', valor: 30, unidad: 'minutos', descripcion: 'Tiempo mínimo de aviso para cancelar un viaje'},
            {nombre: 'Tiempo de espera del conductor', valor: 5, unidad: 'minutos', descripcion: 'Espera máxima en el punto de encuentro'},
        ])
        .returning();
}

export async function sembrarTodo(
  opciones: {
    semilla?: number;
    instituciones?: number;
    administradores?: number;
    usuarios?: number;
  } = {},
) {
  if (opciones.semilla !== undefined) faker.seed(opciones.semilla);

  const passwordHash = hashPasswordSemilla(); // se calcula una sola vez

  const instituciones = await sembrarInstituciones(opciones.instituciones ?? 3);
  const administradores = await sembrarAdministradores({
    cantidad: opciones.administradores ?? 2,
    passwordHash,
  });
  const usuarios = await sembrarUsuarios({ cantidad: opciones.usuarios ?? 30, passwordHash });
  const vehiculos = await sembrarVehiculos();

  const resumen = {
    instituciones: instituciones.length,
    administradores: administradores.length,
    usuarios: usuarios.length,
    vehiculos: vehiculos.length,
  };
  console.log('Datos semilla insertados:', resumen);
  console.log(`Contraseña de todas las cuentas semilla: ${PASSWORD_SEMILLA}`);
  return resumen;
}