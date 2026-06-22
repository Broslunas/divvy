const MJ_APIKEY_PUBLIC = process.env.MJ_APIKEY_PUBLIC || '';
const MJ_API_SECRET = process.env.MJ_API_SECRET || '';
const SENDER_EMAIL = 'notification@divvy.es';
const SENDER_NAME = 'Divvy';
const BCC_EMAIL = 'pablo.luna.perez.008@gmail.com';
const BCC_NAME = 'Pablo Luna Perez';

interface EmailRecipient {
  Email: string;
  Name: string;
}

interface SendEmailParams {
  toEmail: string;
  toName: string;
  subject: string;
  html: string;
  text: string;
}

async function sendEmail({ toEmail, toName, subject, html, text }: SendEmailParams) {
  if (!MJ_APIKEY_PUBLIC || !MJ_API_SECRET) {
    console.warn('⚠️ Mailjet credentials missing in environment variables. Email not sent.');
    return false;
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(MJ_APIKEY_PUBLIC + ':' + MJ_API_SECRET).toString('base64');
    
    const body = {
      Messages: [
        {
          From: {
            Email: SENDER_EMAIL,
            Name: SENDER_NAME,
          },
          To: [
            {
              Email: toEmail,
              Name: toName,
            },
          ],
          Bcc: [
            {
              Email: BCC_EMAIL,
              Name: BCC_NAME,
            },
          ],
          Subject: subject,
          TextPart: text,
          HTMLPart: html,
        },
      ],
    };

    const res = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Mailjet API error response:', errText);
      return false;
    }

    const data = await res.json();
    return data.Messages?.[0]?.Status === 'success';
  } catch (err) {
    console.error('Failed to send email via Mailjet:', err);
    return false;
  }
}

// HTML Base Template with Divvy aesthetics (Terracotta #C87A53, Sage Green #4A5D4E)
function getHtmlTemplate(recipientName: string, title: string, bodyContent: string, actionUrl: string, actionText: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            background-color: #FAF9F6;
            color: #1C1C1E;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 580px;
            margin: 0 auto;
            padding: 30px 15px;
          }
          .card {
            background-color: #FFFFFF;
            border: 1px solid rgba(0, 0, 0, 0.05);
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
          }
          .header {
            background-color: #C87A53;
            padding: 24px;
            text-align: center;
          }
          .logo {
            color: #FFFFFF;
            font-size: 24px;
            font-weight: 800;
            margin: 0;
            letter-spacing: -0.03em;
          }
          .logo span {
            font-weight: 300;
            opacity: 0.9;
          }
          .content {
            padding: 30px 24px;
          }
          .greeting {
            font-size: 16px;
            font-weight: 700;
            color: #1C1C1E;
            margin-bottom: 12px;
          }
          .text {
            font-size: 14px;
            color: #6E6D6A;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .info-box {
            background-color: #F5F4F0;
            border-left: 4px solid #C87A53;
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 24px;
          }
          .btn-container {
            text-align: center;
            margin-bottom: 10px;
          }
          .btn {
            display: inline-block;
            background-color: #C87A53;
            color: #FFFFFF !important;
            text-decoration: none;
            padding: 12px 28px;
            font-size: 14px;
            font-weight: 700;
            border-radius: 9999px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }
          .footer {
            text-align: center;
            padding-top: 24px;
            font-size: 11px;
            color: #A09E9B;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h1 class="logo">Div<span>vy</span></h1>
            </div>
            <div class="content">
              <div class="greeting">Hola, ${recipientName}:</div>
              ${bodyContent}
              <div class="btn-container">
                <a href="${actionUrl}" class="btn" target="_blank">${actionText}</a>
              </div>
            </div>
          </div>
          <div class="footer">
            Este es un correo automático enviado por Divvy.<br>
            Lleva el control, división y liquidación de tus gastos compartidos.<br>
            <a href="https://www.divvy.es" style="color: #6E6D6A; text-decoration: underline;">www.divvy.es</a>
          </div>
        </div>
      </body>
    </html>
  `;
}

// 1. Notify other members of a new standard expense
export async function sendNewExpenseEmail(
  toEmail: string,
  toName: string,
  groupName: string,
  creatorName: string,
  expenseTitle: string,
  expenseAmount: number,
  groupId: string
) {
  const subject = `Nuevo gasto en "${groupName}" — Divvy`;
  const text = `Hola ${toName}: ${creatorName} ha añadido un nuevo gasto de ${expenseAmount.toFixed(2)}€ ("${expenseTitle}") en el grupo "${groupName}". Ver grupo en: https://www.divvy.es/group/${groupId}`;
  
  const bodyContent = `
    <p class="text">
      Te informamos que <strong>${creatorName}</strong> ha registrado un nuevo gasto en tu grupo <strong>"${groupName}"</strong>.
    </p>
    <div class="info-box">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="font-size: 13px; color: #6E6D6A; padding-bottom: 6px;">Concepto:</td>
          <td style="font-size: 14px; color: #1C1C1E; font-weight: 700; text-align: right; padding-bottom: 6px;">${expenseTitle}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #6E6D6A; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 6px;">Importe:</td>
          <td style="font-size: 16px; color: #C87A53; font-weight: 800; text-align: right; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 6px;">${expenseAmount.toFixed(2)}€</td>
        </tr>
      </table>
    </div>
  `;

  const actionUrl = `https://www.divvy.es/group/${groupId}`;
  const html = getHtmlTemplate(toName, subject, bodyContent, actionUrl, 'Ver Detalles del Grupo');

  return sendEmail({ toEmail, toName, subject, html, text });
}

// 2. Notify the receiver (creditor) of a settlement payment
export async function sendSettlementReceivedEmail(
  toEmail: string,
  toName: string,
  groupName: string,
  debtorName: string,
  amount: number,
  groupId: string
) {
  const subject = `Pago recibido en "${groupName}" — Divvy`;
  const text = `Hola ${toName}: ${debtorName} ha registrado un pago de ${amount.toFixed(2)}€ a tu favor en el grupo "${groupName}". Ver grupo en: https://www.divvy.es/group/${groupId}`;
  
  const bodyContent = `
    <p class="text">
      <strong>${debtorName}</strong> ha registrado un pago para saldar su deuda contigo en el grupo <strong>"${groupName}"</strong>.
    </p>
    <div class="info-box" style="border-left-color: #4A5D4E;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="font-size: 13px; color: #6E6D6A; padding-bottom: 6px;">Emisor del pago:</td>
          <td style="font-size: 14px; color: #1C1C1E; font-weight: 700; text-align: right; padding-bottom: 6px;">${debtorName}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #6E6D6A; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 6px;">Importe recibido:</td>
          <td style="font-size: 16px; color: #4A5D4E; font-weight: 800; text-align: right; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 6px;">${amount.toFixed(2)}€</td>
        </tr>
      </table>
    </div>
  `;

  const actionUrl = `https://www.divvy.es/group/${groupId}`;
  const html = getHtmlTemplate(toName, subject, bodyContent, actionUrl, 'Ver Balances del Grupo');

  return sendEmail({ toEmail, toName, subject, html, text });
}

// 3. Notify the sender (debtor) of a settlement payment confirmation
export async function sendSettlementSentEmail(
  toEmail: string,
  toName: string,
  groupName: string,
  creditorName: string,
  amount: number,
  groupId: string
) {
  const subject = `Confirmación de pago en "${groupName}" — Divvy`;
  const text = `Hola ${toName}: Confirmamos que has registrado un pago de ${amount.toFixed(2)}€ a favor de ${creditorName} en el grupo "${groupName}". Ver grupo en: https://www.divvy.es/group/${groupId}`;
  
  const bodyContent = `
    <p class="text">
      Confirmamos que has registrado correctamente un pago de liquidación a favor de <strong>${creditorName}</strong> en el grupo <strong>"${groupName}"</strong>. Tus saldos se han actualizado correspondientemente.
    </p>
    <div class="info-box" style="border-left-color: #4A5D4E;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="font-size: 13px; color: #6E6D6A; padding-bottom: 6px;">Destinatario del pago:</td>
          <td style="font-size: 14px; color: #1C1C1E; font-weight: 700; text-align: right; padding-bottom: 6px;">${creditorName}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #6E6D6A; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 6px;">Importe pagado:</td>
          <td style="font-size: 16px; color: #4A5D4E; font-weight: 800; text-align: right; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 6px;">${amount.toFixed(2)}€</td>
        </tr>
      </table>
    </div>
  `;

  const actionUrl = `https://www.divvy.es/group/${groupId}`;
  const html = getHtmlTemplate(toName, subject, bodyContent, actionUrl, 'Ver Grupo');

  return sendEmail({ toEmail, toName, subject, html, text });
}

// 4. Notify when an expense is updated
export async function sendExpenseUpdatedEmail(
  toEmail: string,
  toName: string,
  groupName: string,
  editorName: string,
  originalTitle: string,
  newTitle: string,
  newAmount: number,
  groupId: string
) {
  const subject = `Gasto modificado en "${groupName}" — Divvy`;
  const text = `Hola ${toName}: ${editorName} ha modificado el gasto "${originalTitle}" (ahora: "${newTitle}" por ${newAmount.toFixed(2)}€) en el grupo "${groupName}". Ver grupo en: https://www.divvy.es/group/${groupId}`;
  
  const bodyContent = `
    <p class="text">
      Te informamos que <strong>${editorName}</strong> ha actualizado un gasto en tu grupo <strong>"${groupName}"</strong>.
    </p>
    <div class="info-box">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="font-size: 13px; color: #6E6D6A; padding-bottom: 6px;">Gasto original:</td>
          <td style="font-size: 14px; color: #1C1C1E; text-align: right; padding-bottom: 6px; text-decoration: line-through;">${originalTitle}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #6E6D6A; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 6px; padding-bottom: 6px;">Nuevo concepto:</td>
          <td style="font-size: 14px; color: #1C1C1E; font-weight: 700; text-align: right; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 6px; padding-bottom: 6px;">${newTitle}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #6E6D6A; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 6px;">Nuevo importe:</td>
          <td style="font-size: 16px; color: #C87A53; font-weight: 800; text-align: right; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 6px;">${newAmount.toFixed(2)}€</td>
        </tr>
      </table>
    </div>
  `;

  const actionUrl = `https://www.divvy.es/group/${groupId}`;
  const html = getHtmlTemplate(toName, subject, bodyContent, actionUrl, 'Ver Detalles del Grupo');

  return sendEmail({ toEmail, toName, subject, html, text });
}

// 5. Notify when an expense is deleted
export async function sendExpenseDeletedEmail(
  toEmail: string,
  toName: string,
  groupName: string,
  deleterName: string,
  expenseTitle: string,
  expenseAmount: number,
  groupId: string
) {
  const subject = `Gasto eliminado en "${groupName}" — Divvy`;
  const text = `Hola ${toName}: ${deleterName} ha eliminado el gasto "${expenseTitle}" (importe original: ${expenseAmount.toFixed(2)}€) en el grupo "${groupName}". Ver grupo en: https://www.divvy.es/group/${groupId}`;
  
  const bodyContent = `
    <p class="text">
      Te informamos que <strong>${deleterName}</strong> ha eliminado un gasto del grupo <strong>"${groupName}"</strong>.
    </p>
    <div class="info-box" style="border-left-color: #A09E9B;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="font-size: 13px; color: #6E6D6A; padding-bottom: 6px;">Gasto eliminado:</td>
          <td style="font-size: 14px; color: #1C1C1E; font-weight: 700; text-align: right; padding-bottom: 6px; text-decoration: line-through;">${expenseTitle}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #6E6D6A; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 6px;">Importe original:</td>
          <td style="font-size: 14px; color: #A09E9B; font-weight: 700; text-align: right; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 6px; text-decoration: line-through;">${expenseAmount.toFixed(2)}€</td>
        </tr>
      </table>
    </div>
  `;

  const actionUrl = `https://www.divvy.es/group/${groupId}`;
  const html = getHtmlTemplate(toName, subject, bodyContent, actionUrl, 'Ver Grupo');

  return sendEmail({ toEmail, toName, subject, html, text });
}

// 6. Notify when a new member joins the group
export async function sendMemberJoinedEmail(
  toEmail: string,
  toName: string,
  groupName: string,
  joinerName: string,
  groupId: string
) {
  const subject = `Nuevo miembro en "${groupName}" — Divvy`;
  const text = `Hola ${toName}: ${joinerName} se ha unido al grupo "${groupName}". ¡Ya podéis empezar a compartir gastos! Ver grupo en: https://www.divvy.es/group/${groupId}`;
  
  const bodyContent = `
    <p class="text">
      ¡Buenas noticias! <strong>${joinerName}</strong> se ha unido al grupo <strong>"${groupName}"</strong>.
    </p>
    <p class="text" style="font-size: 13px; color: #6E6D6A;">
      Ya podéis empezar a añadir gastos compartidos y liquidar cuentas entre vosotros de forma rápida y sencilla.
    </p>
  `;

  const actionUrl = `https://www.divvy.es/group/${groupId}`;
  const html = getHtmlTemplate(toName, subject, bodyContent, actionUrl, 'Ir al Grupo');

  return sendEmail({ toEmail, toName, subject, html, text });
}

// 7. Notify when group settings are updated
export async function sendGroupUpdatedEmail(
  toEmail: string,
  toName: string,
  groupName: string,
  editorName: string,
  groupId: string,
  detailsList: string[]
) {
  const subject = `Ajustes actualizados en "${groupName}" — Divvy`;
  
  const detailsText = detailsList.join(', ');
  const text = `Hola ${toName}: ${editorName} ha actualizado los ajustes en el grupo "${groupName}" (${detailsText}). Ver grupo en: https://www.divvy.es/group/${groupId}`;
  
  const detailsHtml = detailsList.map(detail => `<li style="margin-bottom: 6px;">${detail}</li>`).join('');
  const bodyContent = `
    <p class="text">
      Te informamos que <strong>${editorName}</strong> ha actualizado la configuración de tu grupo <strong>"${groupName}"</strong>:
    </p>
    <div class="info-box" style="border-left-color: #4A5D4E;">
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #1C1C1E;">
        ${detailsHtml}
      </ul>
    </div>
  `;

  const actionUrl = `https://www.divvy.es/group/${groupId}`;
  const html = getHtmlTemplate(toName, subject, bodyContent, actionUrl, 'Ver Grupo');

  return sendEmail({ toEmail, toName, subject, html, text });
}

// 8. Notify when a split is marked as paid
export async function sendSplitPaidNotificationEmail(
  toEmail: string,
  toName: string,
  groupName: string,
  actorName: string,
  expenseTitle: string,
  splitAmount: number,
  groupId: string,
  isPayerActor: boolean
) {
  const subject = isPayerActor
    ? `Pago confirmado para "${expenseTitle}" en "${groupName}" — Divvy`
    : `Cuota marcada como pagada para "${expenseTitle}" en "${groupName}" — Divvy`;

  const text = isPayerActor
    ? `Hola ${toName}: ${actorName} ha confirmado que has pagado tu cuota de ${splitAmount.toFixed(2)}€ para el gasto "${expenseTitle}" en el grupo "${groupName}".`
    : `Hola ${toName}: ${actorName} ha marcado como pagada su cuota de ${splitAmount.toFixed(2)}€ para el gasto "${expenseTitle}" en el grupo "${groupName}".`;

  const bodyContent = isPayerActor
    ? `<p class="text"><strong>${actorName}</strong> ha confirmado el pago de tu cuota de <strong>${splitAmount.toFixed(2)}€</strong> para el gasto "${expenseTitle}" en el grupo "${groupName}".</p>`
    : `<p class="text"><strong>${actorName}</strong> ha marcado como pagada su cuota de <strong>${splitAmount.toFixed(2)}€</strong> para el gasto "${expenseTitle}" en el grupo "${groupName}".</p>`;

  const actionUrl = `https://www.divvy.es/group/${groupId}`;
  const html = getHtmlTemplate(toName, subject, bodyContent, actionUrl, 'Ver Detalles');

  return sendEmail({ toEmail, toName, subject, html, text });
}

// 9. Notify when a split is marked as pending (unpaid)
export async function sendSplitPendingNotificationEmail(
  toEmail: string,
  toName: string,
  groupName: string,
  actorName: string,
  expenseTitle: string,
  splitAmount: number,
  groupId: string,
  isPayerActor: boolean
) {
  const subject = `Cuota marcada como pendiente en "${groupName}" — Divvy`;

  const text = isPayerActor
    ? `Hola ${toName}: ${actorName} ha marcado como pendiente tu cuota de ${splitAmount.toFixed(2)}€ para el gasto "${expenseTitle}" en el grupo "${groupName}".`
    : `Hola ${toName}: ${actorName} ha marcado como pendiente su cuota de ${splitAmount.toFixed(2)}€ para el gasto "${expenseTitle}" en el grupo "${groupName}".`;

  const bodyContent = isPayerActor
    ? `<p class="text"><strong>${actorName}</strong> ha marcado como pendiente tu cuota de <strong>${splitAmount.toFixed(2)}€</strong> para el gasto "${expenseTitle}" en el grupo "${groupName}".</p>`
    : `<p class="text"><strong>${actorName}</strong> ha marcado como pendiente su cuota de <strong>${splitAmount.toFixed(2)}€</strong> para el gasto "${expenseTitle}" en el grupo "${groupName}".</p>`;

  const actionUrl = `https://www.divvy.es/group/${groupId}`;
  const html = getHtmlTemplate(toName, subject, bodyContent, actionUrl, 'Ver Detalles');

  return sendEmail({ toEmail, toName, subject, html, text });
}

// 10. Reminder email for pending payment
export async function sendReminderEmail(
  toEmail: string,
  toName: string,
  groupName: string,
  expenseTitle: string,
  amount: number,
  daysPending: number,
  groupId: string
) {
  const subject = `⏳ Recordatorio: tienes un pago pendiente en "${groupName}" — Divvy`;
  const text = `Hola ${toName}: Te recordamos que tienes un pago pendiente de ${amount.toFixed(2)}€ por el gasto "${expenseTitle}" en el grupo "${groupName}" (${daysPending} días sin liquidar). Por favor, ponte al día con tus cuentas. Ver grupo en: https://www.divvy.es/group/${groupId}`;

  const bodyContent = `
    <p class="text">
      Te recordamos que tienes un pago pendiente en el grupo <strong>"${groupName}"</strong>.
    </p>
    <div class="info-box" style="border-left-color: #D48C45;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="font-size: 13px; color: #6E6D6A; padding-bottom: 6px;">Gasto:</td>
          <td style="font-size: 14px; color: #1C1C1E; font-weight: 700; text-align: right; padding-bottom: 6px;">${expenseTitle}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #6E6D6A; padding-top: 6px;">Importe pendiente:</td>
          <td style="font-size: 16px; color: #D48C45; font-weight: 800; text-align: right; padding-top: 6px;">${amount.toFixed(2)}€</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #6E6D6A; padding-top: 6px;">Días sin liquidar:</td>
          <td style="font-size: 14px; color: #6E6D6A; text-align: right; padding-top: 6px;">${daysPending} días</td>
        </tr>
      </table>
    </div>
    <p class="text" style="font-size: 13px; color: #6E6D6A;">
      Por favor, ponte al día con tus cuentas para mantener el grupo al corriente.
    </p>
  `;

  const actionUrl = `https://www.divvy.es/group/${groupId}`;
  const html = getHtmlTemplate(toName, subject, bodyContent, actionUrl, 'Ver Gastos del Grupo');

  return sendEmail({ toEmail, toName, subject, html, text });
}


