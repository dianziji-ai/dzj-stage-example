import type { StageShortcut } from '@dianziji/stage'
import { Icon } from '../components/icons'

/**
 * 快捷指令盘（⚡ 点开）：手机从底部升起，电脑在对话框上方居中。
 * ★指令不写在舞台里：作者在网站编辑器「快捷指令」配，经快照推进来（useShortcuts），改卡就跟着变、对话模式也是同一份。
 * 点一条：mode＝fill 填进输入框等玩家改（缺省），send 直接发（芯片上标「直发」）。
 */
export default function ShortcutTray({ items, onPick, onClose }: { items: StageShortcut[]; onPick: (s: StageShortcut) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 lg:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[70dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-panel pb-safe text-text shadow-2xl lg:rounded-3xl lg:pb-0">
        <div className="flex h-13 shrink-0 items-center gap-2 px-4">
          <Icon name="bolt" className="size-4 text-accent" />
          <b className="text-[15px]">快捷指令</b>
          <span className="flex-1" />
          <button onClick={onClose} aria-label="关闭" className="grid size-9 place-items-center rounded-full text-muted hover:bg-line/50">
            <Icon name="close" className="size-4" />
          </button>
        </div>
        <div className="grid min-h-0 grid-cols-2 gap-2 overflow-y-auto px-4 pb-4">
          {items.map((s, i) => (
            <button key={i} onClick={() => onPick(s)} title={s.command} className="flex min-h-11 items-center gap-2 rounded-2xl border border-line px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:border-accent active:scale-[0.98]">
              <span className="min-w-0 flex-1 truncate">{s.label}</span>
              {s.mode === 'send' && <span className="shrink-0 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">直发</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
