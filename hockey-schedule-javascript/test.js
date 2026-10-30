const assert = require('node:assert');
const { isoWeek, dayName, isStickSession } = require('./app');

assert.deepStrictEqual(isoWeek(new Date(2026, 9, 13)), { year: 2026, week: 42 });
assert.deepStrictEqual(isoWeek(new Date(2025, 11, 29)), { year: 2026, week: 1 });
assert.deepStrictEqual(isoWeek(new Date(2027, 0, 1)), { year: 2026, week: 53 });

assert.strictEqual(dayName('Otrdiena, 13.10.2026'), 'otrdiena');
assert.strictEqual(dayName('pirmdiena, 12. oktobris'), 'pirmdiena');

assert.ok(isStickSession('Publiskā ar nūjām'));
assert.ok(!isStickSession('PUBLISKĀ SLIDOŠANA'));

console.log('ok');
