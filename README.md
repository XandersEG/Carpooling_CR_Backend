# Carpooling Backend

Backend del proyecto **Carpooling**, desarrollado con [NestJS](https://nestjs.com/) y TypeScript. Se encarga de gestionar la lógica de negocio, procesar las solicitudes del cliente y comunicarse con PostgreSQL mediante [Drizzle ORM](https://orm.drizzle.team/) y [Supabase](https://supabase.com/).

Este documento explica cómo configurar y ejecutar el proyecto, cómo está organizada su arquitectura y cuáles son las convenciones que seguiremos durante el desarrollo.

---

## 1. Tecnologías

| Tecnología | Descripción |
|---|---|
| [Node.js](https://nodejs.org/) | Entorno de ejecución de JavaScript. |
| [NestJS](https://nestjs.com/) | Framework para construir el backend y sus APIs. |
| [TypeScript](https://www.typescriptlang.org/) | Lenguaje utilizado para desarrollar la aplicación. |
| [PostgreSQL](https://www.postgresql.org/) | Sistema de gestión de base de datos relacional. |
| [Supabase](https://supabase.com/) | Plataforma que proporciona la infraestructura de PostgreSQL y servicios asociados. |
| [Drizzle ORM](https://orm.drizzle.team/) | ORM utilizado para interactuar con PostgreSQL desde TypeScript. |

## 2. Requisitos previos

Antes de ejecutar el proyecto, es necesario tener instalado:

- **Node.js:** utilizar la versión compatible con el proyecto (26.13.0).
- **npm:** gestor de paquetes de Node.js (se instala con Node.js).
- **Git:** para clonar el repositorio y trabajar con branches.
- **Acceso a Supabase:** credenciales y configuración necesarias para conectarse a la base de datos.

Para comprobar que Node.js, npm y Git están instalados:

```bash
node --version
npm --version
git --version
```

Se recomienda utilizar la misma versión de Node.js (26.13.0) entre todos los integrantes para evitar diferencias de comportamiento.

## 3. Instalación y configuración

### 3.1. Clonar el repositorio

Clonar el repositorio y acceder a la carpeta del proyecto:

```bash
git clone https://github.com/XandersEG/Carpooling_CR_Backend
cd Carpooling_CR_Backend
```

### 3.2. Instalar dependencias

Ejecutar:

```bash
npm install
```

Este comando instala las dependencias necesarias definidas en `package.json`.

### 3.3. Configurar las variables de entorno

Crear un archivo `.env` en la raíz del proyecto.

Las variables necesarias dependerán de la configuración de la conexión a PostgreSQL y Supabase.

Ejemplo ilustrativo:

```env
PORT=3000
DATABASE_URL=your_database_connection_string
```

Solicitar al equipo las credenciales y variables de entorno correspondientes.

**Importante:**
- No compartir credenciales directamente en el código.
- Nunca subir el archivo `.env` al repositorio.
- Verificar que `.env` esté incluido en `.gitignore`.
- No utilizar credenciales de producción para realizar pruebas locales sin autorización.

## 4. Ejecutar el backend

Para iniciar el servidor en modo desarrollo, debe de ejecutar el siguiente comando y aceptar el permiso solicitado:

```bash
npm run start:dev
```

NestJS ejecutará la aplicación y observará los cambios en los archivos. Cuando se modifica el código, el servidor se reinicia automáticamente.

Por defecto, el backend estará disponible en:

```text
http://localhost:3000
```

La API utiliza el prefijo global `/api`, por lo que los endpoints estarán organizados bajo esa ruta.

### 4.1. ¿Cómo comprobar que el backend está funcionando?

Cuando el servidor inicia correctamente, la última línea de la terminal mostrará un mensaje similar a:

```text
[Nest] ... LOG [NestApplication] Nest application successfully started
```

También se puede comprobar realizando una solicitud HTTP al endpoint de health check:

```bash
curl http://localhost:3000/api/health
```

Si el backend está funcionando correctamente, la respuesta será:

```text
Carpooling Backend corriendo :D
```

También se puede abrir `http://localhost:3000/api/health` directamente en el navegador.

## 5. Arquitectura de NestJS

NestJS utiliza una arquitectura modular. Esto significa que el código se organiza en módulos que agrupan funcionalidades relacionadas.

En lugar de colocar toda la lógica del backend en un único archivo, se divide en componentes con responsabilidades específicas.

Los tres componentes principales son:

### 5.1. Controller

Es el punto de entrada de las solicitudes HTTP.

Se encarga de:
- Definir los endpoints de la API.
- Recibir parámetros, query parameters y body.
- Llamar al servicio correspondiente.
- Devolver la respuesta al cliente.

Ejemplo:

```typescript
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller('users')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  findAll() {
    return this.appService.findAll();
  }
}
```

En este ejemplo, cuando alguien realiza una solicitud `GET /api/users`, el controller recibe la petición y delega el trabajo a `AppService`.

Los controllers no deberían contener lógica de negocio ni consultas a la base de datos.

### 5.2. Service

Contiene la lógica de negocio de la aplicación.

Se encarga de:
- Procesar la información recibida.
- Aplicar las reglas del negocio.
- Coordinar operaciones.
- Comunicarse con la capa de acceso a datos.

Ejemplo:

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  findAll() {
    // Aquí iría la lógica para obtener los usuarios.
    return [];
  }
}
```

Los servicios utilizan el decorador `@Injectable()` para que NestJS pueda administrarlos mediante su sistema de inyección de dependencias.

Por ejemplo, un servicio de viajes podría verificar que un conductor tenga espacios disponibles antes de permitir una reservación.

### 5.3. Module

Es el componente que agrupa y conecta los demás componentes.

Se encarga de:
- Registrar controllers.
- Registrar providers (servicios y otras dependencias).
- Importar otros módulos cuando sea necesario.
- Definir qué funcionalidades se pueden compartir con otros módulos.

Ejemplo:

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

NestJS utiliza los módulos para construir el árbol de dependencias de la aplicación.

### 5.4. Inyección de dependencias

NestJS utiliza un sistema llamado Dependency Injection (DI).

Esto permite que una clase reciba las dependencias que necesita sin tener que crearlas manualmente.

Por ejemplo:

```typescript
constructor(
  private readonly usersService: UsersService,
) {}
```

NestJS se encarga de proporcionar una instancia de `UsersService`.

Este mecanismo facilita la reutilización del código, las pruebas y el mantenimiento de la aplicación.

## 6. ¿Cómo funciona una solicitud?

Una solicitud HTTP normalmente sigue este flujo:

1. El frontend realiza una solicitud HTTP.
2. El controller recibe la solicitud.
3. El controller llama al service correspondiente.
4. El service ejecuta la lógica de negocio.
5. Si necesita información, consulta la base de datos mediante Drizzle ORM.
6. El resultado vuelve al controller.
7. El controller devuelve la respuesta HTTP.

Ejemplo:

```text
Frontend
   |
   | GET /api/users
   v
Controller
   |
   v
Service
   |
   v
Drizzle ORM
   |
   v
PostgreSQL (Supabase)
   |
   v
Service
   |
   v
Controller
   |
   v
Frontend
```

Esta separación permite que cada componente tenga una responsabilidad clara y evita concentrar toda la lógica en un solo lugar.

## 7. Estructura del proyecto

Actualmente, el proyecto tiene una estructura inicial:

```text
src/
├── main.ts
└── app/
    ├── app.controller.ts
    ├── app.module.ts
    └── app.service.ts
```

### ¿Qué hace cada archivo?

| Archivo | Responsabilidad |
|---|---|
| `main.ts` | Punto de entrada de la aplicación. Inicializa NestJS y configura el servidor. |
| `app.module.ts` | Módulo raíz de la aplicación. |
| `app.controller.ts` | Controller inicial de la aplicación. |
| `app.service.ts` | Servicio inicial de la aplicación. |

### 7.1. Estructura recomendada a futuro

A medida que el proyecto crezca, se recomienda organizarlo por funcionalidades (*feature modules*).

Una posible estructura sería:

```text
src/
├── main.ts
│
├── app/
│   └── app.module.ts
│
├── database/
│   ├── database.module.ts
│   ├── database.service.ts
│   └── schema/
│       ├── users.schema.ts
│       ├── vehicles.schema.ts
│       └── trips.schema.ts
│
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── dto/
│       ├── create-user.dto.ts
│       └── update-user.dto.ts
│
├── trips/
│   ├── trips.module.ts
│   ├── trips.controller.ts
│   ├── trips.service.ts
│   └── dto/
│       ├── create-trip.dto.ts
│       └── update-trip.dto.ts
│
├── reservations/
│   ├── reservations.module.ts
│   ├── reservations.controller.ts
│   ├── reservations.service.ts
│   └── dto/
│       ├── create-reservation.dto.ts
│       └── update-reservation.dto.ts
│
└── common/
    ├── guards/
    ├── decorators/
    ├── filters/
    └── interceptors/
```

Esta estructura es una propuesta. No significa que debamos crear todos estos archivos desde el inicio.

### 7.2. ¿Por qué organizarlo por funcionalidades?

Cada módulo representa una parte del negocio.

Por ejemplo:

- `users/`: gestión de usuarios y sus perfiles.
- `trips/`: creación, consulta y administración de viajes.
- `reservations/`: reservaciones y cancelaciones.
- `database/`: configuración y acceso a la base de datos.
- `common/`: componentes reutilizables entre diferentes módulos.

De esta manera, si necesitamos modificar la funcionalidad de viajes, podemos trabajar principalmente dentro de `trips/`, sin tener que buscar código relacionado en archivos generales.

## 8. DTOs y validación de datos

DTO significa **Data Transfer Object**.

Son clases que definen la estructura de los datos que una solicitud puede recibir.

Por ejemplo, para crear un viaje:

```typescript
import { IsDateString, IsInt, IsString, Min } from 'class-validator';

export class CreateTripDto {
  @IsString()
  origin: string;

  @IsString()
  destination: string;

  @IsDateString()
  departureTime: string;

  @IsInt()
  @Min(1)
  availableSeats: number;
}
```

El controller puede recibir este DTO:

```typescript
@Post()
create(@Body() createTripDto: CreateTripDto) {
  return this.tripsService.create(createTripDto);
}
```

¿Por qué utilizarlos?

- Definen qué información espera un endpoint.
- Evitan recibir estructuras de datos arbitrarias.
- Facilitan la validación de los datos.
- Mantienen una separación entre los datos recibidos y la lógica de negocio.

Para habilitar la validación automática, se puede configurar un `ValidationPipe` global en `main.ts`:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

**Importante:** los DTOs no son lo mismo que los schemas de Drizzle.

- DTO: representa los datos que recibe la API.
- Schema: representa la estructura de las tablas de la base de datos.

## 9. Base de datos: PostgreSQL, Supabase y Drizzle ORM

El proyecto utiliza Drizzle ORM para interactuar con PostgreSQL.

Cada tecnología tiene una responsabilidad diferente:

| Tecnología | Responsabilidad |
|---|---|
| PostgreSQL | Almacenar la información. |
| Supabase | Proporcionar infraestructura de PostgreSQL y servicios asociados. |
| Drizzle ORM | Permitir realizar consultas a PostgreSQL desde TypeScript. |
| Database module/service | Centralizar la conexión y proporcionar acceso a Drizzle a los demás módulos. |

### 9.1. Ejemplo de consulta

Una consulta utilizando Drizzle podría verse así:

```typescript
const users = await db
  .select()
  .from(usersTable);
```

La idea es evitar escribir consultas directamente en los controllers.

Las consultas y operaciones relacionadas con los datos deben formar parte de los services o de una capa de acceso a datos cuando la complejidad del proyecto lo justifique.

### 9.2. Organización de schemas

Los schemas de Drizzle definen las tablas y columnas de PostgreSQL.

Por ejemplo:

```text
database/
└── schema/
    ├── users.schema.ts
    ├── vehicles.schema.ts
    └── trips.schema.ts
```

Cada archivo puede contener la definición de las tablas relacionadas con una funcionalidad.

La configuración de migraciones debe mantenerse sincronizada con los cambios en los schemas.

**Importante:** antes de modificar o ejecutar migraciones sobre una base de datos compartida, coordinar los cambios con el equipo.

## 10. Convenciones de desarrollo

Para mantener el código organizado, seguiremos estas recomendaciones:

| Elemento | Responsabilidad |
|---|---|
| Controller | Endpoints y comunicación HTTP. |
| Service | Lógica de negocio. |
| Module | Organización e inyección de dependencias. |
| DTO | Estructura y validación de datos de entrada. |
| Schema | Definición de tablas y columnas de Drizzle. |
| Guard | Protección de endpoints y autorización. |
| Pipe | Validación y transformación de datos. |
| Filter | Manejo personalizado de excepciones. |

### Recomendaciones generales

1. No colocar lógica de negocio en los controllers.
2. No realizar consultas a la base de datos directamente desde los controllers.
3. Crear DTOs para los datos recibidos por los endpoints.
4. Utilizar la inyección de dependencias de NestJS en lugar de instanciar servicios manualmente.
5. Mantener cada funcionalidad dentro de su propio módulo.
6. Evitar duplicar lógica. Si varios módulos necesitan una funcionalidad, considerar compartir un servicio o módulo.
7. No guardar credenciales ni secretos directamente en el código.
8. Utilizar excepciones HTTP de NestJS para manejar errores de manera consistente.

## 11. Git Workflow y colaboración

Para mantener el repositorio organizado y evitar conflictos entre integrantes, todo el desarrollo debe realizarse mediante ramas independientes (*branches*).

**Regla principal: nunca trabajar directamente sobre `main`.**

La rama `main` debe mantenerse estable y contener únicamente código integrado mediante Pull Requests.

### 11.1. Flujo de trabajo

1. Actualizar la rama `main` para obtener los últimos cambios.
2. Crear una nueva branch para la funcionalidad o corrección que se va a desarrollar.
3. Realizar los cambios y commits en esa branch.
4. Subir la branch al repositorio remoto.
5. Crear un Pull Request (PR) hacia `main`.
6. Revisar los cambios y resolver cualquier observación.
7. Una vez aprobado, integrar los cambios mediante el Pull Request.

### 11.2. Convención para nombrar branches

Utilizaremos los siguientes prefijos:

| Prefijo | Uso | Ejemplo |
|---|---|---|
| `feat/` | Nueva funcionalidad | `feat/create-trip` |
| `fix/` | Corrección de errores | `fix/reservation-validation` |
| `refactor/` | Mejoras en la estructura del código | `refactor/users-service` |
| `docs/` | Documentación | `docs/update-readme` |
| `test/` | Creación o modificación de pruebas | `test/trips-service` |
| `chore/` | Configuración y mantenimiento | `chore/update-dependencies` |

### 11.3. Ejemplo de flujo en Git

Si queremos desarrollar la funcionalidad para crear viajes:

```bash
# 1. Actualizar main
git switch main
git pull origin main

# 2. Crear una branch
git switch -c feat/create-trip

# 3. Realizar cambios y guardarlos
git add .
git commit -m "feat: add trip creation"

# 4. Subir la branch
git push -u origin feat/create-trip
```

Después, desde GitHub, se crea un Pull Request:

```text
feat/create-trip  --->  main
```

Una vez revisado y aprobado, se integra el PR.

### 11.4. Convención para commits

Se recomienda utilizar **Conventional Commits**:

| Prefijo | Uso |
|---|---|
| `feat:` | Nueva funcionalidad. |
| `fix:` | Corrección de errores. |
| `refactor:` | Refactorización. |
| `docs:` | Documentación. |
| `test:` | Pruebas. |
| `chore:` | Mantenimiento y configuración. |

Ejemplos:

```bash
git commit -m "feat: add trip creation endpoint"
git commit -m "fix: validate available seats"
git commit -m "docs: update API documentation"
```

### 11.5. Reglas importantes

- No realizar commits directamente sobre `main`.
- No hacer push directamente a `main`.
- Cada funcionalidad o corrección debe desarrollarse en su propia branch.
- Mantener las branches enfocadas en un único objetivo.
- Crear un Pull Request antes de integrar cambios a `main`.
- Revisar que los cambios no rompan funcionalidades existentes.
- Resolver conflictos antes de integrar el PR.
- No subir archivos `.env`, credenciales, tokens ni otros secretos al repositorio.

**Objetivo:** mantener `main` estable y funcional, facilitando que todos puedan desarrollar diferentes funcionalidades sin interferir directamente con el trabajo de los demás.

Se recomienda configurar Branch Protection Rules en GitHub para impedir pushes directos a `main` y exigir Pull Requests antes de integrar cambios.


## Consideraciones finales

Antes de desarrollar una funcionalidad:

1. Revisar cómo se relacionan los controllers, services y modules.
2. Identificar a qué módulo pertenece la funcionalidad.
3. Crear una branch siguiendo las convenciones establecidas.
4. Implementar la funcionalidad respetando la separación de responsabilidades.
5. Probar los cambios localmente.
6. Crear un Pull Request para integrar el trabajo.

**La idea es mantener una arquitectura clara, modular y fácil de mantener, donde cualquier integrante pueda entender el código y contribuir sin necesidad de conocer todo el backend previamente.**
