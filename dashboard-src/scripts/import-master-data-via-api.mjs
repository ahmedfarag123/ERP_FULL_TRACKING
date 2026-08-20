import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const DEST = import.meta.dirname ? join(import.meta.dirname, '..') : '.';
const PAT = process.env.SUPABASE_PAT;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
if (!PAT || !PROJECT_REF) {
  console.error('Missing SUPABASE_PAT or SUPABASE_PROJECT_REF');
  process.exit(1);
}

const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const AUTH = { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' };
const CSV_BASE = join(DEST, 'master-data/07_GENERATED_DATA/02_central_master_data/01_entities');
const SCHEMA = 'master_data';

const TABLES = [
  { name: 'md_sections', csv: '01_SECTIONS.csv', pk: 'section_id' },
  { name: 'md_categories', csv: '02_CATEGORIES.csv', pk: 'category_id' },
  { name: 'md_brands', csv: '03_BRANDS.csv', pk: 'brand_id' },
  { name: 'md_suppliers', csv: '04_SUPPLIERS.csv', pk: 'supplier_id' },
  { name: 'md_products', csv: '05_PRODUCTS.csv', pk: 'product_seq_id' },
  { name: 'md_customers', csv: '06_CUSTOMERS.csv', pk: 'customer_id' },
  { name: 'md_orders', csv: '07_ORDERS.csv', pk: 'order_seq_id' },
  { name: 'md_complaints', csv: '08_COMPLAINTS.csv', pk: 'complaint_seq_id' },
  { name: 'md_product_suppliers', csv: '09_PRODUCT_SUPPLIERS.csv', pk: 'ps_seq_id' },
];

function parseCSVLine(line) {
  const result = [];
  let current = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^\uFEFF/, '').trim());
  const rows = lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ''; });
    return row;
  }).filter(r => Object.values(r).some(v => v));
  return { headers, rows };
}

function escapeSQL(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return Number.isFinite(val) ? val.toString() : 'NULL';
  const s = String(val).replace(/'/g, "''");
  return `'${s}'`;
}

function cleanValue(val) {
  if (!val || val === '' || val === 'nan' || val === 'NaN' || val === 'null' || val === 'NULL') return null;
  const cleaned = String(val).replace(/,/g, '');
  if (/^-?\d+$/.test(cleaned)) return parseInt(cleaned, 10);
  if (/^-?\d+\.?\d*$/.test(cleaned)) return parseFloat(cleaned);
  if (val === 'true' || val === 'false' || val === 't' || val === 'f') return val === 'true' || val === 't';
  return val;
}

async function query(sql) {
  const res = await fetch(API, { method: 'POST', headers: AUTH, body: JSON.stringify({ query: sql }) });
  if (res.status >= 400) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function importTable(td) {
  const csvPath = join(CSV_BASE, td.csv);
  if (!existsSync(csvPath)) {
    console.log(`  ⏭️  ${td.csv} not found`); return;
  }

  const { headers, rows } = parseCSV(csvPath);
  if (rows.length === 0) { console.log(`  ⏭️  ${td.csv}: empty`); return; }

  console.log(`  📄 ${td.csv}: ${rows.length} rows`);

  const cols = Object.keys(rows[0]);
  const colList = cols.map(c => `"${c}"`).join(', ');

  const BATCH = 1000;
  let imported = 0, errors = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    let sql;
    try {
      const values = batch.map(row => {
        const vals = cols.map(c => escapeSQL(cleanValue(row[c])));
        return `(${vals.join(',')})`;
      }).join(',');
      sql = `INSERT INTO ${SCHEMA}.${td.name} (${colList}) VALUES ${values} ON CONFLICT (${td.pk}) DO NOTHING;`;
      await query(sql);
      imported += batch.length;
    } catch (e) {
      console.log(`  ❌ Batch ${Math.floor(i / BATCH) + 1} (${batch.length} rows) failed: ${e.message.slice(0, 150)}`);
      errors++;
      if (errors > 3) { console.log('  ⛔ Too many errors, aborting'); return; }
    }
    process.stdout.write(`  📦 ${imported}/${rows.length} rows\r`);
  }

  console.log(`  ✅ ${imported} rows${errors ? ` (${errors} errors)` : ''}`);
}

async function main() {
  console.log('🔌 Master Data Importer (Management API - Fast)\n');
  for (const table of TABLES) {
    console.log(`\n📋 ${table.name}:`);
    await importTable(table);
  }
  console.log('\n✅ Done!');
}

main().catch(console.error);
