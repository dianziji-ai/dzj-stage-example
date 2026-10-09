/**
 * 一句的文字：开头的（小动作）单独一行、小一号偏淡；「」里的台词加粗提亮——动作和台词一眼分得开。
 * 纯文本拆段，不走 HTML：AI 写的内容不当标记解析（不会被注入）。
 * sayClass：台词的样式（对话框按她这句的情绪给台词染一点光）。
 */
export default function BeatText({ text, sayClass = 'font-semibold text-white' }: { text: string; sayClass?: string }) {
  const m = text.match(/^（([^）]*)）\s*([\s\S]*)$/)
  const act = m?.[1] ?? ''
  const rest = m ? m[2] : text
  return (
    <>
      {act && <span className="mb-0.5 block text-[0.88em] text-white/60">（{act}）</span>}
      {rest && (
        <span className="block whitespace-pre-line">
          {rest.split(/(「[^」]*」?)/).map((p, i) =>
            p.startsWith('「') ? (
              <b key={i} className={sayClass}>
                {p}
              </b>
            ) : (
              p
            ),
          )}
        </span>
      )}
    </>
  )
}
