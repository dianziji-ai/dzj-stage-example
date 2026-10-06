/**
 * SDK 只读检查：packages/ 下每个文件的指纹（sha256）记在 packages/sdk.lock.json，npm test 前比对。
 *   node scripts/sdk-lock.mjs           检查：有文件被改 / 多了 / 少了 → 报出来并失败
 *   node scripts/sdk-lock.mjs --write   重新记录（★只有官方发新版 SDK 时用；作者和 AI 不要跑）
 * 作者开发时不该改 packages/：不够用向官方提需求，官方出新版时整个替换（连同这份 lock）。
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = join(import.meta.dirname, '..', 'packages')
const LOCK = join(ROOT, 'sdk.lock.json')
const SKIP = new Set(['node_modules', 'coverage', 'dist', '.DS_Store'])

/** 换行统一成 LF 再算：Windows 上 Git 会把 LF 转成 CRLF，没改过也不能算「改过」（latin1 来回转不丢字节，二进制文件同样适用） */
function fingerprint(p) {
  return createHash('sha256').update(readFileSync(p).toString('latin1').replace(/\r\n/g, '\n'), 'latin1').digest('hex')
}

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (SKIP.has(e.name)) return []
    const p = join(dir, e.name)
    return e.isDirectory() ? files(p) : [p]
  })
}

const now = Object.fromEntries(
  files(ROOT)
    .filter((p) => p !== LOCK)
    .map((p) => [relative(ROOT, p).split(sep).join('/'), fingerprint(p)])
    .sort(([a], [b]) => a.localeCompare(b)),
)

if (process.argv.includes('--write')) {
  writeFileSync(LOCK, JSON.stringify(now, null, 2) + '\n')
  console.log(`已记录 ${Object.keys(now).length} 个 SDK 文件的指纹 → packages/sdk.lock.json`)
  process.exit(0)
}

if (!existsSync(LOCK)) {
  console.error('缺少 packages/sdk.lock.json：SDK 不完整，请从官方仓库重新拿一份 packages/。')
  process.exit(1)
}
const want = JSON.parse(readFileSync(LOCK, 'utf8'))
const changed = Object.keys(want).filter((f) => now[f] && now[f] !== want[f])
const missing = Object.keys(want).filter((f) => !now[f])
const added = Object.keys(now).filter((f) => !want[f])
if (changed.length || missing.length || added.length) {
  console.error('\n✖ SDK（packages/）被改过了。packages/ 是只读的：作者开发时不要改它。')
  for (const f of changed) console.error(`  改了  packages/${f}`)
  for (const f of missing) console.error(`  少了  packages/${f}`)
  for (const f of added) console.error(`  多了  packages/${f}`)
  console.error('\n请把这些改动还原（或从官方仓库重新拿一份 packages/）。SDK 不够用请向官方提需求，别自己改。\n')
  process.exit(1)
}
console.log(`✓ SDK 未被修改（${Object.keys(want).length} 个文件）`)
