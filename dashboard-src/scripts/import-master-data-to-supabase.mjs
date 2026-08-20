import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const DEST = import.meta.dirname ? join(import.meta.dirname, '..') : '.';

const SR_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
if (!SR_KEY || !SUPABASE_URL) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL env vars');
  console.error('   Run: SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_URL=... node scripts/import-master-data-to-supabase.mjs');
  process.exit(1);
}

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
  const rows = lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ''; });
    return row;
  }).filter(r => Object.values(r).some(v => v));
  return { headers, rows };
}

function inferType(val) {
  if (!val || val === '' || val === 'nan' || val === 'NaN' || val === 'null' || val === 'NULL') return 'null';
  if (/^-?\d+$/.test(val)) return 'integer';
  if (/^-?\d+\.?\d*$/.test(val)) return 'numeric';
  if (val === 'true' || val === 'false' || val === 't' || val === 'f') return 'boolean';
  return 'string';
}

function cleanValue(val) {
  if (!val || val === '' || val === 'nan' || val === 'NaN' || val === 'null' || val === 'NULL') return null;
  const t = inferType(val);
  if (t === 'integer') return parseInt(val);
  if (t === 'numeric') return parseFloat(val);
  if (t === 'boolean') return val === 'true' || val === 't';
  return val;
}

async function tableExists(tableName) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=count&limit=0`, {
    headers: { apikey: SR_KEY, Authorization: `Bearer ${SR_KEY}` },
  });
  return res.status === 200;
}

async function importTable(tableDef) {
  const csvPath = join(CSV_BASE, tableDef.csv);
  if (!existsSync(csvPath)) {
    console.log(`  ⏭️  ${tableDef.csv} not found`);
    return;
  }

  const { headers, rows } = parseCSV(csvPath);
  console.log(`  📄 ${tableDef.csv}: ${rows.length} rows`);

  if (!await tableExists(tableDef.name)) {
    console.log(`  ⛔ Table ${tableDef.name} doesn't exist!`);
    console.log(`     Run the SQL migration first: supabase/migrations/master_data_schema.sql`);
    return;
  }

  const BATCH = 500;
  let imported = 0, errors = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const payload = batch.map(row => {
      const obj = {};
      headers.forEach(h => { obj[h] = cleanValue(row[h]); });
      return obj;
    });

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableDef.name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SR_KEY,
        Authorization: `Bearer ${SR_KEY}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    });

    if (res.status >= 400) {
      const err = await res.text();
      console.log(`  ❌ Batch ${Math.floor(i / BATCH) + 1} failed: ${err.slice(0, 150)}`);
      errors++;
      if (errors > 3) { console.log('  ⛔ Too many errors, aborting'); return; }
    } else {
      imported += batch.length;
    }

    process.stdout.write(`  📦 ${imported}/${rows.length} rows\r`);
  }

  console.log(`  ✅ ${imported} rows imported to ${tableDef.name}${errors ? ` (${errors} errors)` : ''}`);
}

async function main() {
  console.log('🔌 Master Data Importer');
  console.log(`📁 Source: ${CSV_BASE}`);
  console.log(`🔗 Supabase: ${SUPABASE_URL}\n`);

  for (const table of TABLES) {
    console.log(`\n📋 ${table.name}:`);
    await importTable(table);
  }

  console.log('\n✅ Done!');
}

main().catch(console.error);
