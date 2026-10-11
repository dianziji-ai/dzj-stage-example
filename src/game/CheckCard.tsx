import type { Check } from './logic'

/**
 * 行动检定卡：这一轮有检定（check 区写了）才出现，压在对话框上方。
 * 手机压成一行小胶囊（🎲 属性 掷骰/目标 · 行动 · 结果），电脑是完整卡片——手机上竖向空间要留给立绘和正文。
 */
export default function CheckCard({ check }: { check: Check }) {
  const ok = /成功/.test(check.result)
  const badge = check.result && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${ok ? 'bg-emerald-500' : 'bg-pink-500'}`}>{check.result}</span>
  return (
    <>
      <div className="mb-2 flex max-w-full animate-fade-in items-center gap-2 self-start rounded-full bg-white/90 py-1 pr-1 pl-3 text-[12px] text-[#4a2f2a] shadow-[0_6px_18px_-8px_rgba(0,0,0,0.45)] lg:hidden">
        <span className="min-w-0 truncate">
          🎲 <b>{check.attr || '检定'}</b>
          {check.roll && (
            <span className="ml-1 text-[#9a7b72] tabular-nums">
              {check.roll}
              {check.target && ` / ${check.target}`}
            </span>
          )}
          {check.action && <span className="ml-1.5 text-[#9a7b72]">{check.action}</span>}
        </span>
        {badge}
      </div>
      <div className="mb-2 hidden w-full animate-fade-in rounded-2xl bg-white/90 px-3.5 py-2.5 text-[13px] text-[#4a2f2a] shadow-[0_8px_24px_-10px_rgba(0,0,0,0.5)] lg:block">
        <div className="mb-1 flex items-center gap-2">
          <span className="font-bold">🎲 行动检定</span>
          <span className="min-w-0 flex-1 truncate text-[#9a7b72]">{check.action}</span>
          {badge}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-[#9a7b72]">
          {check.attr && <span>属性 {check.attr}</span>}
          {check.difficulty && <span>难度 {check.difficulty}</span>}
          {check.target && <span>目标 {check.target}</span>}
          {check.roll && <span>掷骰 {check.roll}</span>}
        </div>
      </div>
    </>
  )
}
