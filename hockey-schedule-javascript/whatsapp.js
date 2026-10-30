const name = 'WhatsApp';

const isConfigured = () => Boolean(process.env.WA_CHAT);

function formatMessage(rinks) {
    const date = new Date().toLocaleDateString('lv-LV', { timeZone: 'Europe/Riga' });
    let message = `*ŠODIENAS HOKEJA GRAFIKS* (${date})\n\n`;

    for (const rink of rinks) {
        message += `*${rink.name}*\n`;

        if (rink.sessions === null) {
            message += `_Neizdevās ielādēt grafiku_\n`;
        } else if (rink.sessions.length === 0) {
            message += `_Šodien ms hokejs nav_\n`;
        } else {
            for (const s of rink.sessions) {
                message += `• ${s.time} - ${s.name}\n`;
            }
        }
        message += `${rink.url}\n\n`;
    }

    return message.trim();
}

function startClient() {
    const { Client, LocalAuth } = require('whatsapp-web.js');
    const qrcode = require('qrcode-terminal');

    const client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: { args: ['--no-sandbox'] },
    });

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('not logged in after 2 min')), 120000);

        client.on('qr', (qr) => {
            console.log('scan with whatsapp > linked devices');
            qrcode.generate(qr, { small: true });
        });
        client.on('ready', () => {
            clearTimeout(timeout);
            resolve(client);
        });
        client.on('auth_failure', (msg) => reject(new Error('auth failed: ' + msg)));

        client.initialize().catch(reject);
    });
}

async function findChatId(client, chat) {
    if (chat.includes('@')) return chat;

    const chats = await client.getChats();
    const found = chats.find((c) => c.name === chat);
    if (!found) throw new Error(`chat "${chat}" not found`);
    return found.id._serialized;
}

async function sendSchedule(rinks) {
    const client = await startClient();
    try {
        const chatId = await findChatId(client, process.env.WA_CHAT);
        await client.sendMessage(chatId, formatMessage(rinks));
        await new Promise((r) => setTimeout(r, 3000));
        console.log('Sent to whatsapp');
    } finally {
        await client.destroy();
    }
}

module.exports = { name, isConfigured, sendSchedule, formatMessage };
