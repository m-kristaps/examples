const name = 'API';

const isConfigured = () => Boolean(process.env.API_URL);

async function sendSchedule(rinks) {
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.API_TOKEN) headers.Authorization = `Bearer ${process.env.API_TOKEN}`;

    const body = {
        date: new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Riga' }),
        rinks: rinks.map((r) => ({ name: r.name, url: r.url, sessions: r.sessions })), // sessions null = failed
    };

    const res = await fetch(process.env.API_URL, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);

    console.log('Sent');
}

module.exports = { name, isConfigured, sendSchedule };
