// netlify/functions/telegram-notify.js
//
// Приймає POST з даними форми (name, phone, message, form-name)
// і пересилає їх повідомленням у Telegram-канал через Bot API.
//
// Токен бота і chat_id канала НІКОЛИ не пишемо в код — вони задаються
// як змінні середовища в Netlify (Site settings → Environment variables):
//   TELEGRAM_BOT_TOKEN = 123456:ABC-DEF...
//   TELEGRAM_CHAT_ID   = -1001234567890  (або @username_каналу для публічного)

exports.handler = async function (event) {
  // Дозволяємо тільки POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set');
    return { statusCode: 500, body: 'Server not configured' };
  }

  let data;
  try {
    // Форма шле дані як application/x-www-form-urlencoded (як і Netlify Forms)
    const params = new URLSearchParams(event.body);
    data = Object.fromEntries(params.entries());
  } catch (err) {
    return { statusCode: 400, body: 'Bad Request' };
  }

  // Захист від ботів: якщо honeypot-поле заповнене — тихо ігноруємо
  if (data['bot-field']) {
    return { statusCode: 200, body: 'OK' };
  }

  const formLabel =
    data['form-name'] === 'audit-request'
      ? 'Заявка на безкоштовний аудит'
      : 'Заявка на консультацію';

  const name = (data.name || '—').trim();
  const phone = (data.phone || '—').trim();
  const message = (data.message || '—').trim();

  const text =
    `🔔 <b>${escapeHtml(formLabel)}</b>\n\n` +
    `👤 <b>Імʼя:</b> ${escapeHtml(name)}\n` +
    `📞 <b>Телефон:</b> ${escapeHtml(phone)}\n` +
    `💬 <b>Повідомлення:</b> ${escapeHtml(message)}\n\n` +
    `🌐 Джерело: lustra.agency`;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text,
          parse_mode: 'HTML',
        }),
      }
    );

    const result = await res.json();

    if (!result.ok) {
      console.error('Telegram API error:', result);
      return { statusCode: 502, body: 'Telegram API error' };
    }

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('Failed to send Telegram message:', err);
    return { statusCode: 500, body: 'Internal Error' };
  }
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
