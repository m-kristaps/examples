const { Telegram } = require('telegraf');

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function formatMessage(rinks) {
    const date = new Date().toLocaleDateString('lv-LV', { timeZone: 'Europe/Riga' });
    let message = `<b>ŠODIENAS HOKEJA GRAFIKS</b> (${date})\n\n`;

    for (const rink of rinks) {
        message += `<a href="${rink.url}"><b>${escape(rink.name)}</b></a>\n`;

        if (rink.sessions === null) {
            message += `<i>Neizdevās ielādēt grafiku</i>\n`;
        } else if (rink.sessions.length === 0) {
            message += `<i>Šodien ms hokejs nav</i>\n`;
        } else {
            for (const s of rink.sessions) {
                message += `• ${escape(s.time)} - ${escape(s.name)}\n`;
            }
        }
        message += '\n';
    }

    return message.trim();
}

const name = 'Telegram';

const isConfigured = () => Boolean(process.env.T_BOT_TOKEN && process.env.T_BOT_CHAT_ID);

async function sendSchedule(rinks) {
    const chatId = process.env.T_BOT_CHAT_ID;
    const telegram = new Telegram(process.env.T_BOT_TOKEN);
    await telegram.sendMessage(chatId, formatMessage(rinks), { parse_mode: 'HTML', disable_web_page_preview: true });

    const hasSessions = rinks.some((r) => r.sessions && r.sessions.length > 0);
    if (hasSessions && process.env.T_BOT_POLL === '1') {
        await telegram.sendPoll(chatId, 'Kas nāks?', ['Būšu!', 'Netieku', 'Vēl nezinu']);
    }

    console.log('Sent to telegram');
}

module.exports = { name, isConfigured, sendSchedule, formatMessage };
