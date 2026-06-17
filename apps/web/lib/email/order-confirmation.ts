import { getServerEnv } from '@luxematch/config';
import type { CartItemWithProduct, OrderRow } from '@luxematch/db';
import nodemailer from 'nodemailer';

type OrderConfirmationInput = {
  to: string;
  customerName: string | null;
  shopName: string;
  order: OrderRow;
  items: CartItemWithProduct[];
  orderUrl: string;
};

function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function smtpConfigured(env: ReturnType<typeof getServerEnv>): boolean {
  return Boolean(
    env.SMTP_HOST &&
    env.SMTP_PORT &&
    env.SMTP_USER &&
    env.SMTP_PASS &&
    env.SMTP_FROM_EMAIL,
  );
}

function orderItemsHtml(items: CartItemWithProduct[]): string {
  return items.map((item) => {
    const name = escapeHtml(item.product.name);
    const qty = item.quantity;
    const price = formatINR((item.product.price_min ?? 0) * qty);
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0e6d2;color:#17130c;font-size:14px;">${name}</td>
        <td align="center" style="padding:12px 0;border-bottom:1px solid #f0e6d2;color:#5f5546;font-size:14px;">${qty}</td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid #f0e6d2;color:#17130c;font-size:14px;font-weight:700;">${price}</td>
      </tr>
    `;
  }).join('');
}

function buildOrderConfirmationHtml(input: OrderConfirmationInput): string {
  const customer = escapeHtml(input.customerName ?? 'Customer');
  const shopName = escapeHtml(input.shopName);
  const orderNumber = escapeHtml(input.order.order_number);
  const orderUrl = escapeHtml(input.orderUrl);
  const deliveryLabel = input.order.delivery_type === 'click_and_collect'
    ? 'Click and collect'
    : 'Delivery';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Your LuxeMatch order is confirmed</title>
  </head>
  <body style="margin:0;background:#f7f3ea;font-family:Arial,Helvetica,sans-serif;color:#17130c;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f3ea;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #eadfca;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 18px;border-bottom:1px solid #f0e6d2;">
                <div style="font-size:22px;font-weight:700;letter-spacing:.2px;">
                  <span style="color:#c9a84c;">Luxe</span>Match
                </div>
                <div style="margin-top:8px;font-size:13px;color:#7b6f5b;">Order confirmation from ${shopName}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px;">
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#17130c;">Order confirmed</h1>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#5f5546;">
                  Hi ${customer}, your order <strong>${orderNumber}</strong> has been confirmed.
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fbf7ef;border:1px solid #eadfca;border-radius:12px;margin-bottom:22px;">
                  <tr>
                    <td style="padding:16px;font-size:13px;color:#7b6f5b;">Status<br /><strong style="font-size:15px;color:#17130c;">Confirmed</strong></td>
                    <td style="padding:16px;font-size:13px;color:#7b6f5b;">Fulfilment<br /><strong style="font-size:15px;color:#17130c;">${deliveryLabel}</strong></td>
                    <td style="padding:16px;font-size:13px;color:#7b6f5b;">Estimated<br /><strong style="font-size:15px;color:#17130c;">${escapeHtml(input.order.estimated_delivery ?? 'Soon')}</strong></td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <th align="left" style="padding-bottom:8px;color:#7b6f5b;font-size:12px;text-transform:uppercase;letter-spacing:.06em;">Item</th>
                    <th align="center" style="padding-bottom:8px;color:#7b6f5b;font-size:12px;text-transform:uppercase;letter-spacing:.06em;">Qty</th>
                    <th align="right" style="padding-bottom:8px;color:#7b6f5b;font-size:12px;text-transform:uppercase;letter-spacing:.06em;">Total</th>
                  </tr>
                  ${orderItemsHtml(input.items)}
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;">
                  <tr>
                    <td style="padding:4px 0;color:#5f5546;font-size:14px;">Subtotal</td>
                    <td align="right" style="padding:4px 0;color:#17130c;font-size:14px;">${formatINR(input.order.subtotal)}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#5f5546;font-size:14px;">Discount</td>
                    <td align="right" style="padding:4px 0;color:#17130c;font-size:14px;">-${formatINR(input.order.discount)}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0 0;color:#17130c;font-size:16px;font-weight:700;">Total</td>
                    <td align="right" style="padding:10px 0 0;color:#17130c;font-size:16px;font-weight:700;">${formatINR(input.order.total)}</td>
                  </tr>
                </table>

                <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:24px;">
                  <tr>
                    <td style="background:#17130c;border-radius:999px;">
                      <a href="${orderUrl}" style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                        View order
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#fbf7ef;color:#8a7c67;font-size:12px;line-height:1.5;">
                This order was placed through LuxeMatch for ${shopName}.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendOrderConfirmationEmail(input: OrderConfirmationInput): Promise<void> {
  const env = getServerEnv();
  if (!smtpConfigured(env)) {
    console.warn('[email] SMTP env vars missing; skipped order confirmation email');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"${env.SMTP_FROM_NAME ?? 'LuxeMatch'}" <${env.SMTP_FROM_EMAIL}>`,
    to: input.to,
    subject: `Your LuxeMatch order ${input.order.order_number} is confirmed`,
    html: buildOrderConfirmationHtml(input),
    text: [
      `Hi ${input.customerName ?? 'Customer'},`,
      '',
      `Your order ${input.order.order_number} has been confirmed by ${input.shopName}.`,
      `Total: ${formatINR(input.order.total)}`,
      `View order: ${input.orderUrl}`,
    ].join('\n'),
  });
}
