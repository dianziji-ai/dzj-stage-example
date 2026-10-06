import { TAP_VIDEO_ATTRS, useTapVideo } from '@dianziji/stage/react'
import { Icon } from '../components/icons'
import type { Clip } from './content'

/**
 * 全屏看一段视频（舞台开场、图册彩蛋共用）：先显示封面 + ▶，点了才播（两段式，见 SDK 的 useTapVideo）。
 * ★安卓的 UC / 夸克 / QQ / 微信会把 <video> 拉进原生全屏、网页按钮被盖住——所以点播放前 video 上没有 src、不自动播、不循环，
 *   播完 / 退出原生全屏 / 出错 / 起不来都清源收场。右上角的关闭（跳过）一直在，原生播放器也自带返回。
 * closeOnEnd：播完直接关（开场：播完进游戏）；不传＝播完回到封面（彩蛋：可以再看一遍）。
 */
export default function VideoViewer({ clip, closeLabel = '关闭', closeOnEnd = false, onClose }: {
  clip: Clip
  closeLabel?: string
  closeOnEnd?: boolean
  onClose: () => void
}) {
  const { ref, playing, play, stop } = useTapVideo(clip.src, (ended) => {
    if (ended && closeOnEnd) onClose()
  })
  const close = () => {
    stop()
    onClose()
  }
  return (
    <div className="fixed inset-0 z-[60] flex animate-fade-in items-center justify-center bg-black" role="dialog" aria-label={clip.name ?? '视频'}>
      {/* 封面：没在播的时候显示（图片，不是 video） */}
      {!playing && <img src={clip.poster} alt="" decoding="async" className="absolute inset-0 size-full object-contain" />}
      {/* ★常驻挂载、没有 src：点了才设 */}
      <video {...TAP_VIDEO_ATTRS} ref={ref} className={`absolute inset-0 size-full object-contain ${playing ? '' : 'invisible'}`} onClick={stop} />
      {!playing && (
        <button onClick={() => play()} aria-label="播放" className="relative grid size-20 place-items-center rounded-full bg-white/90 text-pink-500 shadow-[0_10px_30px_rgba(0,0,0,0.45)] active:scale-95">
          <span className="ml-1 border-y-[14px] border-l-[22px] border-y-transparent border-l-current" />
        </button>
      )}
      <button
        onClick={close}
        className="absolute top-[calc(var(--safe-top)+12px)] right-[calc(var(--safe-right)+12px)] flex items-center gap-1 rounded-full bg-black/55 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/25"
      >
        {closeLabel}
        <Icon name="close" className="size-4" />
      </button>
      {clip.name && !playing && <div className="absolute inset-x-0 bottom-0 pb-[calc(var(--safe-bottom)+20px)] text-center text-sm text-white/80">{clip.name}</div>}
    </div>
  )
}
