require('dotenv').config({ quiet: true });
const cheerio = require('cheerio');
const { parse } = require('csv-parse/sync');
const telegram = require('./telegram');
const whatsapp = require('./whatsapp');
const api = require('./api');

const KEYWORD = 'NŪJĀM';

const rinks = [
    { name: 'Volvo', url: 'https://www.volvoledus.lv/lv/ledus-noslodze.html', load: getVolvo },
    { name: 'Mārupe', url: marupeUrl(new Date()), load: getMarupe },
    { name: 'Inbox (Piņķi)', url: 'https://docs.google.com/spreadsheets/d/1AjRwSlwabe-pCw1wnOAZYcFpzS7y8dVwNXIg2juEgYw', load: getInbox },
];

function isoWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return { year: d.getUTCFullYear(), week: Math.ceil(((d - yearStart) / 86400000 + 1) / 7) };
}

function marupeUrl(date) {
    const { year, week } = isoWeek(date);
    return `https://marupesledus.lv/lv/ledus-noslodze/week/${year}/${week}`;
}

async function fetchText(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    return res.text();
}

const dayName = (text) => text.split(',')[0].trim().toLowerCase();
const isStickSession = (name) => name.toUpperCase().includes(KEYWORD);

async function getVolvo(url) {
    const $ = cheerio.load(await fetchText(url));
    const days = [];

    $('.lncnt').each((_, dayEl) => {
        const sessions = [];
        let arena = 0;

        $(dayEl).find('ul.day > li.colorize').each((_, li) => {
            const arenaName = 'Laukums ' + 'ABC'[arena++];

            $(li).find('div').each((_, item) => {
                const time = $(item).find('span').first().text().trim();
                const name = $(item).find('span').last().text().trim();
                if (isStickSession(name)) sessions.push({ time, name: `${name} (${arenaName})` });
            });
        });

        days.push({ day: dayName($(dayEl).find('div.day').text()), sessions });
    });

    return days;
}

async function getMarupe(url) {
    const $ = cheerio.load(await fetchText(url));
    const columns = $('.days-list > .row div.col-sm-3');
    if (!columns.length) throw new Error('days table not found, page layout changed?');

    return columns.toArray().map((col) => {
        const sessions = [];
        $(col).find('tr').each((_, tr) => {
            const time = $(tr).find('div.date').text().trim();
            const name = $(tr).find('div.team').text().trim();
            if (isStickSession(name)) sessions.push({ time, name });
        });
        return { day: dayName($(col).find('div.title').text()), sessions };
    });
}

async function getInbox(url) {
    const records = parse(await fetchText(url + '/export?format=csv'), { skip_empty_lines: true });
    const [header, ...rows] = records;
    const days = [];

    for (let col = 0; col < header.length; col += 2) {
        if (!header[col]) continue;

        const sessions = rows
            .map((row) => ({ time: (row[col] || '').trim(), name: (row[col + 1] || '').trim() }))
            .filter((s) => isStickSession(s.name))
            .map((s) => ({ ...s, time: s.time || 'Nav norādīts' }));

        days.push({ day: dayName(header[col]), sessions });
    }

    return days;
}

async function main() {
    const today = new Date().toLocaleDateString('lv-LV', { weekday: 'long', timeZone: 'Europe/Riga' }).toLowerCase();

    const results = await Promise.all(rinks.map(async (rink) => {
        try {
            const days = await rink.load(rink.url);
            const todayData = days.find((d) => d.day === today);
            return { ...rink, sessions: todayData ? todayData.sessions : [] };
        } catch (err) {
            console.error(`${rink.name}: ${err.message}`);
            return { ...rink, sessions: null };
        }
    }));

    const channels = [telegram, whatsapp, api].filter((c) => c.isConfigured());
    if (!channels.length) {
        console.log('Nothing set up in .env, only printing:\n');
        console.log(whatsapp.formatMessage(results));
        return;
    }

    for (const channel of channels) {
        try {
            await channel.sendSchedule(results);
        } catch (err) {
            console.error(`${channel.name}: ${err.message}`);
            process.exitCode = 1;
        }
    }
}

if (require.main === module) {
    main();
}

module.exports = { isoWeek, dayName, isStickSession };
