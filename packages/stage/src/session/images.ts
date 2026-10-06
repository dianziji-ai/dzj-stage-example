/**
 * 配图编号：AI 在回复里写 `![](编号)` 引用卡的配图库（snap.image_pack）里的图。
 * ★readZones 不碰它（原样留在分区里），编号拿来做什么由舞台自己决定：弹 CG、插进正文、解锁图册、还是不显示。
 * 这几个 helper 按需用：
 *
 *   imageRefs(raw)                → [3, 5]          原文里引用了哪些编号（按出现顺序、去重）
 *   imageUrl(snap, 3)             → 'https://…'     编号 → 配图库里的地址；没有＝null。也收字符串 '3' 和 '![](3)'
 *                                                     （分区里写哪种，zoneText 读出来直接传进来），别的＝null
 *   resolveImages(text, snap)     → 把 ![](3) 换成 ![](https://…)；配图库里没有的编号整个删掉
 *   stripImages(text)             → 把 ![](编号) 全删掉（正文里不显示图、图走别的地方展示时用）
 *
 * 只认「括号里是纯数字」的写法；`![](https://…)` 这种外链图四个函数都不动。
 */
import type { StageSnapshot } from '../client'

/** ![说明](编号)：说明可以为空，编号只能是数字（括号里允许空格） */
const REF = /!\[([^\]]*)\]\(\s*(\d+)\s*\)/g

export function imageRefs(text: string): number[] {
  const out: number[] = []
  for (const m of text.matchAll(REF)) {
    const n = Number(m[2])
    if (!out.includes(n)) out.push(n)
  }
  return out
}

export function imageUrl(snap: Pick<StageSnapshot, 'image_pack'>, n: number | string | null | undefined): string | null {
  // 收三种：数字 3、字符串 '3'、整段只有一张图的 '![](3)'（分区里写哪种，zoneText 读出来直接传进来都行）
  const str = typeof n === 'string' ? (n.match(/^\s*(?:!\[[^\]]*\]\(\s*(\d+)\s*\)|(\d+))\s*$/) ?? []) : []
  const num = typeof n === 'number' ? n : str[1] ?? str[2] ? Number(str[1] ?? str[2]) : NaN
  if (!Number.isInteger(num)) return null
  return snap.image_pack?.images?.find((im) => im.n === num)?.src ?? null
}

export function resolveImages(text: string, snap: Pick<StageSnapshot, 'image_pack'>): string {
  return text.replace(REF, (_, alt: string, n: string) => {
    const src = imageUrl(snap, Number(n))
    return src ? `![${alt}](${src})` : ''
  })
}

export function stripImages(text: string): string {
  // 整行只有一张图：连同这一行一起删，别留空行
  return text.replace(/^[ \t]*!\[[^\]]*\]\(\s*\d+\s*\)[ \t]*(\r?\n|$)/gm, '').replace(REF, '')
}
