import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const storageSource = readFileSync(join(root, 'sales_team/lib/visitProofStorage.ts'), 'utf8')

assert.match(storageSource, /VISIT_PROOF_BUCKET\s*=\s*'visit-photos'/)

function listSourceFiles(path, output = []) {
  const absolutePath = join(root, path)
  if (!existsSync(absolutePath)) return output

  for (const entry of readdirSync(absolutePath)) {
    const relativePath = `${path}/${entry}`.replaceAll('\\', '/')
    const absoluteEntry = join(root, relativePath)
    const stat = statSync(absoluteEntry)

    if (stat.isDirectory()) {
      if (!['node_modules', 'dist'].includes(entry)) listSourceFiles(relativePath, output)
    } else if (/\.(ts|tsx)$/.test(relativePath)) {
      output.push(relativePath)
    }
  }

  return output
}

for (const path of listSourceFiles('sales_team')) {
  const source = readFileSync(join(root, path), 'utf8')
  assert.equal(source.includes('visit-proofs'), false, `${path} still references the old visit-proofs bucket`)
}

console.log('visit proof storage checks passed')
