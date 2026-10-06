/**
 * 把 dist/ 压成 stage.zip（npm run pack 在 vite build 之后调）。只用 Node 自带的 zlib，不依赖系统的 zip 命令：
 * Windows / macOS / Linux 一样能用。zip 里的路径相对 dist/（根目录就是 index.html），平台上传时按这个结构解开。
 */
import { deflateRawSync } from 'node:zlib'
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const root = join(import.meta.dirname, '..')
const dist = join(root, 'dist')
const out = join(root, 'stage.zip')
if (!existsSync(join(dist, 'index.html'))) {
  console.error('✖ dist/index.html 不存在：先 npm run build（npm run pack 会自动先 build）')
  process.exit(1)
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]))

const local = []
const central = []
let offset = 0
for (const path of files(dist).sort()) {
  const name = Buffer.from(relative(dist, path).split(sep).join('/'), 'utf8')
  const data = readFileSync(path)
  const packed = deflateRawSync(data, { level: 9 })
  const store = packed.length >= data.length // 压不小（图片）就原样存
  const body = store ? data : packed
  const crc = crc32(data)
  const head = Buffer.alloc(30)
  head.writeUInt32LE(0x04034b50, 0) // 本地文件头
  head.writeUInt16LE(20, 4) // 需要的版本
  head.writeUInt16LE(0x0800, 6) // 文件名是 UTF-8
  head.writeUInt16LE(store ? 0 : 8, 8) // 0＝不压缩 8＝deflate
  head.writeUInt32LE(0x00210000, 10) // 修改时间：1980-01-01（固定，同样的内容打出同样的包）
  head.writeUInt32LE(crc, 14)
  head.writeUInt32LE(body.length, 18)
  head.writeUInt32LE(data.length, 22)
  head.writeUInt16LE(name.length, 26)
  local.push(head, name, body)

  const dir = Buffer.alloc(46)
  dir.writeUInt32LE(0x02014b50, 0) // 中央目录
  dir.writeUInt16LE(20, 4)
  dir.writeUInt16LE(20, 6)
  dir.writeUInt16LE(0x0800, 8)
  dir.writeUInt16LE(store ? 0 : 8, 10)
  dir.writeUInt32LE(0x00210000, 12)
  dir.writeUInt32LE(crc, 16)
  dir.writeUInt32LE(body.length, 20)
  dir.writeUInt32LE(data.length, 24)
  dir.writeUInt16LE(name.length, 28)
  dir.writeUInt32LE(offset, 42)
  central.push(dir, name)
  offset += head.length + name.length + body.length
}
const cd = Buffer.concat(central)
const end = Buffer.alloc(22)
end.writeUInt32LE(0x06054b50, 0) // 中央目录结尾
end.writeUInt16LE(central.length / 2, 8)
end.writeUInt16LE(central.length / 2, 10)
end.writeUInt32LE(cd.length, 12)
end.writeUInt32LE(offset, 16)
writeFileSync(out, Buffer.concat([...local, cd, end]))

const kb = (statSync(out).size / 1024).toFixed(0)
console.log(`✓ 已生成 stage.zip（${central.length / 2} 个文件，${kb}KB）：在网站编辑器「舞台 → 上线」上传，刷新游戏后看加载页底部的 BUILD 号变没变`)
