import nodemailer from 'nodemailer';

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

const transporter =
  SMTP_HOST && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 465,
        secure: SMTP_SECURE === 'true',
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : null;

export async function sendMail({ to, subject, text, html }) {
  if (!transporter) return { ok: false, error: 'SMTP no configurado' };
  try {
    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    return { ok: true };
  } catch (error) {
    console.error('[mailer] Error enviando correo:', error);
    return { ok: false, error: error.message };
  }
}

export async function verifyTransporter() {
  if (!transporter) {
    console.warn('[mailer] Configuracion SMTP incompleta.');
    return false;
  }
  try {
    await transporter.verify();
    console.log('[mailer] Transporte SMTP verificado.');
    return true;
  } catch (error) {
    console.error('[mailer] Fallo la verificacion SMTP:', error);
    return false;
  }
}
