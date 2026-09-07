#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
import XLSX from 'xlsx'

const XLSX_PATH = '/home/ahmed/Downloads/Final new_coding_tree_With_Normalization_Name.xlsx'
const OUT_SQL = '/tmp/opencode/coding_seed.sql'
const OUT_REPORT = '/tmp/opencode/coding_seed_report.txt'

const tree = [
  ['الجبن و الالبان', 'اجبان', '1', '01'],
  ['الجبن و الالبان', 'البان', '1', '02'],
  ['الجبن و الالبان', 'كريمات', '1', '04'],
  ['بقالة', 'ارز', '2', '01'],
  ['بقالة', 'مكرونات', '2', '02'],
  ['بقالة', 'خل', '2', '03'],
  ['بقالة', 'سكر', '2', '04'],
  ['بقالة', 'معلبات', '2', '05'],
  ['بقالة', 'ملح', '2', '07'],
  ['مشروبات', 'مشروبات ساخنة', '3', '01'],
  ['مشروبات', 'عصائر', '3', '02'],
  ['مشروبات', 'مشروبات غازية', '3', '03'],
  ['مشروبات', 'مياة معدنية', '3', '04'],
  ['زيت وسمن', 'زبدة', '4', '01'],
  ['زيت وسمن', 'زيوت طبخ', '4', '02'],
  ['زيت وسمن', 'زيوت نباتية', '4', '03'],
  ['زيت وسمن', 'سمن', '4', '04'],
  ['صوصات وصلصات', 'صلصة', '5', '01'],
  ['صوصات وصلصات', 'صوصات وتغميسات', '5', '02'],
  ['منتجات الباريستا', 'سيرب ونكهات باريستا', '6', '01'],
  ['منتجات الباريستا', 'بوبا', '6', '02'],
  ['منتجات الحلويات', 'عسل ومربات ودبس', '7', '01'],
  ['منتجات الحلويات', 'حشوات', '7', '02'],
  ['منتجات الحلويات', 'منتجات الحلويات', '7', '03'],
  ['منتجات خبز', 'دقيق', '8', '01'],
  ['توابل ومكسبات طعم', 'توابل ومرق', '9', '01'],
]
const prefixOf = new Map(tree.map(([m, s, d, sub]) => [m + '\u0000' + s, d + sub]))

const wb = XLSX.readFile(XLSX_PATH)
const ws = wb.Sheets[wb.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

const esc = (v) => String(v).replace(/'/g, "''")
const cleanOld = (v) => {
  const s = String(v).trim()
  if (!s || s === '0' || s.toLowerCase() === 'none' || s.toLowerCase() === 'null') return ''
  return s
}

const report = []
const issues = []
const dupOld = new Map()
let valid = 0
let skipped = 0

for (const r of rows) {
  const code = String(r['New Code']).trim()
  const main = String(r['Main Category']).trim()
  const sub = String(r['Sub Category']).trim()
  const orig = String(r['Product Name (Original)']).trim()
  const prefix = prefixOf.get(main + '\u0000' + sub)
  const errs = []

  if (!/^[0-9]{7}$/.test(code)) errs.push('كود ليس 7 أرقام: ' + code)
  if (prefix && !code.startsWith(prefix)) errs.push(`كود ${code} لا يبدأ بمقدمة القسم/الفرع ${prefix} (${main}/${sub})`)
  if (!orig) errs.push('اسم أصلي فارغ')

  const old = cleanOld(r['Old Code'])
  if (old) {
    const arr = dupOld.get(old) || []
    arr.push(code)
    dupOld.set(old, arr)
  }

  const sale = Number(r['Sale Price']) || 0
  const cost = Number(r['Cost']) || 0
  if (!Number.isFinite(Number(r['Sale Price']))) errs.push('سعر بيع غير رقمي: ' + r['Sale Price'])
  if (!Number.isFinite(Number(r['Cost']))) errs.push('تكلفة غير رقمية: ' + r['Cost'])
  const active = String(r['Active']).trim().toLowerCase() === 'yes'

  if (errs.length > 0) {
    skipped++
    issues.push({ code, main, sub, orig, errs })
    continue
  }
  valid++
  const notes = []
  if (old && dupOld.get(old).length > 1) notes.push('كود قديم مكرر')
  report.push({
    code, old, odoo: String(r['Odoo ID']).trim(),
    orig,
    norm: String(r['Product Name (Normalized)']).trim(),
    eng: String(r['English Name']).trim(),
    main, sub, sale, cost, active,
    status: notes.length ? 'warning' : 'valid',
    notes: notes.join('، '),
  })
}

let dupCount = 0
for (const [old, codes] of dupOld) if (codes.length > 1) dupCount += codes.length

const dups = [...dupOld.entries()].filter(([, c]) => c.length > 1).sort((a, b) => b[1].length - a[1].length)

let sql = 'begin;\n'
sql += 'insert into public.product_coding (\n'
sql += '  new_code, old_code, external_product_id, original_name, normalized_name, english_name,\n'
sql += '  main_category, sub_category, sale_price, cost, is_active, validation_status, validation_notes, source\n'
sql += ') values\n'
const vals = report.map((r) => `('${esc(r.code)}', ${r.old ? `'${esc(r.old)}'` : 'NULL'}, ${r.odoo ? `'${esc(r.odoo)}'` : 'NULL'}, '${esc(r.orig)}', '${esc(r.norm)}', '${esc(r.eng)}', '${esc(r.main)}', '${esc(r.sub)}', ${r.sale}, ${r.cost}, ${r.active}, '${r.status}', '${esc(r.notes)}', 'seed')`)
sql += vals.join(',\n') + '\n'
sql += 'on conflict (new_code) do update set\n'
sql += '  old_code = excluded.old_code, external_product_id = excluded.external_product_id,\n'
sql += '  original_name = excluded.original_name, normalized_name = excluded.normalized_name,\n'
sql += '  english_name = excluded.english_name, main_category = excluded.main_category,\n'
sql += '  sub_category = excluded.sub_category, sale_price = excluded.sale_price, cost = excluded.cost,\n'
sql += '  is_active = excluded.is_active, validation_status = excluded.validation_status,\n'
sql += '  validation_notes = excluded.validation_notes, updated_at = timezone(\'utc\', now());\n'
sql += 'commit;\n'
writeFileSync(OUT_SQL, sql)

let out = ''
out += `المجموع = ${rows.length}\n`
out += `صالح للبذر = ${valid}\n`
out += `مرفوض = ${skipped}\n`
out += `كود قديم مكرر (عدد التكرارات) = ${dupCount}\n`
out += `أعداد مكررة: ${dups.length}\n\n`
out += '== الأكواد القديمة المكررة ==\n'
for (const [old, codes] of dups) out += `${old} -> ${codes.join(', ')}\n`
out += `\n== المرفوضون ==\n`
for (const it of issues) out += `${it.code || '(بدون كود)'} | ${it.main}/${it.sub} | ${it.orig.slice(0, 60)} | ${it.errs.join(' | ')}\n`
writeFileSync(OUT_REPORT, out)

console.log(`valid=${valid} skipped=${skipped} dupRows=${dupCount} dupGroups=${dups.length}`)
console.log('wrote', OUT_SQL, '|', OUT_REPORT)