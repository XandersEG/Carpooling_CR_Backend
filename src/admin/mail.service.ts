import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

type Correo = { para: string; asunto: string; texto: string };

// envía los correos del portal con nodemailer, por smtp
@Injectable()
export class MailService {
  private readonly registro = new Logger(MailService.name);
  // cuenta desde la que salen los correos; con gmail la contraseña es una "contraseña de aplicación"
  private readonly cuenta = process.env.SMTP_USER;
  private readonly transporte: Transporter | null = this.crearTransporte();

  // sin cuenta configurada no hay transporte: pasa en desarrollo
  private crearTransporte(): Transporter | null {
    const clave = process.env.SMTP_PASS;
    if (!this.cuenta || !clave) {
      return null;
    }
    // por defecto se usa el servidor de gmail; con otro proveedor solo cambian estas variables
    const puerto = Number(process.env.SMTP_PORT ?? 465);
    return createTransport({
      host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
      port: puerto,
      // el puerto 465 cifra desde el inicio; los demás suben a tls después de conectar
      secure: puerto === 465,
      auth: { user: this.cuenta, pass: clave },
    });
  }

  // envía un correo de solo texto. sin cuenta configurada lo deja en el registro del servidor, para poder probar
  async enviar({ para, asunto, texto }: Correo): Promise<void> {
    if (!this.transporte) {
      this.registro.warn(
        `faltan SMTP_USER y SMTP_PASS en el .env; este correo no se envió:\npara: ${para}\nasunto: ${asunto}\n\n${texto}`,
      );
      return;
    }
    await this.transporte.sendMail({
      from: `Tuanis Carpooling <${this.cuenta}>`,
      to: para,
      subject: asunto,
      text: texto,
    });
  }
}
