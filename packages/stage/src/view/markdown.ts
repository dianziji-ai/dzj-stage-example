/**
 * 轻量 markdown 渲染（AI 正文用）：micromark（CommonMark 标准，gzip 16KB）。
 * ★默认安全：原始 HTML 一律转义成文字、javascript: 之类的链接清空——AI 输出里混进什么都不会执行，不用再套清洗库。
 *
 * 在它之上只加三件小事：
 *  ① 对白「…」包一层 <span class="quote">，舞台自己给对白上色（打到一半还没闭合的「 也先上色）
 *  ② 块与块之间的换行去掉——容器用 white-space: pre-line 保留段内单换行（AI 习惯一句一行），块间换行不能变成空行
 *  ③ 打字机用：hideOpenMarks 把末尾还没写完的 ** / * 先藏起来，打字时看不到星号一闪一闪
 */
import { micromark } from 'micromark'

/** markdown → 安全 HTML */
export function renderMarkdown(text: string): string {
  if (!text.trim()) return ''
  const html = micromark(text).replace(/>\n+</g, '><').trim()
  // 只改文字部分、不碰标签：按标签切开，文字段里给「…」上色
  return html
    .split(/(<[^>]+>)/)
    .map((part) => (part.startsWith('<') ? part : part.replace(/「[^」]*」?/g, (m) => `<span class="quote">${m}</span>`)))
    .join('')
}

/**
 * 打字打到一半时，末尾可能停在「**加」这种没闭合的标记上：没配对的最后一个 ** / * 先拿掉。
 * 等闭合的那个也打出来，自然就成了粗体 / 斜体。
 */
export function hideOpenMarks(s: string): string {
  let t = s
  if ((t.match(/\*\*/g)?.length ?? 0) % 2) {
    const i = t.lastIndexOf('**')
    t = t.slice(0, i) + t.slice(i + 2)
  }
  const single = [...t.matchAll(/(?<!\*)\*(?!\*)/g)]
  if (single.length % 2) {
    const i = single[single.length - 1].index!
    t = t.slice(0, i) + t.slice(i + 1)
  }
  return t
}
