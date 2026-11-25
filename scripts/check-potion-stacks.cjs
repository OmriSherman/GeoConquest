// Run: node scripts/check-potion-stacks.cjs <path-to-@electric-sql/pglite>
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(process.argv[2] || '@electric-sql/pglite');
(async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE SCHEMA auth; CREATE SCHEMA private;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-0000-0000-000000000001'::uuid $$;
    CREATE TABLE profiles(id uuid PRIMARY KEY, xp integer DEFAULT 0, gold_balance integer DEFAULT 0);
    INSERT INTO profiles(id) VALUES(auth.uid());
    CREATE TABLE user_potions(user_id uuid,kind text,duration integer,quantity integer,boost_percent integer,PRIMARY KEY(user_id,kind,duration));
    CREATE TABLE active_potions(user_id uuid,kind text,remaining integer,boost_percent integer,activated_at timestamptz,PRIMARY KEY(user_id,kind));
    CREATE TABLE quiz_results(user_id uuid,client_result_key text,quiz_type text CHECK(quiz_type IN ('flag')),potion_base_xp integer,xp_earned integer,gold_earned integer,potion_xp_bonus integer,potion_gold_bonus integer);
  `);
  await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations/20260919103154_potion_stacks_and_quiz_summary.sql'), 'utf8'));
  await db.exec(`
    CREATE TRIGGER potions BEFORE INSERT ON quiz_results FOR EACH ROW EXECUTE FUNCTION private.apply_quiz_potions();
    INSERT INTO user_potions VALUES(auth.uid(),'gold_potion',3,2,50),(auth.uid(),'gold_potion',10,1,200),(auth.uid(),'xp_potion',3,1,50),(auth.uid(),'xp_potion',10,1,200);
    SELECT private.activate_potion('gold_potion',3); SELECT private.activate_potion('gold_potion',3);
    SELECT private.activate_potion('gold_potion',10); SELECT private.activate_potion('xp_potion',3); SELECT private.activate_potion('xp_potion',10);
  `);
  const insert = key => `INSERT INTO quiz_results(user_id,client_result_key,quiz_type,potion_base_xp,xp_earned,gold_earned) VALUES(auth.uid(),'${key}','draw',100,100,100) RETURNING *`;
  const result = (await db.query(insert('first'))).rows[0];
  assert.equal(result.potion_gold_bonus,250);
  assert.equal(result.potion_xp_bonus,250);
  assert.equal(result.potions_used.length,4);
  assert.equal(result.potions_used.find(p=>p.kind==='gold_potion' && p.boost_percent===50).remaining,5);
  assert.equal(result.potions_used.find(p=>p.kind==='gold_potion' && p.boost_percent===200).remaining,9);
  assert.equal((await db.query(insert('first'))).rows.length,0);
  assert.equal((await db.query('SELECT gold_balance FROM profiles')).rows[0].gold_balance,250);
  await db.exec(`INSERT INTO quiz_results(user_id,client_result_key,quiz_type,potion_base_xp,xp_earned,gold_earned) VALUES(auth.uid(),'loss','gauntlet',0,0,-100)`);
  assert.equal((await db.query('SELECT gold_balance FROM profiles')).rows[0].gold_balance,250);
  await db.exec(`UPDATE active_potions SET remaining=49 WHERE kind='gold_potion' AND boost_percent=50;
    UPDATE user_potions SET quantity=1 WHERE kind='gold_potion' AND duration=3`);
  await assert.rejects(db.query("SELECT private.activate_potion('gold_potion',3)"), /50 quiz uses/);
  assert.equal((await db.query("SELECT quantity FROM user_potions WHERE kind='gold_potion' AND duration=3")).rows[0].quantity,1);
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE TABLE daily_chest_tiers(tier integer PRIMARY KEY,gold integer);
    INSERT INTO daily_chest_tiers SELECT n,0 FROM generate_series(1,6) n;`);
  await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations/20260919110416_chest_gold_and_regular_potion_shop.sql'), 'utf8'));
  await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations/20260919223319_scaled_potion_shop_prices.sql'), 'utf8'));
  assert.deepEqual((await db.query('SELECT gold FROM daily_chest_tiers ORDER BY tier')).rows.map(r=>r.gold),[250,400,500,600,800,1000]);
  await db.exec("UPDATE profiles SET xp=0,gold_balance=510; SELECT public.purchase_regular_potion('gold_potion')");
  assert.equal((await db.query('SELECT gold_balance FROM profiles')).rows[0].gold_balance,0);
  await assert.rejects(db.query("SELECT public.purchase_regular_potion('xp_potion')"), /Insufficient gold/);
  await assert.rejects(db.query("SELECT public.purchase_regular_potion('mythic')"), /Invalid potion/);
  await db.exec("UPDATE profiles SET xp=0,gold_balance=1020; SELECT public.purchase_regular_potion('xp_potion')");
  assert.equal((await db.query('SELECT gold_balance FROM profiles')).rows[0].gold_balance,0);
  await db.close();
  const ts = require('typescript');
  const vm = require('node:vm');
  const storage = new Map();
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../app/lib/potionPreview.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports: mod.exports, require: () => ({ default: {
    getItem: async key => storage.get(key) ?? null,
    setItem: async (key, value) => storage.set(key, value),
  } }) });
  const preview = mod.exports;
  const initial = await preview.loadPotionPreview('test');
  const regular = initial.bag.find(p=>p.kind==='gold_potion' && p.boost_percent===50);
  const mythic = initial.bag.find(p=>p.kind==='gold_potion' && p.boost_percent===200);
  await preview.activatePotionPreview('test',regular);
  await preview.activatePotionPreview('test',regular);
  await preview.activatePotionPreview('test',mythic);
  const used = await preview.consumePotionPreview('test','quiz1',100,100);
  assert.equal(used.reduce((sum,p)=>sum+p.bonus,0),250);
  assert.equal(used.find(p=>p.boost_percent===50).remaining,5);
  await preview.consumePotionPreview('test','quiz1',100,100);
  assert.equal((await preview.loadPotionPreview('test')).active.find(p=>p.boost_percent===50).remaining,5);
  assert.equal((await preview.loadPotionPreview('other-user')).active.length,0);
  console.log('PASS: migration, mixed strengths, stacked durations, gold/XP credit, replay safety, Draw/Gauntlet, penalties, capacity protection.');
  console.log('PASS: developer potion persistence, account isolation, mixed bonuses and retry safety.');
  console.log('PASS: chest gold amounts, potion prices, insufficient-funds and invalid-kind protection.');
})().catch(error => { console.error(error); process.exit(1); });
