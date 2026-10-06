/**
 * 把仓库里的存档结构（游戏状态）写进网站上这张卡：
 *   npm run schema:push                       默认推 src/game/state.schema.json
 *   npm run schema:push -- path/to/x.json     推别的文件
 * 用 .env 里的开发凭证（VITE_STAGE_API / VITE_STAGE_TOKEN）调 PUT /stage/schema。只认开发凭证 + 卡的作者本人。
 * ★改了结构，通不过新结构的老存档读回来是开局存档：推之前确认作者同意。
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const file = process.argv[2] ?? join(root, 'src/game/state.schema.json')

const env = {}
if (existsSync(join(root, '.env'))) {
  for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)
    if (m) env[m[1]] = m[2]
  }
}
const api = (env.VITE_STAGE_API ?? '').replace(/\/+$/, '')
const token = env.VITE_STAGE_TOKEN ?? ''
if (!api || !token || token.includes('your_token')) {
  console.error('✖ .env 里没有开发凭证：网站上进入卡 → 工具行「开发」→ 生成凭证，照 .env.example 贴进 .env')
  process.exit(1)
}

let schema
try {
  schema = JSON.parse(readFileSync(file, 'utf8'))
} catch (e) {
  console.error(`✖ 读不了 ${file}：${e.message}`)
  process.exit(1)
}

const r = await fetch(`${api}/schema`, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify(schema),
}).catch((e) => {
  console.error(`✖ 连不上 ${api}：${e.message}`)
  process.exit(1)
})
const body = await r.json().catch(() => null)
if (!r.ok) {
  console.error(`✖ ${body?.error?.message ?? `请求失败（${r.status}）`}`)
  process.exit(1)
}
const keys = Object.keys(schema?.properties ?? {})
console.log(`✓ 存档结构已写进卡（${keys.length} 个字段：${keys.join('、')}）。网站编辑器「舞台 → ② 存档结构」里能看到。`)
