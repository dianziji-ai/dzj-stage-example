import { Icon, type IconName } from '../components/icons'

export type Tab = { id: string; icon: IconName; label: string }

/**
 * 底部菜单（游玩以外的页面才有）：悬浮的白色胶囊坞，当前页是粉色小胶囊。
 * 底边让出 home indicator（至少留 12px，没有安全区的设备也不贴底）。
 */
export default function TabBar({ tabs, active, onPick }: { tabs: Tab[]; active: string; onPick: (id: string) => void }) {
  return (
    <nav className="shrink-0 px-safe pt-2 pb-[max(var(--safe-bottom),12px)]">
      <div className="mx-auto flex w-[min(92%,440px)] gap-1 rounded-full border border-pink-100 bg-white p-1.5 shadow-[0_10px_30px_-8px_rgba(236,72,153,0.35)]">
        {tabs.map((t) => {
          const on = t.id === active
          return (
            <button
              key={t.id}
              onClick={() => onPick(t.id)}
              aria-current={on ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[11px] font-medium transition-colors ${
                on ? 'bg-gradient-to-br from-pink-400 to-rose-400 text-white shadow-sm' : 'text-[#9a7b72] active:bg-pink-50'
              }`}
            >
              <Icon name={t.icon} className="size-[22px]" />
              {t.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
