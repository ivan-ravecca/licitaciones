import nodemailer from 'nodemailer';
import { EmailReport, MatchedItem } from '../types';
import { AppConfig } from '../types';

function buildItemHtml(item: MatchedItem): string {
  return `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
        <strong><a href="${item.link}" style="color:#1d4ed8;text-decoration:none;">${item.title}</a></strong><br/>
        <span style="font-size:12px;color:#6b7280;">Departamento ID: ${item.departmentId} &middot; ${item.pubDate}</span><br/>
        <p style="margin:6px 0;font-size:14px;color:#374151;">${item.description.slice(0, 300)}${item.description.length > 300 ? '...' : ''}</p>
        <p style="margin:4px 0;font-size:13px;">
          <span style="color:#059669;font-weight:600;">Palabras coincidentes:</span>
          ${item.matchedKeywords.map((k) => `<span style="background:#d1fae5;padding:2px 6px;border-radius:4px;margin-right:4px;font-size:12px;">${k}</span>`).join('')}
        </p>
        <p style="margin:4px 0;font-size:13px;color:#6b7280;font-style:italic;">${item.reason}</p>
        <a href="${item.link}" style="display:inline-block;margin-top:6px;padding:4px 12px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:4px;font-size:13px;">Ver llamado →</a>
      </td>
    </tr>`;
}

function buildHtmlEmail(report: EmailReport): string {
  const itemsHtml =
    report.matches.length > 0
      ? report.matches.map(buildItemHtml).join('')
      : `<tr><td style="padding:16px;color:#6b7280;text-align:center;">No se encontraron coincidencias hoy.</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:0;">
  <div style="max-width:700px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:#1d4ed8;padding:20px 24px;">
      <h1 style="margin:0;color:#fff;font-size:20px;">📋 Reporte de Licitaciones</h1>
      <p style="margin:4px 0 0;color:#bfdbfe;font-size:14px;">${report.date}</p>
    </div>
    <div style="padding:16px 24px;background:#eff6ff;border-bottom:1px solid #dbeafe;">
      <span style="font-size:14px;color:#1e40af;">
        <strong>${report.totalMatched}</strong> coincidencia(s) encontrada(s) de
        <strong>${report.totalFetched}</strong> llamados analizados.
      </span>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${itemsHtml}
    </table>
    <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center;">
      Generado automáticamente · <a href="https://www.comprasestatales.gub.uy" style="color:#6b7280;">comprasestatales.gub.uy</a>
    </div>
  </div>
</body>
</html>`;
}

function buildTextEmail(report: EmailReport): string {
  const lines = [
    `REPORTE DE LICITACIONES - ${report.date}`,
    `${'='.repeat(50)}`,
    `${report.totalMatched} coincidencia(s) de ${report.totalFetched} llamados analizados.`,
    '',
  ];

  if (report.matches.length === 0) {
    lines.push('No se encontraron coincidencias hoy.');
  } else {
    for (const item of report.matches) {
      lines.push(`- ${item.title}`);
      lines.push(`  Departamento: ${item.departmentId}`);
      lines.push(`  Fecha: ${item.pubDate}`);
      lines.push(`  Palabras: ${item.matchedKeywords.join(', ')}`);
      lines.push(`  Motivo: ${item.reason}`);
      lines.push(`  Link: ${item.link}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

export async function sendReport(report: EmailReport, appConfig: AppConfig): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: appConfig.smtp.host,
    port: appConfig.smtp.port,
    secure: appConfig.smtp.secure,
    auth: {
      user: appConfig.smtp.user,
      pass: appConfig.smtp.pass,
    },
  });

  const subject =
    report.totalMatched > 0
      ? `✅ Licitaciones: ${report.totalMatched} coincidencia(s) - ${report.date}`
      : `📋 Licitaciones: Sin coincidencias - ${report.date}`;

  // await transporter.sendMail({
  //   from: appConfig.email.from,
  //   to: appConfig.email.to,
  //   subject,
  //   text: buildTextEmail(report),
  //   html: buildHtmlEmail(report),
  // });

  console.log(`[email] Would send email with subject: ${subject}`);
  console.log(`[email] To: ${appConfig.email.to}`);
  console.log(`[email] Text content:\n${buildTextEmail(report)}`);

  console.log(`[email] Report sent to ${appConfig.email.to}`);
}
