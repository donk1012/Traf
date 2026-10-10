# Get website requests in Telegram

When a visitor sends the contact form (or subscribes to the newsletter), you get a
Telegram message from your own bot, and a copy is saved in a Google Sheet.

It takes about 10 minutes and is free. You need Telegram and the Google account
`mahbubazopirqulovna@gmail.com`.

## 1. Create the bot

1. In Telegram, open **@BotFather** and send `/newbot`.
2. Name: `Good Consult Service`.
3. Username: anything ending in `bot`, for example `goodconsult_site_bot`.
4. BotFather replies with a **token** (looks like `1234567890:AAH...`). Copy it.
   Keep it secret: anyone with the token controls the bot.
5. Tap the link to your new bot (`t.me/...`) and press **Start**.

Want the messages in a group instead (for example, you and your colleagues)?
Add the bot to the group and send any message in the group. Do this right
before step 3.

## 2. Create the Google Sheet and paste the script

1. Open <https://sheets.new> while signed in to your Gmail account.
   Name the sheet, for example `Sayt so‘rovlari`.
2. Menu **Extensions → Apps Script**.
3. Delete the sample code and paste everything from [`Code.gs`](Code.gs).
4. At the top, replace `PASTE_YOUR_BOT_TOKEN_HERE` with your bot token
   (keep the quotes).
5. Press **Save** (the disk icon).

## 3. Connect Telegram

1. In the toolbar, choose the function **setup** and press **Run**.
2. Google asks for permission the first time: **Review permissions** → choose
   your account → **Advanced** → **Go to … (unsafe)** → **Allow**.
   ("Unsafe" only means Google hasn't reviewed your own script.)
3. You should get a ✅ message from your bot in Telegram.

If you see an error instead, it says what to fix (usually: press Start in the
bot, or the token was copied wrong). Fix it and run **setup** again.

## 4. Publish the script

1. Press **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**.
4. Press **Deploy** and copy the **Web app URL**
   (`https://script.google.com/macros/s/.../exec`).

## 5. Connect the website

Send the Web app URL to Claude, or paste it yourself at the top of
`Accountants/script.js`:

```js
const FORM_ENDPOINT = 'https://script.google.com/macros/s/.../exec';
```

The URL is safe to put on the website. The bot token is not, so it stays only
in the Apps Script.

Test it: open the website, send the contact form, and check Telegram and the sheet.

## Later changes

- **Changing the script:** after editing, use **Deploy → Manage deployments**,
  press the pencil, set **Version: New version**, then **Deploy**. The URL stays
  the same. Edit only the lines that change, so your token on the
  `TELEGRAM_TOKEN` line stays in place.
- **When the website's form changes** (for example which fields are required),
  update and redeploy the script at the same time. Otherwise the old script
  rejects the new form and visitors see "message not sent".
- **Spam protection:** the form has a hidden field that bots fill in and people
  don't, and the script accepts at most 30 messages per hour. You can change
  `MAX_MESSAGES_PER_HOUR` at the top of the script.
