import { Injectable } from '@nestjs/common';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '../database/queries.js';
import {
  catalogoOpcionesDeGenero,
  institucionTable,
  usuarioTable,
} from '../database/schemas.js';

@Injectable()
export class RegistrationRepository {
  async findInstitution(domain: string) {
    const [institution] = await db
      .select({
        id: institucionTable.id,
      })
      .from(institucionTable)
      .where(
        and(
          sql`lower(${institucionTable.dominioCorreo}) = ${domain}`,
          eq(institucionTable.activo, true),
        ),
      );

    return institution;
  }

  async findGender(name: string) {
    const genders = await db
      .select({
        id: catalogoOpcionesDeGenero.id,
      })
      .from(catalogoOpcionesDeGenero)
      .where(
        and(
          sql`lower(${catalogoOpcionesDeGenero.nombre}) = ${name.toLowerCase()}`,
          eq(catalogoOpcionesDeGenero.activo, true),
        ),
      );

    // Evita seleccionar arbitrariamente si hay nombres duplicados.
    return genders.length === 1 ? genders[0] : undefined;
  }

  async create(data: typeof usuarioTable.$inferInsert) {
    const [user] = await db
      .insert(usuarioTable)
      .values(data)
      .onConflictDoNothing({
        target: usuarioTable.correoInstitucional,
      })
      .returning({
        id: usuarioTable.id,
        email: usuarioTable.correoInstitucional,
      });

    return user;
  }

  /** Limpia el token (correo verificado) de la cuenta dueña de esa huella. */
  async verifyEmail(tokenHash: string) {
    const [user] = await db
      .update(usuarioTable)
      .set({ tokenVerificacion: null })
      .where(eq(usuarioTable.tokenVerificacion, tokenHash))
      .returning({ id: usuarioTable.id });

    return user;
  }

  /** Cuenta activa que todavía no verificó su correo. */
  async findPendingByEmail(email: string) {
    const [user] = await db
      .select({
        id: usuarioTable.id,
        nombre: usuarioTable.nombre,
        correoInstitucional: usuarioTable.correoInstitucional,
      })
      .from(usuarioTable)
      .where(
        and(
          eq(usuarioTable.correoInstitucional, email.trim().toLowerCase()),
          eq(usuarioTable.activo, true),
          isNotNull(usuarioTable.tokenVerificacion),
        ),
      );

    return user;
  }

  async setVerificationToken(userId: number, tokenHash: string) {
    await db
      .update(usuarioTable)
      .set({ tokenVerificacion: tokenHash })
      .where(eq(usuarioTable.id, userId));
  }
}
