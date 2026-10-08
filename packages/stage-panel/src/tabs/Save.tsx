import { useState } from 'react'
import type { StageClient, StageError, StageSave, StageSnapshot } from '@dianziji/stage/client'
import { btnMain, btnSoft, initialOf, mono, muted } from '../ui'
import { CopyButton, Empty, Field, Json } from '../parts'

/**
 * 存档（上）+ 存档结构（下，折叠）。玩家可以自己改（JSON）；保存时后端按存档结构校验——字段、类型、范围不对就存不进去，错在哪会写明。
 * ★存的时候标 source: 'panel'：SDK 会广播这次保存，游戏订阅 stage.on 就能换掉内存里那份、更新界面
 *   （面板不用知道游戏界面长什么样）；存档器也会自动丢掉还没发的旧改动。
 */
export default function Save({ stage, snap }: { stage: StageClient; snap: StageSnapshot }) {
  const original = JSON.stringify(snap.save, null, 2)
  const [text, setText] = useState(original)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [busy, setBusy] = useState(false)

  if (!snap.state_schema) return <Empty>这张卡还没定义存档结构，没有存档</Empty>

  const save = async () => {
    let value: StageSave
    try {
      value = JSON.parse(text)
    } catch (e) {
      setResult({ ok: false, msg: `JSON 写错了：${(e as Error).message}` })
      return
    }
    setBusy(true)
    setResult(null)
    try {
      await stage.save(value, { source: 'panel' }) // 发出去是压缩的 JSON（这里排版只是为了好读）
      setText(JSON.stringify(value, null, 2)) // 存好的就是现在显示的那份
      setResult({ ok: true, msg: '已保存' })
    } catch (e) {
      setResult({ ok: false, msg: (e as StageError).message })
    } finally {
      setBusy(false)
    }
  }

  const changed = text !== original
  return (
    <>
      <p className={muted}>可以直接改了保存。字段、类型、取值范围要符合下面的存档结构，不符合会存不进去（会写明哪里不对）。</p>
      {/* 作者可能改过存档结构：旧存档对不上时给出路 */}
      <div className="flex gap-2.5 rounded-xl border border-sp-line bg-sp-accent-soft px-3 py-2.5 text-xs leading-relaxed">
        <span className="shrink-0">💡</span>
        <div className="min-w-0 flex-1">
          作者可能会更新存档结构。如果发现存不进去：展开下面的「存档结构」对照着改；或者先
          {snap.state_schema && (
            <button
              className="mx-1 font-medium text-sp-accent underline underline-offset-2"
              onClick={() => {
                setText(JSON.stringify(initialOf(snap.state_schema!), null, 2))
                setResult({ ok: true, msg: '已填入开局存档，确认后点「保存修改」' })
              }}
            >
              填入开局存档
            </button>
          )}
          再改回你要的数值。
        </div>
      </div>
      {/* 手机上字号 16px：iOS 小于 16px 聚焦会自动放大整页 */}
      <textarea className={`${mono} min-h-64 w-full resize-y text-base outline-none focus:border-sp-accent lg:text-xs`} rows={14} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
      <div className="flex flex-wrap gap-2">
        <button className={btnMain} onClick={() => void save()} disabled={busy || !changed}>
          {busy ? '保存中…' : '保存修改'}
        </button>
        {changed && (
          <button
            className={btnSoft}
            onClick={() => {
              setText(original)
              setResult(null)
            }}
            disabled={busy}
          >
            还原
          </button>
        )}
      </div>
      {result && <p className={result.ok ? 'text-sp-ok' : 'text-sp-danger'}>{result.msg}</p>}

      {snap.state_schema && (
        <details className="group rounded-xl border border-sp-line bg-sp-card">
          <summary className="flex list-none items-center gap-2 px-3 py-2.5 font-medium [&::-webkit-details-marker]:hidden">
            <span className="flex-1">存档结构</span>
            <span className={`text-xs transition-transform group-open:rotate-90 ${muted}`}>▸</span>
          </summary>
          <div className="space-y-3 border-t border-sp-line p-3">
            <Field title="开局存档（各字段 default）" action={<CopyButton text={JSON.stringify(initialOf(snap.state_schema), null, 2)} />}>
              <Json value={initialOf(snap.state_schema)} />
            </Field>
            <Field title="结构（JSON Schema）" action={<CopyButton text={JSON.stringify(snap.state_schema, null, 2)} />}>
              <Json value={snap.state_schema} />
            </Field>
          </div>
        </details>
      )}
    </>
  )
}
