import { useEffect } from 'react'
import { useSaveStatus, useStageActions } from '@dianziji/stage/react'
import { Icon, type IconName } from '../components/icons'

type Item = { icon?: IconName; emoji?: string; label: string; sub?: string; onClick: () => void; on?: boolean }

/**
 * 手机菜单（顶栏 ☰）：从底部弹起的奶油色面板，3 列大格子。
 *   地图 / 图册 / 本局 / 音乐开关 / 保存（下面一行小字写上次什么时候存的）
 * 点格子做事并收起（音乐、保存不收，原地变）；点遮罩 / Esc 收起。底边让 home 条。
 * ★性能：关着不渲染；进场只动 transform。
 */
export default function GameMenu({ open, onClose, go, musicOn, onMusic }: {
  open: boolean
  onClose: () => void
  /** 去某一页 / 打开本局（'panel'） */
  go: (page: string) => void
  musicOn: boolean
  onMusic: () => void
}) {
  const { saveNow, saver } = useStageActions()
  const st = useSaveStatus(saver)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const nav = (page: string) => () => {
    onClose()
    go(page)
  }
  const saved = st.state === 'saving' ? '正在保存…' : st.state === 'error' ? '没存上，点一下重试' : st.at ? `${new Date(st.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 存过` : '自动保存中'
  const items: Item[] = [
    { icon: 'map', label: '地图', sub: '和她去别处', onClick: nav('map') },
    { icon: 'gallery', label: '图册', sub: '回忆和娃娃', onClick: nav('gallery') },
    { icon: 'info', label: '本局', sub: '设定 / 存档 / 分区', onClick: nav('panel') },
    { emoji: musicOn ? '🎵' : '🔇', label: musicOn ? '音乐 开' : '音乐 关', sub: '点一下切换', onClick: onMusic, on: musicOn },
    { emoji: '💾', label: '保存', sub: saved, onClick: saveNow },
  ]

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center lg:hidden" role="dialog" aria-modal="true" aria-label="菜单">
      <button aria-label="关闭" tabIndex={-1} onClick={onClose} className="absolute inset-0 animate-fade-in cursor-default bg-black/45" />
      <div className="gal-paper relative w-full animate-[sheet-up_0.24s_cubic-bezier(0.2,0.9,0.3,1)] rounded-t-[28px] px-safe pb-[max(var(--safe-bottom),16px)] shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.4)]">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-[#4a2f2a]/15" />
        <div className="grid grid-cols-3 gap-2.5 p-4">
          {items.map((it) => (
            <button
              key={it.label}
              onClick={it.onClick}
              className={`flex flex-col items-center gap-1 rounded-2xl bg-white px-2 py-3.5 text-[#4a2f2a] shadow-[0_6px_16px_-10px_rgba(236,72,153,0.45)] active:scale-95 ${it.on === false ? 'opacity-70' : ''}`}
            >
              <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-amber-100 to-pink-100 text-pink-500">
                {it.icon ? <Icon name={it.icon} className="size-5" /> : <span className="text-lg">{it.emoji}</span>}
              </span>
              <span className="text-sm font-bold">{it.label}</span>
              {it.sub && <span className={`w-full truncate text-center text-[10px] ${st.state === 'error' && it.label === '保存' ? 'text-rose-500' : 'text-[#9a7b72]'}`}>{it.sub}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
