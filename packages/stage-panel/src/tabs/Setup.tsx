import type { StageSnapshot } from '@dianziji/stage/client'
import { mono, muted } from '../ui'
import { Empty, Field } from '../parts'

/** 初始设定：进场前填的。玩家看「名 值」；开发模式多一列 key（舞台按 key 取值）和原文（AI 看到的就是它） */
export default function Setup({ snap, dev }: { snap: StageSnapshot; dev: boolean }) {
  const { text, fields } = snap.setup
  if (!text && !fields.length) return <Empty>这一局没有初始设定</Empty>
  return (
    <>
      {fields.length > 0 && (
        <table className="w-full table-fixed text-left">
          <thead className={`text-[11px] ${muted}`}>
            <tr>
              {dev && <th className="w-[28%] py-1 pr-2 font-normal">key</th>}
              <th className="w-[36%] py-1 pr-2 font-normal">{dev ? '显示名' : '项目'}</th>
              <th className="py-1 font-normal">填的</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.key} className="border-t border-sp-line align-top">
                {dev && <td className="py-1.5 pr-2 font-mono text-xs [overflow-wrap:anywhere]">{f.key}</td>}
                <td className="py-1.5 pr-2 [overflow-wrap:anywhere]">{f.label}</td>
                <td className="py-1.5 [overflow-wrap:anywhere]">{f.value ?? <span className={muted}>没填</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {(dev || !fields.length) && (
        <Field title={dev ? '原文（setup.text）' : '原文'}>
          <pre className={mono}>{text || '（空）'}</pre>
        </Field>
      )}
    </>
  )
}
