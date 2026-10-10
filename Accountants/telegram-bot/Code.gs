/**
 * Good Consult Service: website forms -> Telegram.
 *
 * Receives the contact and newsletter forms from the website, sends each one
 * to your Telegram chat through your bot, and saves a copy in this Google Sheet.
 * Setup steps: see SETUP.md next to this file.
 */

// Paste the token that @BotFather gave you. Keep it only here, never in the website files.
const TELEGRAM_TOKEN = 'PASTE_YOUR_BOT_TOKEN_HERE';

const MAX_MESSAGES_PER_HOUR = 30;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Run this once from the Apps Script editor, right after sending any message to your bot.
 * It remembers your chat and sends you a test message.
 */
function setup() {
  const response = UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates`, { muteHttpExceptions: true });
  const result = JSON.parse(response.getContentText());
  if (!result.ok) {
    throw new Error('The bot token is not right. Copy it again from @BotFather and paste it at the top of this file.');
  }

  const messages = result.result.filter((update) => update.message);
  if (!messages.length) {
    throw new Error('Open your bot in Telegram, press Start or send it any message, then run setup again.');
  }

  const chatId = String(messages[messages.length - 1].message.chat.id);
  PropertiesService.getScriptProperties().setProperty('TELEGRAM_CHAT_ID', chatId);
  sendTelegram('✅ Good Consult Service sayti ulandi. Endi saytdagi barcha so‘rovlar shu yerga keladi.');
  console.log(`Done: chat ${chatId} saved and a test message was sent. Next step: Deploy > New deployment.`);
}

/** The website posts its forms here. */
function doPost(e) {
  let raw;
  try {
    raw = JSON.parse(e.postData.contents);
  } catch (error) {
    return reply({ ok: false, error: 'invalid' });
  }

  // Hidden "website" field: people never see it, spam bots fill it in
  if (raw.website) {
    return reply({ ok: true });
  }

  const data = {
    type: raw.type === 'newsletter' ? 'newsletter' : 'contact',
    name: clean(raw.name, 100),
    email: clean(raw.email, 200),
    phone: clean(raw.phone, 50),
    service: clean(raw.service, 100),
    message: clean(raw.message, 3000),
    lang: raw.lang === 'ru' ? 'ru' : 'uz',
  };

  const complete = data.type === 'newsletter' ? EMAIL_PATTERN.test(data.email) : Boolean(data.name && data.phone && data.message);
  if (!complete) {
    return reply({ ok: false, error: 'invalid' });
  }
  if (!withinHourlyLimit()) {
    return reply({ ok: false, error: 'too_many' });
  }

  let saved = false;
  try {
    saved = saveToSheet(data);
  } catch (error) {
    console.error(error);
  }

  try {
    sendTelegram(data.type === 'newsletter' ? newsletterText(data) : contactText(data));
    return reply({ ok: true });
  } catch (error) {
    console.error(error);
    // Still a success for the visitor if the request was saved in the sheet
    return reply(saved ? { ok: true } : { ok: false, error: 'telegram_failed' });
  }
}

/** Opening the web app address in a browser shows that it is running. */
function doGet() {
  return ContentService.createTextOutput('Good Consult Service form endpoint is running.');
}

function contactText(data) {
  return [
    '📩 Saytdan yangi so‘rov',
    '',
    `👤 Ism: ${data.name}`,
    `📧 E-mail: ${data.email || '—'}`,
    `📞 Telefon: ${data.phone || '—'}`,
    `🧾 Xizmat: ${data.service || '—'}`,
    `💬 Xabar: ${data.message}`,
    `🌐 Sayt tili: ${data.lang.toUpperCase()}`,
  ].join('\n');
}

function newsletterText(data) {
  return `📰 Yangiliklarga yangi obunachi: ${data.email}`;
}

function sendTelegram(text) {
  const chatId = PropertiesService.getScriptProperties().getProperty('TELEGRAM_CHAT_ID');
  if (!chatId) {
    throw new Error('Telegram is not connected yet: run setup first.');
  }

  // Plain text (no parse_mode), so whatever visitors type is shown as-is
  const response = UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: text, disable_web_page_preview: true }),
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200) {
    throw new Error(`Telegram refused the message: ${response.getContentText()}`);
  }
}

/** Adds a row to the first tab of this Google Sheet. Returns false when the script has no sheet. */
function saveToSheet(data) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    return false;
  }

  const sheet = spreadsheet.getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Sana', 'Turi', 'Ism', 'E-mail', 'Telefon', 'Xizmat', 'Xabar', 'Til']);
    sheet.setFrozenRows(1);
  }
  const type = data.type === 'newsletter' ? 'Obuna' : 'So‘rov';
  sheet.appendRow([new Date(), type, data.name, data.email, data.phone, data.service, data.message, data.lang.toUpperCase()].map(asText));
  return true;
}

/** Caps how many messages can arrive per hour, so a spam attack can't flood your Telegram. */
function withinHourlyLimit() {
  const cache = CacheService.getScriptCache();
  const key = `count-${Math.floor(Date.now() / 3600000)}`;
  const count = Number(cache.get(key) || 0);
  if (count >= MAX_MESSAGES_PER_HOUR) {
    return false;
  }
  cache.put(key, String(count + 1), 3600);
  return true;
}

function clean(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

// Stops the sheet from treating text such as "+998..." or "=..." as a formula
function asText(value) {
  return typeof value === 'string' && /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function reply(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
