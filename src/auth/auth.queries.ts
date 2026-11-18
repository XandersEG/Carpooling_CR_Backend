import { and, eq, gt } from 'drizzle-orm';
import { db } from '../database/queries.js';
import { tokenRefrescoTable, usuarioTable } from '../database/schemas.js';

// consultas de la sesión de los usuarios de la app. usan la conexión y las tablas del equipo.

// usuario dueño de una sesión abierta. no hay sesión si el token se revocó o venció, ni si desactivaron la cuenta
export async function buscarSesionDeUsuario(tokenHash: string) {
  const [sesion] = await db
    .select({ usuarioId: usuarioTable.id })
    .from(tokenRefrescoTable)
    .innerJoin(usuarioTable, eq(tokenRefrescoTable.usuarioId, usuarioTable.id))
    .where(
      and(
        eq(tokenRefrescoTable.tokenHash, tokenHash),
        eq(tokenRefrescoTable.revocado, false),
        gt(tokenRefrescoTable.expiraEn, new Date()),
        eq(usuarioTable.activo, true),
      ),
    );
  return sesion ?? null;
}
