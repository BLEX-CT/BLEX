#!/usr/bin/env node
// End-to-end agent test: imports real electronics products and verifies each step
'use strict';
require('dotenv').config();

const BASE = process.env.TEST_BASE_URL || 'https://blex-production.up.railway.app';
const EMAIL = 'testadmin@blex.ct';
const PASS  = 'BlexTest2026!';
const CJ_BASE_URL = 'https://developers.cjdropshipping.com/api2.0/v1';
const TARGET = Number(process.env.TARGET || 10);

let TOKEN = '';
let allIssues = [];

const ts = () => new Date().toLocaleTimeString();
const log  = (tag, msg) => console.log(`[${ts()}] ${String(tag).padEnd(10)} ${msg}`);
const ok   = (tag, msg) => console.log(`[${ts()}] ✓ ${String(tag).padEnd(8)} ${msg}`);
const fail = (tag, msg) => { console.log(`[${ts()}] ✗ ${String(tag).padEnd(8)} ${msg}`); allIssues.push(`${tag}: ${msg}`); };
const sep  = () => console.log('─'.repeat(65));

function extractCJImage(productImageSet, productImage) {
  if (Array.isArray(productImageSet) && productImageSet.length) return String(productImageSet[0]);
  if (typeof productImageSet === 'string' && productImageSet) {
    if (productImageSet.startsWith('[')) { try { const a = JSON.parse(productImageSet); if (a?.[0]) return String(a[0]); } catch {} }
    const u = productImageSet.split(';')[0]?.trim();
    if (u?.startsWith('http')) return u;
  }
  if (typeof productImage === 'string' && productImage) {
    if (productImage.startsWith('[')) { try { const a = JSON.parse(productImage); if (a?.[0]) return String(a[0]); } catch {} }
    if (productImage.startsWith('http')) return productImage;
  }
  return null;
}

function parseCJPrice(val) {
  if (!val && val !== 0) return 0;
  if (typeof val === 'number') return val;
  const m = String(val).match(/[\d.]+/);
  return m ? Number(m[0]) : 0;
}

async function api(method, path, body, timeoutMs = 120000) {
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

async function streamPost(path, body, onEvent, timeoutMs = 600000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
      body: JSON.stringify(body || {}),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      return { type: 'error', message: `HTTP ${r.status}: ${body.slice(0, 120)}` };
    }
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let lastEvent = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try { const ev = JSON.parse(line.slice(6)); lastEvent = ev; onEvent(ev); } catch {}
      }
    }
    return lastEvent;
  } catch (e) {
    clearTimeout(timer);
    return { type: 'error', message: e.message };
  }
}

// ── Phase 0: Direct API tests ─────────────────────────────────────────────────
async function testCJAPI() {
  sep();
  log('CJ-API', 'Testing CJ authentication…');
  const r = await fetch(CJ_BASE_URL+'/authentication/getAccessToken', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({email: process.env.CJ_EMAIL, password: process.env.CJ_API_KEY})
  });
  const d = await r.json();
  if (!d.result || !d.data?.accessToken) { fail('CJ-API', `Auth failed: ${JSON.stringify(d).slice(0,100)}`); return null; }
  const token = d.data.accessToken;
  ok('CJ-AUTH', `Got CJ token`);

  // Search
  const sr = await fetch(`${CJ_BASE_URL}/product/list?productNameEn=earbuds&pageNum=1&pageSize=3`, {
    headers: { 'CJ-Access-Token': token }
  });
  const sd = await sr.json();
  const products = sd.data?.list || [];
  log('CJ-SRCH', `keyword=earbuds → total: ${sd.data?.total || 0}, got ${products.length}`);
  if (!products.length) { fail('CJ-SRCH', 'No products from earbuds search'); return token; }

  const p = products[0];
  const listImg = extractCJImage(p.productImageSet, p.productImage);
  const listPrice = parseCJPrice(p.sellPrice);
  console.log(`  LIST: pid=${p.pid} | name="${(p.productNameEn||p.productName||'').slice(0,45)}" | cost=${listPrice} | img=${listImg ? 'YES' : 'NO'}`);
  if (!listImg) fail('CJ-LIST', 'No image in list response');
  if (!listPrice) fail('CJ-LIST', 'No price in list response');

  // Detail
  const dr = await fetch(`${CJ_BASE_URL}/product/query?pid=${p.pid}`, { headers: { 'CJ-Access-Token': token } });
  const dd = await dr.json();
  if (!dd.result || !dd.data) { fail('CJ-DETL', 'Detail endpoint failed'); return token; }
  const det = dd.data;
  const detImg = extractCJImage(det.productImageSet, det.productImage);
  const detCost = parseCJPrice(det.sellPrice) || parseCJPrice(det.variants?.[0]?.variantSellPrice) || 0;
  const storePrice = +(detCost * 2.5).toFixed(2);
  if (!detImg) fail('CJ-DETL', 'No image in detail response');
  if (!detCost) fail('CJ-DETL', 'No cost price in detail response');
  if (detImg && detCost) ok('CJ-DETL', `cost=${detCost} → store=${storePrice} | img=${detImg.slice(0,50)}…`);
  return token;
}

async function testClaudeAPI() {
  sep();
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { fail('CLAUDE', 'ANTHROPIC_API_KEY not set'); return; }
  log('CLAUDE', 'Testing Claude API + tool_use…');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},
    body: JSON.stringify({
      model:'claude-haiku-4-5-20251001', max_tokens:200,
      tools:[{name:'ping',description:'Ping tool',input_schema:{type:'object',properties:{msg:{type:'string'}},required:['msg']}}],
      messages:[{role:'user',content:'Call ping with msg="pong"'}]
    })
  });
  const d = await r.json();
  if (d.stop_reason === 'tool_use') ok('CLAUDE', `tool_use OK | model=${d.model}`);
  else fail('CLAUDE', `Expected tool_use, got ${d.stop_reason}`);
}

async function testRemoveBG() {
  sep();
  const key = process.env.REMOVEBG_API_KEY;
  if (!key) { log('REMOVEBG', 'SKIP — not configured'); return; }
  log('REMOVEBG', 'Testing Remove.bg…');
  const r = await fetch('https://api.remove.bg/v1.0/removebg', {
    method:'POST',
    headers:{'X-Api-Key':key,'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({image_url:'https://cf.cjdropshipping.com/db53a4e9-2ac5-4498-9180-a3b8403b3d1e.jpg',size:'preview',bg_color:'ffffff'})
  });
  if (r.ok) { const buf = await r.arrayBuffer(); ok('REMOVEBG', `Returned ${buf.byteLength} bytes`); }
  else if (r.status === 402) ok('REMOVEBG', 'API key valid (402=no credits)');
  else { const e = await r.json().catch(()=>({})); fail('REMOVEBG', e.errors?.[0]?.title || `HTTP ${r.status}`); }
}

// ── Phase 1: Auth ─────────────────────────────────────────────────────────────
async function auth() {
  sep();
  const r = await api('POST', '/auth/login', { email: EMAIL, password: PASS });
  if (r.ok && r.data.token) { TOKEN = r.data.token; ok('AUTH', `Logged in`); return true; }
  const reg = await api('POST', '/auth/register', { name:'Test Admin', email: EMAIL, password: PASS, role:'admin' });
  if (reg.ok && reg.data.token) { TOKEN = reg.data.token; ok('AUTH', 'Registered + logged in'); return true; }
  fail('AUTH', JSON.stringify(r.data)); return false;
}

// ── Phase 2: Trends agent (streaming for target > 5) ──────────────────────────
async function runTrendsAgent(prodsBefore) {
  sep();
  log('TRENDS', `Running trends_agent-stream (category=electronics, target=${TARGET})…`);
  log('TRENDS', 'Using SSE streaming to avoid HTTP timeout. Progress:');

  const t0 = Date.now();
  let importCount = 0;

  const lastEvent = await streamPost('/ai/trends-agent-stream', { category:'electronics', target: TARGET }, (ev) => {
    if (ev.type === 'progress') {
      process.stdout.write(`\r  ${ev.message.slice(0,60).padEnd(62)}`);
      if (ev.imported) importCount = ev.imported;
    } else if (ev.type === 'complete') {
      console.log(`\r  Complete: ${ev.imported} imported, ${ev.skipped||0} skipped, ${ev.dupes||0} dupes`);
    } else if (ev.type === 'error') {
      console.log(`\r  ERROR: ${ev.message}`);
    }
  });

  const elapsed = ((Date.now()-t0)/1000).toFixed(1);
  console.log('');

  if (!lastEvent || lastEvent.type === 'error') {
    fail('TRENDS', `Stream failed: ${lastEvent?.message || 'no response'}`);
    return [];
  }

  const td = lastEvent;
  log('TRENDS', `Done in ${elapsed}s — imported: ${td.imported}, skipped: ${td.skipped||0}, dupes: ${td.dupes||0}, iterations: ${td.iterations}`);
  if (td.result) log('TRENDS', `Summary: ${String(td.result).slice(0,200)}`);

  // Print search attempts
  const searches = (td.tool_log||[]).filter(l=>l.tool==='search_cj_products');
  const imports  = (td.tool_log||[]).filter(l=>l.tool==='import_product');
  console.log(`\n  Searches: ${searches.length} | Imports: ${imports.length}`);
  searches.forEach((l,i) => console.log(`  [s${i+1}] "${l.input?.keyword}" → ${l.result?.total||0} results`));
  console.log('');
  imports.forEach((l,i) => {
    const r = l.result;
    const s = r?.success ? `✓ id=${r.product_id} "${(r.name||'').slice(0,40)}" cost=${r.cost_price} store=${r.price} cat=${r.category}`
      : r?.skipped ? `⊘ SKIP ${r.reason?.slice(0,50)}`
      : r?.error === 'already_exists' ? `↩ DUPE`
      : `✗ ERR ${(r?.error||'').slice(0,50)}`;
    console.log(`  [i${i+1}] ${s}`);
  });

  if (!td.imported) { fail('TRENDS', 'Zero products imported'); return []; }
  ok('TRENDS', `${td.imported} products successfully imported`);

  // Get IDs of new products
  const afterRes = await api('GET', '/products');
  const allProds = Array.isArray(afterRes.data) ? afterRes.data : [];
  return allProds.filter(p => !prodsBefore.includes(p.id));
}

// ── Phase 3: Verify ───────────────────────────────────────────────────────────
function verifyProducts(newProds) {
  sep();
  log('VERIFY', `Verifying ${newProds.length} imported products…`);
  let pass = 0;
  for (const p of newProds) {
    const errs = [];
    if (!p.image) errs.push('no image');
    if (Number(p.price) <= 0) errs.push('no price');
    if (!p.category) errs.push('no category');
    if (!p.cost_price || Number(p.cost_price) <= 0) {
      errs.push('no cost_price');
    } else {
      const expected = +(Number(p.cost_price)*2.5).toFixed(2);
      if (Math.abs(Number(p.price)-expected)/expected > 0.02) errs.push(`price ${p.price}≠2.5×${p.cost_price}=${expected}`);
    }
    if (errs.length) { fail('VERIFY', `#${p.id} "${(p.name||'').slice(0,40)}" → ${errs.join(', ')}`); }
    else { ok('VERIFY', `#${p.id} "${(p.name||'').slice(0,40)}" OK`); pass++; }
  }
  const dupes = newProds.map(p=>p.name?.toLowerCase()).filter((v,i,a)=>a.indexOf(v)!==i);
  if (dupes.length) fail('VERIFY', `Duplicate names: ${dupes.join(', ')}`);
  else ok('VERIFY', 'No duplicates in batch');
  return pass;
}

// ── Phase 4: Content agent ────────────────────────────────────────────────────
async function runContentAgent() {
  sep();
  log('CONTENT', 'Running content_agent…');
  const t0 = Date.now();
  const r = await api('POST', '/ai/content-agent', {}, 600000);
  const elapsed = ((Date.now()-t0)/1000).toFixed(1);
  if (!r.ok) { fail('CONTENT', JSON.stringify(r.data).slice(0,100)); return 0; }
  const descriptions = r.data.descriptions || (r.data.tool_log||[]).filter(l=>l.tool==='set_product_description'&&l.result?.success).length;
  ok('CONTENT', `${elapsed}s — ${descriptions} descriptions saved, ${r.data.iterations} iterations`);
  if (r.data.result) log('CONTENT', String(r.data.result).slice(0,150));
  return descriptions;
}

// ── Phase 5: Image agent ──────────────────────────────────────────────────────
async function runImageAgent() {
  sep();
  log('IMAGE', 'Running image_agent…');
  const t0 = Date.now();
  const r = await api('POST', '/ai/image-agent', {}, 300000);
  const elapsed = ((Date.now()-t0)/1000).toFixed(1);
  if (!r.ok) {
    if (r.data?.error?.includes('REMOVEBG')) { log('IMAGE', 'SKIP — Remove.bg not configured on server'); return 0; }
    fail('IMAGE', JSON.stringify(r.data).slice(0,100)); return 0;
  }
  const images = r.data.images || (r.data.tool_log||[]).filter(l=>l.tool==='process_product_image'&&l.result?.success).length;
  ok('IMAGE', `${elapsed}s — ${images} images processed, ${r.data.iterations} iterations`);
  if (r.data.result) log('IMAGE', String(r.data.result).slice(0,150));
  return images;
}

// ── Phase 6: Pricing agent ────────────────────────────────────────────────────
async function runPricingAgent() {
  sep();
  log('PRICING', 'Running pricing_agent…');
  const t0 = Date.now();
  const r = await api('POST', '/ai/pricing-agent', {}, 600000);
  const elapsed = ((Date.now()-t0)/1000).toFixed(1);
  if (!r.ok) { fail('PRICING', JSON.stringify(r.data).slice(0,100)); return 0; }
  const changes = (r.data.tool_log||[]).filter(l=>l.tool==='update_product_price'&&l.result?.success);
  ok('PRICING', `${elapsed}s — ${changes.length} price changes, ${r.data.iterations} iterations`);
  changes.slice(0,6).forEach(l => console.log(`  ${(l.result.name||'').slice(0,35)}: ${l.input?.new_price} SAR`));
  return changes.length;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(` BLEX Autonomous Agent — End-to-End Test  (target: ${TARGET} products)`);
  console.log(` ${new Date().toISOString()} → ${BASE}`);
  console.log('═══════════════════════════════════════════════════════════════');

  await testCJAPI();
  await testClaudeAPI();
  await testRemoveBG();

  if (!await auth()) { printSummary(0,0,0,0,0,0); return; }

  const beforeRes = await api('GET', '/products');
  const prodsBefore = Array.isArray(beforeRes.data) ? beforeRes.data.map(p=>p.id) : [];
  log('BASELINE', `${prodsBefore.length} products in store before test`);

  const newProds  = await runTrendsAgent(prodsBefore);
  const descs     = await runContentAgent();
  const imgs      = await runImageAgent();
  const prices    = await runPricingAgent();

  // Final re-read: verify ALL newly imported products regardless of whether stream errored
  sep();
  const finalRes = await api('GET', '/products');
  const allProds = Array.isArray(finalRes.data) ? finalRes.data : [];
  const finalNew = allProds.filter(p => !prodsBefore.includes(p.id));

  const verified = finalNew.length ? verifyProducts(finalNew) : 0;

  let imgOk=0, descOk=0, cleanBgOk=0;
  for (const p of finalNew) {
    if (p.image) imgOk++;
    if (p.description && p.description.length>20 && !p.description.includes('auto imported')) descOk++;
    if (p.image_gallery?.cleaned) cleanBgOk++;
  }

  printSummary(finalNew.length, imgOk, descOk, cleanBgOk, prices, verified);
}

function printSummary(total, imgs, descs, cleanBg, prices, verified) {
  sep();
  console.log('\n FINAL REPORT');
  console.log(`  Products imported:      ${total} (target: ${TARGET})`);
  console.log(`  Quality checks passed:  ${verified}/${total}`);
  console.log(`  With images:            ${imgs}/${total}`);
  console.log(`  With descriptions:      ${descs}/${total}`);
  console.log(`  With clean background:  ${cleanBg}/${total}`);
  console.log(`  Price adjustments made: ${prices}`);
  if (allIssues.length) {
    console.log(`\n Issues (${allIssues.length}):`);
    allIssues.forEach((e,i) => console.log(`  [${i+1}] ${e}`));
  } else {
    console.log('\n  All checks passed ✓');
  }
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
