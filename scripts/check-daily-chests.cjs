const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = path.resolve(__dirname, '../app/lib/dailyChest.ts');
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(source, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: mod.exports, require: name => {
  const file = path.resolve(path.dirname(source), name);
  assert.ok(fs.existsSync(file), `Missing asset: ${name}`);
  return file;
}});
const { CHEST_TIERS: tiers, CHEST_AVATARS: avatars } = mod.exports;
const migration = fs.readFileSync(path.resolve(__dirname, '../supabase/migrations/20260908133105_daily_chests_and_potions.sql'), 'utf8');
const goldMigration = fs.readFileSync(path.resolve(__dirname, '../supabase/migrations/20260919110416_chest_gold_and_regular_potion_shop.sql'), 'utf8');
assert.equal(tiers.length, 6);
tiers.forEach((tier, i) => {
  assert.equal(tier.odds.reduce((a, b) => a + b, 0), 100);
  assert.ok(tier.odds.every(n => n >= 0 && n <= 100));
  assert.ok(migration.includes(`,${tier.tickets},${tier.duration},ARRAY[${tier.odds.join(',')}])`), `SQL/catalog mismatch: ${tier.name}`);
  assert.ok(goldMigration.includes(`WHEN ${i+1} THEN ${tier.gold}`), `SQL/gold mismatch: ${tier.name}`);
});
assert.equal(new Set(avatars.map(a => a.id)).size, 10);
avatars.forEach(a => {
  assert.ok(a.tier >= 3 && a.tier <= 6);
  assert.ok(migration.includes(`('${a.id}',${a.tier})`), `SQL/avatar mismatch: ${a.id}`);
});
console.log('PASS: all chest assets, 6 probability totals, SQL/catalog parity, and 10 avatar mappings.');
