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
    vehiculoTable,
    viajeTable,
    solicitudViajeTable
} from './schemas.js'

export const db = drizzle(process.env.DATABASE_URL!);

export const PASSWORD_SEMILLA = 'Password123!';

/*
Función para generar el hash de una contraseña con scrypt
Entradas:
  password: string -> Contraseña en texto plano (por defecto PASSWORD_SEMILLA)
Salidas:
  string -> Hash con formato "scrypt$salt$hash"
Resultado:
  Devuelve el hash con una sal aleatoria; no toca la base de datos
*/
export function hashPasswordSemilla(password: string = PASSWORD_SEMILLA) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `scrypt$${salt}$${hash}`;
}

/*
Función para convertir un texto en un fragmento apto para correos y dominios
Entradas:
  texto: string -> Texto a normalizar
Salidas:
  string -> Texto en minúsculas, sin tildes ni caracteres especiales
Resultado:
  Devuelve el texto normalizado; no toca la base de datos
*/
function slug(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/*
Función para generar una placa aleatoria
Entradas:
  No tiene
Salidas:
  string -> Placa con formato de 3 letras mayúsculas seguidas de 3 números
Resultado:
  Devuelve una placa; no garantiza que sea única, eso lo controla sembrarVehiculos
*/
function generarPlaca() {
  return faker.string.alpha({ length: 3, casing: 'upper' }) + faker.string.numeric(3);
}

/*
Función para meter instituciones aleatorias
Entradas: 
  cantidad: number -> Cantidad de instituciones a insertar
Salidas:
  No tiene
Resultado:
  Inserta las institucines según el parámetro "cantidad"
*/
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

/*
Función para meter administradores aleatorios
Entradas:
  opciones.cantidad: number -> Cantidad de administradores a insertar (por defecto 2)
  opciones.passwordHash: string -> Hash de contraseña compartido por todas las cuentas
Salidas:
  Arreglo con id, correo y nombre de los administradores insertados
Resultado:
  Inserta los administradores según el parámetro "cantidad"; ignora correos repetidos
*/
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

/*
Función para meter usuarios aleatorios
Entradas:
  opciones.cantidad: number -> Cantidad de usuarios a insertar (por defecto 20)
  opciones.proporcionConductores: number -> Proporción (0 a 1) de usuarios que serán conductores
  opciones.passwordHash: string -> Hash de contraseña compartido por todas las cuentas
Salidas:
  Arreglo con id, correoInstitucional y esConductor de los usuarios insertados
Resultado:
  Inserta los usuarios asignándoles una institución y un género existentes al azar;
  lanza error si no hay instituciones o géneros activos
*/
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

/*
Función para meter vehículos aleatorios a los conductores
Entradas:
  opciones.maxPorConductor: number -> Máximo de vehículos por conductor (por defecto 2)
Salidas:
  Arreglo con id, usuarioId y placa de los vehículos insertados
Resultado:
  Inserta entre 1 y "maxPorConductor" vehículos por cada usuario conductor, con placas únicas;
  lanza error si no hay conductores
*/

export async function sembrarVehiculos(
  opciones: { maxPorConductor?: number } = {},
) {
  const { maxPorConductor = 2 } = opciones;

  if (!Number.isInteger(maxPorConductor) || maxPorConductor < 1) {
    throw new Error('El máximo de vehículos debe ser un entero positivo');
  }

  const conductores = await db
    .select({ id: usuarioTable.id })
    .from(usuarioTable)
    .where(eq(usuarioTable.esConductor, true));

  if (conductores.length === 0) {
    throw new Error('No hay conductores registrados');
  }

  // Consultar los vehículos que ya existen
  const registrados = await db
    .select({
      usuarioId: vehiculoTable.usuarioId,
      placa: vehiculoTable.placa,
    })
    .from(vehiculoTable);

  const usuariosConVehiculo = new Set(
    registrados.map((vehiculo) => vehiculo.usuarioId),
  );

  const placasUsadas = new Set(
    registrados.map((vehiculo) => vehiculo.placa),
  );

  // Evitar agregar vehículos adicionales al ejecutar otra vez la semilla
  const conductoresSinVehiculo = conductores.filter(
    (conductor) => !usuariosConVehiculo.has(conductor.id),
  );

  const valores = conductoresSinVehiculo.flatMap((conductor) =>
    Array.from(
      {
        length: faker.number.int({
          min: 1,
          max: maxPorConductor,
        }),
      },
      (_, indice) => {
        let placa = generarPlaca();

        while (placasUsadas.has(placa)) {
          placa = generarPlaca();
        }

        placasUsadas.add(placa);

        return {
          usuarioId: conductor.id,
          placa,
          marca: faker.vehicle.manufacturer(),
          modelo: faker.vehicle.model(),
          color: faker.vehicle.color(),
          capacidadPasajeros: faker.number.int({
            min: 3,
            max: 6,
          }),
          activo: indice === 0,
        };
      },
    ),
  );

  if (valores.length === 0) {
    return [];
  }

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


const LUGARES_CR = [
  { nombre: 'San Pedro de Montes de Oca', lat: 9.934, lng: -84.0507 },
  { nombre: 'Curridabat', lat: 9.915, lng: -84.0343 },
  { nombre: 'Cartago centro', lat: 9.8644, lng: -83.9194 },
  { nombre: 'Heredia centro', lat: 9.9981, lng: -84.1198 },
  { nombre: 'Alajuela centro', lat: 10.0162, lng: -84.2163 },
  { nombre: 'Escazú', lat: 9.9189, lng: -84.1397 },
  { nombre: 'Santa Ana', lat: 9.9328, lng: -84.1823 },
  { nombre: 'Tres Ríos', lat: 9.9065, lng: -83.9886 },
  { nombre: 'Desamparados', lat: 9.897, lng: -84.0683 },
  { nombre: 'Moravia', lat: 9.9615, lng: -84.0475 },
  { nombre: 'Coronado', lat: 9.9742, lng: -84.0 },
  { nombre: 'San Ramón', lat: 10.0876, lng: -84.4706 },
];

/*
Función auxiliar para convertir una coordenada a string con 6 decimales
Entradas:
  n: number -> Latitud o longitud
Salidas:
  string -> Coordenada con 6 decimales (las columnas decimal se envían como string)
Resultado:
  Devuelve la coordenada formateada; no toca la base de datos
*/
const coord = (n: number) => n.toFixed(6);

/*
Función para meter viajes aleatorios
Entradas:
  opciones.maxPorVehiculo: number -> Máximo de viajes por vehículo (por defecto 3)
Salidas:
  Arreglo con id, conductorId y cuposTotales de los viajes insertados
Resultado:
  Inserta entre 1 y "maxPorVehiculo" viajes por cada vehículo activo, entre programados,
  completados y cancelados; lanza error si no hay vehículos o métodos de pago
*/
export async function sembrarViajes(opciones: { maxPorVehiculo?: number } = {}) {
  const { maxPorVehiculo = 3 } = opciones;

  const vehiculos = await db
    .select({
      id: vehiculoTable.id,
      usuarioId: vehiculoTable.usuarioId,
      capacidadPasajeros: vehiculoTable.capacidadPasajeros,
    })
    .from(vehiculoTable)
    .where(eq(vehiculoTable.activo, true));
  if (vehiculos.length === 0) {
    throw new Error('No hay vehículos activos: ejecuta sembrarVehiculos() primero');
  }

  const metodosPago = await db
    .select({ id: catalogoMetodoDePagoTable.id, nombre: catalogoMetodoDePagoTable.nombre })
    .from(catalogoMetodoDePagoTable)
    .where(eq(catalogoMetodoDePagoTable.activo, true));
  if (metodosPago.length === 0) {
    throw new Error('No hay métodos de pago: ejecuta insertarMetodosDePagoPorDefecto() primero');
  }

  const valores = vehiculos.flatMap((vehiculo) =>
    Array.from({ length: faker.number.int({ min: 1, max: maxPorVehiculo }) }, () => {
      const origen = faker.helpers.arrayElement(LUGARES_CR);
      const destino = faker.helpers.arrayElement(LUGARES_CR.filter((l) => l !== origen));
      const metodoPago = faker.helpers.arrayElement(metodosPago);
      const gratuito = metodoPago.nombre.startsWith('Gratuito');

      // El viaje no tiene columna de estado: se deduce de las fechas y del motivo.
      const tipo = faker.helpers.weightedArrayElement([
        { weight: 6, value: 'programado' as const },
        { weight: 3, value: 'completado' as const },
        { weight: 1, value: 'cancelado' as const },
      ]);

      const fechaHoraSalida =
        tipo === 'programado' ? faker.date.soon({ days: 14 }) : faker.date.recent({ days: 30 });

      let fechaInicioReal: Date | null = null;
      let fechaFinReal: Date | null = null;
      if (tipo === 'completado') {
        fechaInicioReal = new Date(fechaHoraSalida.getTime() + faker.number.int({ min: 0, max: 10 }) * 60_000);
        fechaFinReal = new Date(fechaInicioReal.getTime() + faker.number.int({ min: 20, max: 90 }) * 60_000);
      }

      // El conductor ocupa un lugar; el resto son cupos para pasajeros.
      const cuposTotales = faker.number.int({
        min: 1,
        max: Math.max(1, vehiculo.capacidadPasajeros - 1),
      });

      return {
        conductorId: vehiculo.usuarioId,
        vehiculoId: vehiculo.id,
        metodoPagoId: metodoPago.id,
        origenNombre: origen.nombre,
        origenLat: coord(origen.lat),
        origenLng: coord(origen.lng),
        destinoNombre: destino.nombre,
        destinoLat: coord(destino.lat),
        destinoLng: coord(destino.lng),
        rutaPolyline: null,
        fechaHoraSalida,
        cuposTotales,
        cuposDisponibles: cuposTotales, // se descuentan en sembrarSolicitudesDeViaje()
        costo: gratuito ? '0' : String(faker.number.int({ min: 500, max: 3000, multipleOf: 100 })),
        fechaInicioReal,
        fechaFinReal,
        motivoCancelacion:
          tipo === 'cancelado'
            ? faker.helpers.arrayElement([
                'Imprevisto personal',
                'El vehículo está en el taller',
                'Cambio de horario en clases',
              ])
            : null,
      };
    }),
  );

  return db.insert(viajeTable).values(valores).returning({
    id: viajeTable.id,
    conductorId: viajeTable.conductorId,
    cuposTotales: viajeTable.cuposTotales,
  });
}

/*
Función para meter solicitudes de viaje aleatorias
Entradas:
  opciones.maxPorViaje: number -> Máximo de solicitudes por viaje (por defecto 4)
Salidas:
  Arreglo con id, viajeId, pasajeroId y respuesta de las solicitudes insertadas
Resultado:
  Inserta solicitudes sin repetir pasajero por viaje y sin superar los cupos aceptados,
  luego actualiza cuposDisponibles de cada viaje; lanza error si no hay viajes o usuarios
*/
export async function sembrarSolicitudesDeViaje(opciones: { maxPorViaje?: number } = {}) {
  const { maxPorViaje = 4 } = opciones;

  const viajes = await db
    .select({
      id: viajeTable.id,
      conductorId: viajeTable.conductorId,
      origenNombre: viajeTable.origenNombre,
      origenLat: viajeTable.origenLat,
      origenLng: viajeTable.origenLng,
      fechaHoraSalida: viajeTable.fechaHoraSalida,
      cuposTotales: viajeTable.cuposTotales,
      cancelado: viajeTable.motivoCancelacion,
    })
    .from(viajeTable);
  if (viajes.length === 0) {
    throw new Error('No hay viajes: ejecuta sembrarViajes() primero');
  }

  const usuarios = await db
    .select({ id: usuarioTable.id })
    .from(usuarioTable)
    .where(eq(usuarioTable.activo, true));
  if (usuarios.length < 2) {
    throw new Error('Se necesitan al menos 2 usuarios: ejecuta sembrarUsuarios() primero');
  }

  const aceptadasPorViaje = new Map<number, number>();

  const valores = viajes.flatMap((viaje) => {
    // El conductor no solicita su propio viaje y no se repite pasajero (unique viaje+pasajero).
    const candidatos = usuarios.filter((u) => u.id !== viaje.conductorId);
    const cantidad = Math.min(faker.number.int({ min: 0, max: maxPorViaje }), candidatos.length);
    const pasajeros = faker.helpers.arrayElements(candidatos, cantidad);

    let aceptadas = 0;
    const filas = pasajeros.map((pasajero) => {
      const fechaSolicitud = new Date(
        viaje.fechaHoraSalida.getTime() - faker.number.int({ min: 1, max: 48 }) * 3_600_000,
      );

      // Sin fechaRespuesta = solicitud pendiente (no existe columna estado).
      const pendiente = !viaje.cancelado && faker.datatype.boolean(0.2);
      let respuesta = !viaje.cancelado && faker.datatype.boolean(0.75);
      if (respuesta && aceptadas >= viaje.cuposTotales) respuesta = false; // sin cupos
      if (respuesta && !pendiente) aceptadas++;

      const fechaRespuesta = pendiente
        ? null
        : new Date(fechaSolicitud.getTime() + faker.number.int({ min: 5, max: 600 }) * 60_000);

      return {
        viajeId: viaje.id,
        pasajeroId: pasajero.id,
        puntoRecogidaNombre: `Cerca de ${viaje.origenNombre}`,
        // Punto de recogida a pocos cientos de metros del origen.
        puntoRecogidaLat: coord(Number(viaje.origenLat) + faker.number.float({ min: -0.003, max: 0.003 })),
        puntoRecogidaLng: coord(Number(viaje.origenLng) + faker.number.float({ min: -0.003, max: 0.003 })),
        fechaSolicitud,
        fechaRespuesta,
        respuesta,
      };
    });

    if (!viaje.cancelado) aceptadasPorViaje.set(viaje.id, aceptadas);
    return filas;
  });

  const insertadas = valores.length
    ? await db
        .insert(solicitudViajeTable)
        .values(valores)
        .returning({
          id: solicitudViajeTable.id,
          viajeId: solicitudViajeTable.viajeId,
          pasajeroId: solicitudViajeTable.pasajeroId,
          respuesta: solicitudViajeTable.respuesta,
        })
    : [];

  // Mantener consistente cuposDisponibles = cuposTotales - aceptadas.
  for (const viaje of viajes) {
    const aceptadas = aceptadasPorViaje.get(viaje.id) ?? 0;
    if (aceptadas > 0) {
      await db
        .update(viajeTable)
        .set({ cuposDisponibles: viaje.cuposTotales - aceptadas })
        .where(eq(viajeTable.id, viaje.id));
    }
  }

  return insertadas;
}

/*
Función para insertar el catálogo de géneros por defecto
Entradas:
  No tiene
Salidas:
  Arreglo con los géneros insertados
Resultado:
  Inserta Masculino, Femenino, No binario y Prefiero no indicarlo
*/
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

/*
Función para insertar el catálogo de tipos de vehículo por defecto
Entradas:
  No tiene
Salidas:
  Arreglo con los tipos de vehículo insertados
Resultado:
  Inserta Sedán, Hatchback, SUV, Pick-up y Microbus con su capacidad máxima
*/
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

/*
Función para insertar el catálogo de métodos de pago por defecto
Entradas:
  No tiene
Salidas:
  Arreglo con los métodos de pago insertados
Resultado:
  Inserta SINPE Móvil, Efectivo y Gratuito / Solidario
*/

export async function insertarMetodosDePagoPorDefecto() {
  const metodos = [
    {
      nombre: 'SINPE Móvil',
      descripcion: 'Transferencia al número del conductor al finalizar el viaje',
    },
    {
      nombre: 'Efectivo',
      descripcion: 'Pago en colones directamente al conductor',
    },
    {
      nombre: 'Gratuito / Solidario',
      descripcion: 'El conductor ofrece el viaje sin costo',
    },
  ];

  const existentes = await db
    .select({ nombre: catalogoMetodoDePagoTable.nombre })
    .from(catalogoMetodoDePagoTable);

  const nombresExistentes = new Set(
    existentes.map((metodo) => metodo.nombre),
  );

  const faltantes = metodos.filter(
    (metodo) => !nombresExistentes.has(metodo.nombre),
  );

  if (faltantes.length === 0) {
    return [];
  }

  return db
    .insert(catalogoMetodoDePagoTable)
    .values(faltantes)
    .returning();
}


/*
Función para insertar el catálogo de rangos de edad por defecto
Entradas:
  No tiene
Salidas:
  Arreglo con los rangos de edad insertados
Resultado:
  Inserta los rangos 18 a 24, 25 a 34, 35 a 49 y 50 años o más
*/
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

/*
Función para insertar el catálogo de reglas y tarifas por defecto
Entradas:
  No tiene
Salidas:
  Arreglo con las reglas y tarifas insertadas
Resultado:
  Inserta tarifa máxima por km, aporte máximo por viaje, cancelación sin penalización
  y tiempo de espera del conductor
*/
export async function insertarReglasYTarifasPorDefecto() {
    return db
        .insert(catalogoReglasYTarifas)
        .values([
            {nombre: 'Tarifa máxima por kilómetro', valor: '150', unidad: 'colones/km', descripcion: 'Monto máximo que el conductor puede cobrar por km'},
            {nombre: 'Aporte máximo por viaje', valor: '3000', unidad: 'colones', descripcion: 'Tope de cobro por pasajero en un mismo viaje'},
            {nombre: 'Cancelación sin penalización', valor: '30', unidad: 'minutos', descripcion: 'Tiempo mínimo de aviso para cancelar un viaje'},
            {nombre: 'Tiempo de espera del conductor', valor: '5', unidad: 'minutos', descripcion: 'Espera máxima en el punto de encuentro'},
        ])
        .returning();
}

/*
Función para ejecutar toda la siembra de datos aleatorios en orden
Entradas:
  opciones.semilla: number -> Semilla de faker para obtener datos reproducibles
  opciones.instituciones: number -> Cantidad de instituciones (por defecto 3)
  opciones.administradores: number -> Cantidad de administradores (por defecto 2)
  opciones.usuarios: number -> Cantidad de usuarios (por defecto 30)
Salidas:
  Objeto resumen con la cantidad insertada de instituciones, administradores,
  usuarios, vehículos, viajes y solicitudes
Resultado:
  Inserta instituciones, administradores, usuarios, vehículos, viajes y solicitudes,
  e imprime el resumen y la contraseña de las cuentas semilla en consola
*/
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
const usuarios = await sembrarUsuarios({
  cantidad: opciones.usuarios ?? 30,
  passwordHash,
});

await insertarMetodosDePagoPorDefecto();

const vehiculos = await sembrarVehiculos();
const viajes = await sembrarViajes();
  const solicitudes = await sembrarSolicitudesDeViaje();

  const resumen = {
    instituciones: instituciones.length,
    administradores: administradores.length,
    usuarios: usuarios.length,
    vehiculos: vehiculos.length,
    viajes: viajes.length,
    solicitudes: solicitudes.length,
  };
  console.log('Datos semilla insertados:', resumen);
  console.log(`Contraseña de todas las cuentas semilla: ${PASSWORD_SEMILLA}`);
  return resumen;
}