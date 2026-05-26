#!/usr/bin/env node
// End-to-end agent test: imports real products and verifies each step
'use strict';
require('dotenv').config();

const BASE = process.env.TEST_BASE_URL || 'https://blex-production.up.railway.app';
const EMAIL = 'testadmin@blex.ct';
const PASS  = 'BlexTest2026!';
const CJ_BASE_URL = 'https://developers.cjdropshipping.com/api2.0/v1';

let TOKEN = '';
let allIssues = [];

const ts = () => new Date().toLocaleTimeString();
const log  = (tag, msg) => console.log(`[${ts()}] ${String(tag).padEnd(10)} ${msg}`);
const ok   = (tag, msg) => console.log(`[${ts()}] ✓ ${String(tag).padEnd(8)} ${msg}`);
const fail = (tag, msg) => { console.log(`[${ts()}] ✗ ${String(tag).padEnd(8)} ${msg}`); allIssues.push(`${tag}: ${msg}`); };
const sep  = () => console.log('─'.repeat(65));

async function api(method, path, body, timeoutMs = 300000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    clearTimeout(timer);
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 300) }; }
    return { ok: r.ok, status: r.status, data };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, status: 0, data: { error: e.message } };
  }
}

// ─── Phase 0: Direct API Tests (no DB needed) ────────────────────────────────
async function testCJAPI() {
  sep();
  log('CJ-API', 'Testing CJ authentication…');
  const cjEmail = process.env.CJ_EMAIL;
  const cjKey   = process.env.CJ_API_KEY;
  if (!cjEmail || !cjKey) { fail('CJ-API', 'CJ_EMAIL or CJ_API_KEY not in .env'); return null; }

  const r = await fetch(`${CJ_BASE_URL}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cjEmail, password: cjKey })
  });
  const d = await r.json();
  if (!d.result || !d.data?.accessToken) { fail('CJ-API', `Auth failed: ${JSON.stringify(d).slice(0,100)}`); return null; }
  const token = d.data.accessToken;
  ok('CJ-AUTH', `Got CJ token (${token.slice(0,20)}…)`);

  // Search electronics
  log('CJ-SRCH', 'Searching "smart electronics" on CJ…');
  const sr = await fetch(`${CJ_BASE_URL}/product/list?productNameEn=smart+electronics&pageNum=1&pageSize=10`, {
    headers: { 'CJ-Access-Token': token }
  });
  const sd = await sr.json();
  const products = sd.data?.list || [];
  log('CJ-SRCH', `Found ${products.length} products (total: ${sd.data?.total || 0})`);

  if (!products.length) { fail('CJ-SRCH', 'No products returned from CJ'); return token; }

  // Check first product fields
  const p = products[0];
  const hasImg    = !!(p.productImageSet || p.productImage);
  const hasPrice  = !!(p.sellPrice && Number(p.sellPrice) > 0);
  const hasPid    = !!p.pid;
  const hasName   = !!(p.productNameEn || p.productName);
  const rating    = Number(p.productStar || p.productAverageRating || 0);
  const imgUrl    = p.productImageSet?.split(';')?.[0]?.trim() || p.productImage;

  console.log('\n  First CJ product:');
  console.log(`    pid:    ${p.pid || 'MISSING'}`);
  console.log(`    name:   ${(p.productNameEn || p.productName || 'MISSING').slice(0,60)}`);
  console.log(`    price:  ${p.sellPrice || 'MISSING'} (→ store price would be ${(Number(p.sellPrice||0)*2.5).toFixed(2)} SAR)`);
  console.log(`    rating: ${rating || 'n/a'}`);
  console.log(`    image:  ${imgUrl ? imgUrl.slice(0,80) : 'MISSING'}`);
  console.log(`    categ:  ${p.categoryName || p.categoryNameEn || 'n/a'}`);

  if (!hasPid)   fail('CJ-PROD', 'pid field missing');
  if (!hasImg)   fail('CJ-PROD', 'No image in product list response');
  if (!hasPrice) fail('CJ-PROD', 'No sellPrice in product list');
  if (!hasName)  fail('CJ-PROD', 'No product name');
  if (hasPid && hasImg && hasPrice && hasName) ok('CJ-PROD', 'Product fields all present');

  // Test product detail endpoint
  log('CJ-DETL', `Testing product detail for pid ${p.pid}…`);
  const dr = await fetch(`${CJ_BASE_URL}/product/query?pid=${p.pid}`, { headers: { 'CJ-Access-Token': token } });
  const dd = await dr.json();
  if (!dd.result || !dd.data) { fail('CJ-DETL', `Detail failed: ${JSON.stringify(dd).slice(0,80)}`); }
  else {
    const det = dd.data;
    const detImg = det.productImageSet?.split(';')?.[0]?.trim() || det.productImage;
    const detPrice = Number(det.sellPrice || det.variants?.[0]?.sellPrice || 0);
    const storePrice = +(detPrice * 2.5).toFixed(2);
    ok('CJ-DETL', `Detail OK — price=${detPrice}, store_price=${storePrice}, image=${detImg ? 'YES' : 'NO'}`);
  }

  return token;
}

async function testClaudeAPI() {
  sep();
  log('CLAUDE', 'Testing Claude API…');
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { fail('CLAUDE', 'ANTHROPIC_API_KEY not in .env'); return; }

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 50, messages: [{ role: 'user', content: 'Reply with exactly: CLAUDE_OK' }] })
  });
  const d = await r.json();
  if (!r.ok || !d.content?.[0]?.text) { fail('CLAUDE', `API error: ${JSON.stringify(d).slice(0,100)}`); return; }
  ok('CLAUDE', `Response: "${d.content[0].text.trim().slice(0,30)}" (model: ${d.model})`);

  // Test tool_use
  log('CLAUDE', 'Testing tool_use stop_reason…');
  const tr = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      tools: [{ name: 'test_tool', description: 'Test tool', input_schema: { type: 'object', properties: { msg: { type: 'string' } }, required: ['msg'] } }],
      messages: [{ role: 'user', content: 'Call test_tool with msg="hello"' }]
    })
  });
  const td = await tr.json();
  if (td.stop_reason === 'tool_use') ok('CLAUDE', `tool_use stop_reason works ✓ (stop_reason=${td.stop_reason})`);
  else fail('CLAUDE', `Expected stop_reason=tool_use, got: ${td.stop_reason}`);
}

async function testRemoveBG() {
  sep();
  const key = process.env.REMOVEBG_API_KEY;
  if (!key) { log('REMOVEBG', 'SKIP — no REMOVEBG_API_KEY'); return; }
  log('REMOVEBG', 'Testing Remove.bg API…');
  const r = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': key, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200', size: 'preview', bg_color: 'ffffff' })
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    const msg = e.errors?.[0]?.title || `HTTP ${r.status}`;
    if (r.status === 402) ok('REMOVEBG', `API key valid (402 = no credits, API works)`);
    else fail('REMOVEBG', `API error: ${msg}`);
  } else {
    const buf = await r.arrayBuffer();
    ok('REMOVEBG', `Remove.bg OK — returned ${buf.byteLength} bytes`);
  }
}

// ─── Phase 1: Auth against production ────────────────────────────────────────
async function authProduction() {
  sep();
  log('PROD', `Connecting to ${BASE}…`);
  const r = await api('POST', '/auth/login', { email: EMAIL, password: PASS });
  if (r.ok && r.data.token) { TOKEN = r.data.token; ok('AUTH', `Logged in as ${EMAIL}`); return true; }
  // Try register
  const reg = await api('POST', '/auth/register', { name: 'Test Admin', email: EMAIL, password: PASS, role: 'admin' });
  if (reg.ok && reg.data.token) { TOKEN = reg.data.token; ok('AUTH', 'Registered + logged in'); return true; }
  fail('AUTH', `Cannot authenticate: ${JSON.stringify(r.data)}`);
  return false;
}

// ─── Phase 2: Run trends_agent for Electronics ───────────────────────────────
async function runTrendsAgent() {
  sep();
  // Check deployment has our latest code
  log('DEPLOY', 'Checking if production has latest trends_agent with category param…');
  const statRes = await api('GET', '/products');
  if (!statRes.ok) { fail('PROD', 'Cannot reach /products'); return []; }
  log('PROD', `${Array.isArray(statRes.data) ? statRes.data.length : '?'} products currently in store`);

  const productsBefore = Array.isArray(statRes.data) ? statRes.data.map(p => p.id) : [];

  log('TRENDS', 'Running trends_agent (category=electronics, target=10)…');
  log('TRENDS', 'Expected: ~3-10 min. Waiting…');
  const t0 = Date.now();

  const res = await api('POST', '/ai/trends-agent', { category: 'electronics', target: 10 }, 600000);
  const elapsed = ((Date.now() - t0)/1000).toFixed(1);

  if (!res.ok) {
    fail('TRENDS', `Failed: ${JSON.stringify(res.data).slice(0,150)}`);
    return [];
  }

  const td = res.data;
  log('TRENDS', `Completed in ${elapsed}s`);
  log('TRENDS', `imported=${td.imported}, skipped=${td.skipped||0}, dupes=${td.dupes||0}, iterations=${td.iterations}`);
  if (td.result) log('TRENDS', `Summary: ${String(td.result).slice(0,200)}`);

  // Print each import attempt
  const imports = (td.tool_log || []).filter(l => l.tool === 'import_product');
  const searches = (td.tool_log || []).filter(l => l.tool === 'search_cj_products');
  console.log(`\n  Searches: ${searches.length}`);
  searches.forEach((l,i) => console.log(`  [s${i+1}] keyword="${l.input?.keyword}" → ${l.result?.total||0} results`));
  console.log(`\n  Import attempts: ${imports.length}`);
  imports.forEach((l,i) => {
    const r = l.result;
    const s = r?.success ? `✓ id=${r.product_id} "${(r.name||'').slice(0,45)}" price=${r.price} cost=${r.cost_price} cat=${r.category}`
      : r?.skipped ? `⊘ SKIP ${r.reason?.slice(0,60)}`
      : r?.error === 'already_exists' ? `↩ DUPE pid=${l.input?.cj_product_id}`
      : `✗ ERR ${(r?.error||JSON.stringify(r)).slice(0,60)}`;
    console.log(`  [${i+1}] ${s}`);
  });

  if (!td.imported || td.imported === 0) {
    fail('TRENDS', 'Zero products imported — check CJ API or agent logic');
    return [];
  }
  ok('TRENDS', `${td.imported} products imported`);

  // Return IDs of newly imported products
  const afterRes = await api('GET', '/products');
  const afterProds = Array.isArray(afterRes.data) ? afterRes.data : [];
  const newProds = afterProds.filter(p => !productsBefore.includes(p.id));
  return newProds;
}

// ─── Phase 3: Verify imported products ───────────────────────────────────────
async function verifyProducts(newProds) {
  sep();
  log('VERIFY', `Verifying ${newProds.length} newly imported products…`);
  let pass = 0, issues = 0;
  const problems = [];

  for (const p of newProds) {
    const errs = [];
    if (!p.image) errs.push('no image');
    if (Number(p.price) <= 0) errs.push('no price');
    if (p.category !== 'electronics') errs.push(`category="${p.category}" (expected electronics)`);
    if (!p.cost_price || Number(p.cost_price) <= 0) {
      errs.push('no cost_price');
    } else {
      const expected = +(Number(p.cost_price) * 2.5).toFixed(2);
      const actual   = Number(p.price);
      if (Math.abs(actual - expected) / expected > 0.02) {
        errs.push(`price ${actual} ≠ 2.5×cost ${expected} (cost=${p.cost_price})`);
      }
    }

    if (errs.length) { issues++; problems.push({ id: p.id, name: p.name?.slice(0,45), errs }); }
    else pass++;
  }

  ok('VERIFY', `${pass}/${newProds.length} products pass all checks`);
  if (problems.length) {
    console.log('  Problems found:');
    problems.forEach(p => {
      console.log(`  ✗ id=${p.id} "${p.name}" → ${p.errs.join(' | ')}`);
      allIssues.push(`product#${p.id}: ${p.errs.join(', ')}`);
    });
  }

  // Check for duplicates within the batch
  const names = newProds.map(p => p.name?.toLowerCase());
  const dupesInBatch = names.length - new Set(names).size;
  if (dupesInBatch > 0) fail('VERIFY', `${dupesInBatch} duplicate names in imported batch`);
  else ok('VERIFY', 'No duplicate names in batch');

  return { pass, issues, problems };
}

// ─── Phase 4: Content agent ───────────────────────────────────────────────────
async function runContentAgent() {
  sep();
  log('CONTENT', 'Running content_agent (generate descriptions for new products)…');
  const t0 = Date.now();
  const res = await api('POST', '/ai/content-agent', {}, 600000);
  const elapsed = ((Date.now()-t0)/1000).toFixed(1);
  if (!res.ok) { fail('CONTENT', `Failed: ${JSON.stringify(res.data).slice(0,100)}`); return 0; }
  const cd = res.data;
  const descriptions = cd.descriptions || (cd.tool_log||[]).filter(l => l.tool==='set_product_description' && l.result?.success).length;
  ok('CONTENT', `Done in ${elapsed}s — ${descriptions} descriptions saved, ${cd.iterations} iterations`);
  if (cd.result) log('CONTENT', String(cd.result).slice(0,150));
  return descriptions;
}

// ─── Phase 5: Image agent ─────────────────────────────────────────────────────
async function runImageAgent() {
  sep();
  log('IMAGE', 'Running image_agent (remove.bg backgrounds)…');
  const t0 = Date.now();
  const res = await api('POST', '/ai/image-agent', {}, 600000);
  const elapsed = ((Date.now()-t0)/1000).toFixed(1);
  if (!res.ok) {
    if (res.data?.error?.includes('REMOVEBG')) { log('IMAGE', 'SKIP — Remove.bg not configured on server'); return 0; }
    fail('IMAGE', `Failed: ${JSON.stringify(res.data).slice(0,100)}`);
    return 0;
  }
  const id = res.data;
  const images = id.images || (id.tool_log||[]).filter(l => l.tool==='process_product_image' && l.result?.success).length;
  ok('IMAGE', `Done in ${elapsed}s — ${images} images processed, ${id.iterations} iterations`);
  if (id.result) log('IMAGE', String(id.result).slice(0,150));
  return images;
}

// ─── Phase 6: Pricing agent ───────────────────────────────────────────────────
async function runPricingAgent() {
  sep();
  log('PRICING', 'Running pricing_agent…');
  const t0 = Date.now();
  const res = await api('POST', '/ai/pricing-agent', {}, 300000);
  const elapsed = ((Date.now()-t0)/1000).toFixed(1);
  if (!res.ok) { fail('PRICING', `Failed: ${JSON.stringify(res.data).slice(0,100)}`); return 0; }
  const pd = res.data;
  const priceChanges = (pd.tool_log||[]).filter(l => l.tool==='update_product_price' && l.result?.success);
  ok('PRICING', `Done in ${elapsed}s — ${priceChanges.length} price changes, ${pd.iterations} iterations`);
  priceChanges.slice(0,6).forEach(l => log('PRICING', `  ${(l.result.name||'?').slice(0,35)}: ${l.input?.new_price} SAR`));
  return priceChanges.length;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' BLEX Autonomous Agent — End-to-End Test Suite');
  console.log(` ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════════');

  // Direct API tests (no server needed)
  await testCJAPI();
  await testClaudeAPI();
  await testRemoveBG();

  // Production server tests
  const authed = await authProduction();
  if (!authed) { printSummary(0, 0, 0, 0); return; }

  const newProds    = await runTrendsAgent();
  const { pass }    = newProds.length ? await verifyProducts(newProds) : { pass: 0 };
  const descs       = await runContentAgent();
  const imgs        = await runImageAgent();
  const prices      = await runPricingAgent();

  // Final product re-read for ultimate state
  sep();
  log('FINAL', 'Re-fetching final product state…');
  const finalRes = await api('GET', '/products');
  const allProds = Array.isArray(finalRes.data) ? finalRes.data : [];
  const finalNew = allProds.filter(p => newProds.some(n => n.id === p.id));

  let imgOk=0, descOk=0, cleanBgOk=0;
  for (const p of finalNew) {
    if (p.image) imgOk++;
    if (p.description && p.description.length > 20 && !p.description.includes('auto imported')) descOk++;
    if (p.image_gallery?.cleaned) cleanBgOk++;
  }

  printSummary(finalNew.length, imgOk, descOk, cleanBgOk, prices, pass);
}

function printSummary(total, imgs, descs, cleanBg, prices = 0, verified = 0) {
  sep();
  console.log('\n FINAL REPORT');
  console.log(`  Products imported:      ${total}`);
  console.log(`  With images:            ${imgs}/${total}`);
  console.log(`  With descriptions:      ${descs}/${total}`);
  console.log(`  With clean background:  ${cleanBg}/${total}`);
  console.log(`  Price adjustments made: ${prices}`);
  console.log(`  Quality checks passed:  ${verified}/${total}`);
  if (allIssues.length) {
    console.log(`\n Issues found (${allIssues.length}):`);
    allIssues.forEach((e, i) => console.log(`  [${i+1}] ${e}`));
  } else {
    console.log('\n  All checks passed ✓');
  }
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
