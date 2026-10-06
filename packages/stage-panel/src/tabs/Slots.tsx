import { useMemo, useState } from 'react'
import { readZones, type StageSnapshot, type StageZone } from '@dianziji/stage'
import { btnSoft, mono, muted } from '../ui'
import { Field, Json } from '../parts'

/**
 * 分区：一区一张卡（电脑两列、手机一列）。收起时看「图标 名字 · 区 id · 类型」和最近一轮写了什么；
 * 点开看最近一轮的完整值、AI 写法（schema）、说明（instruction）。原始 JSON 是个开关。
 */
export default function Slots({ snap }: { snap: StageSnapshot }) {
  const [raw, setRaw] = useState(false)
  const last = useMemo(() => {
    const m = [...snap.history].reverse().find((h) => h.role === 'assistant')
    return m ? readZones(m.content, snap) : {}
  }, [snap])
  const wrote = snap.slots.filter((s) => last[s.zone]).length

  return (
    <>
      <div className="flex items-center gap-2">
        <p className={`${muted} min-w-0 flex-1`}>
          {snap.slots.length} 个分区 · 最近一轮写了 {wrote} 个 · 舞台里用 <code className="font-mono">readZones(原文, snap)[区 id]</code>
        </p>
        <button className={`${btnSoft} shrink-0`} onClick={() => setRaw(!raw)}>
          {raw ? '卡片' : '原始 JSON'}
        </button>
      </div>
      {raw ? (
        <Json value={snap.slots} />
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {snap.slots.map((s) => (
            <SlotCard key={s.zone} slot={s} value={last[s.zone]} />
          ))}
        </div>
      )}
    </>
  )
}

function SlotCard({ slot, value }: { slot: StageSnapshot['slots'][number]; value?: StageZone }) {
  const { zone, kind, label, icon, schema, instruction, enabled, ...rest } = slot
  const off = enabled === false
  return (
    <details className={`group min-w-0 rounded-xl border border-sp-line bg-sp-card ${off ? 'opacity-50' : ''}`}>
      <summary className="flex list-none items-start gap-2.5 p-3 [&::-webkit-details-marker]:hidden">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sp-code text-base">{typeof icon === 'string' && icon ? icon : '▦'}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <b className="text-[13px]">{label || zone}</b>
            <code className="rounded bg-sp-accent-soft px-1 font-mono text-[11px] text-sp-accent">{zone}</code>
            {kind && <span className="rounded-full border border-sp-line px-1.5 text-[10px] text-sp-muted">{kind}</span>}
            {off && <span className={`text-[10px] ${muted}`}>停用</span>}
          </span>
          <span className={`mt-0.5 block truncate text-xs ${value ? '' : muted}`}>{value ? preview(value) : '最近一轮没写'}</span>
        </span>
        <span className={`mt-1.5 shrink-0 text-xs transition-transform group-open:rotate-90 ${muted}`}>▸</span>
      </summary>
      <div className="space-y-2.5 border-t border-sp-line px-3 pt-2.5 pb-3">
        {value && (
          <Field title="最近一轮的值">
            {value.type === 'narrative' || value.type === 'reasoning' ? <pre className={`${mono} max-h-60 overflow-y-auto overscroll-contain`}>{value.value}</pre> : <Json value={value.value} />}
          </Field>
        )}
        {typeof schema === 'string' && schema && (
          <Field title="AI 写法（schema）">
            <pre className={mono}>{schema}</pre>
          </Field>
        )}
        {typeof instruction === 'string' && instruction && (
          <Field title="说明（instruction）">
            <p className="text-xs leading-relaxed whitespace-pre-wrap">{instruction}</p>
          </Field>
        )}
        {Object.keys(rest).length > 0 && (
          <Field title="其他字段">
            <Json value={rest} />
          </Field>
        )}
      </div>
    </details>
  )
}

/** 收起时那一行：正文取开头、数据压成「键 值」、选项用 / 连 */
function preview(z: StageZone): string {
  if (z.type === 'action') return z.value.join(' / ')
  if (z.type === 'data') {
    const v = z.value
    if (v && typeof v === 'object' && !Array.isArray(v)) return Object.entries(v).map(([k, x]) => `${k} ${typeof x === 'object' ? JSON.stringify(x) : String(x)}`).join(' · ')
    return JSON.stringify(v)
  }
  return z.value.replace(/\s+/g, ' ').slice(0, 80)
}
