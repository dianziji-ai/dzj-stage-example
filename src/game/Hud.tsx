import { memo, useState } from 'react'
import { Icon, type IconName } from '../components/icons'
import { placeName, type PlaceId } from './content'

export type HudAction = { icon: IconName; label: string; onClick: () => void }

type Props = {
  /** 玩家站内资料（拆成原始值传，memo 才比得动）；没有＝不显示头像 */
  user: { avatar: string; name: string; username: string; id: number; onOpen: () => void } | null
  place: PlaceId
  /** 她对你的称呼（地点名「主人的房间」跟着换） */
  call: string
  time: string
  love: number
  /** 好感刚变了多少：n 每次结算 +1，用作 key 让飘字重新播一次 */
  loveTick: { delta: number; n: number }
  mood: string
  day: number
  /** 抓娃娃硬币 */
  coins: number
  /** 点状态条：弹「这些是什么、怎么获得」 */
  onStatus: () => void
  actions: HudAction[]
  onMore: () => void
  /** 背景音乐开没开（🎵 按钮） */
  musicOn: boolean
  onMusic: () => void
}

/**
 * 顶部状态栏（液态玻璃，见 index.css 的 glass）。手机和电脑是两套独立布局，不硬塞一行：
 *
 *   手机（一条细胶囊）：[头像  地点 · 第几天 时间 ……  ♥ 82  ☰]   ← 音乐 / 保存 / 地图等收进菜单
 *   电脑（一行）：  [头像 昵称 @用户名·ID] [📍地点 · 第几天 时间] [♥ 好感条 🪙 心情]  ……  [🎵] [地图|图册|记录]
 *
 * 头像点了打开「本局」面板；状态条点了弹状态说明。
 * ★改高度要同步 App.tsx 里「顶栏下面」那些东西的 top（手机 60px、电脑 80px）。
 * memo：只收数值，打字时数值没变就不重渲染。
 */
export default memo(function Hud(p: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/35 to-transparent pt-safe px-safe">
      <div className="pointer-events-auto mx-auto max-w-2xl px-3 pt-2.5 pb-6 lg:max-w-6xl lg:px-5 lg:pt-4">
        <Mobile {...p} />
        <Desktop {...p} />
      </div>
    </div>
  )
})

/**
 * 手机：只有一条 40px 细胶囊——立绘是主角，界面退后，信息点开再看：
 *   [头像  星空天台 · 00:15 ……  ♥ 20  ☰]
 * 头像→本局；♥→状态说明（好感条 / 硬币 / 心情 / 天数都在里面）；☰→菜单（地图 / 图册 / 记录 / 音乐 / 保存）。
 */
function Mobile(p: Props) {
  return (
    <div className="glass flex h-10 items-center gap-2 rounded-full pr-1 pl-1 lg:hidden">
      {p.user ? <AvatarButton {...p.user} /> : <span className="w-2" />}
      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
        {placeName(p.place, p.call)}
        <span className="font-normal text-white/70">
          {' · '}第 {p.day} 天{p.time ? ` ${p.time.replace(/^周.\s*/, '')}` : ''}
        </span>
      </span>
      <button onClick={p.onStatus} aria-label={`状态：好感 ${p.love}，硬币 ${p.coins}，心情 ${p.mood}`} className="flex h-8 shrink-0 items-center rounded-full bg-white/12 px-2.5 text-[13px] active:bg-white/20">
        <Love love={p.love} tick={p.loveTick} />
      </button>
      <button onClick={p.onMore} aria-label="菜单" className="grid size-8 shrink-0 place-items-center rounded-full active:bg-white/15">
        <Icon name="menu" className="size-5" />
      </button>
    </div>
  )
}

/** 电脑：一行，左边三块（我 / 在哪 / 状态）同高，右边音乐 + 入口 */
function Desktop(p: Props) {
  return (
    <div className="hidden h-14 items-stretch gap-3 lg:flex">
      {p.user && (
        <button onClick={p.user.onOpen} aria-label={`${p.user.name || p.user.username}（打开本局）`} className="glass flex shrink-0 items-center gap-2.5 rounded-2xl pr-4 pl-2">
          <Avatar src={p.user.avatar} name={p.user.name || p.user.username} className="size-10" />
          <span className="min-w-0 text-left">
            <span className="block max-w-40 truncate text-[15px] leading-tight font-semibold">{p.user.name || p.user.username}</span>
            <span className="block max-w-40 truncate text-xs leading-tight text-white/75">
              @{p.user.username} · ID {p.user.id}
            </span>
          </span>
        </button>
      )}
      <div className="glass flex max-w-72 min-w-0 shrink items-center rounded-2xl px-4">
        <Where place={p.place} call={p.call} day={p.day} time={p.time} large />
      </div>
      <button onClick={p.onStatus} aria-label={`状态：好感 ${p.love}，硬币 ${p.coins}，心情 ${p.mood}`} className="glass flex w-80 shrink-0 flex-col justify-center gap-1.5 rounded-2xl px-4 text-left text-sm">
        <span className="flex items-center gap-3">
          <Love love={p.love} tick={p.loveTick} />
          <span className="font-semibold">🪙 {p.coins}</span>
          {p.mood && <span className="ml-auto min-w-0 truncate text-white/85">{p.mood}</span>}
        </span>
        <Meter love={p.love} className="h-2" />
      </button>
      <span className="flex-1" />
      <MusicButton on={p.musicOn} onClick={p.onMusic} className="w-14" />
      <div className="glass flex shrink-0 items-center rounded-2xl p-1.5">
        {p.actions.map((a) => (
          <button key={a.label} onClick={a.onClick} className="flex h-full items-center gap-1.5 rounded-xl px-3 text-sm hover:bg-white/15">
            <Icon name={a.icon} className="size-4" />
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** 地点 + 第几天·时间（两行；长地名截断） */
function Where({ place, call, day, time, large = false }: { place: PlaceId; call: string; day: number; time: string; large?: boolean }) {
  return (
    <div className="min-w-0">
      <div className={`truncate leading-tight font-semibold ${large ? 'text-[15px]' : 'text-sm'}`}>📍 {placeName(place, call)}</div>
      <div className={`truncate leading-tight text-white/75 ${large ? 'text-xs' : 'text-[11px]'}`}>
        第 {day} 天{time ? ` · ${time}` : ''}
      </div>
    </div>
  )
}

/** ♥ 好感数值 + 刚变了多少的飘字 */
function Love({ love, tick }: { love: number; tick: { delta: number; n: number } }) {
  return (
    <span className="relative shrink-0 font-semibold">
      <span className="text-pink-300">♥</span> {love}
      {tick.n > 0 && tick.delta !== 0 && (
        <span key={tick.n} className={`absolute -top-1 left-full ml-1 animate-float-up font-bold ${tick.delta > 0 ? 'text-pink-300' : 'text-sky-300'}`}>
          {tick.delta > 0 ? `+${tick.delta}` : tick.delta}
        </span>
      )}
    </span>
  )
}

/** 好感进度条：scaleX 动画（不触发排版）；上半一道白色高光像玻璃管 */
function Meter({ love, className }: { love: number; className: string }) {
  return (
    <span className={`relative block overflow-hidden rounded-full bg-white/20 ${className}`}>
      <span className="block h-full origin-left rounded-full bg-gradient-to-r from-pink-300 via-pink-400 to-rose-500 transition-transform duration-700" style={{ transform: `scaleX(${love / 100})` }} />
      <span className="absolute inset-x-0 top-0 h-1/2 rounded-full bg-white/30" />
    </span>
  )
}

function MusicButton({ on, onClick, className }: { on: boolean; onClick: () => void; className: string }) {
  return (
    <button onClick={onClick} aria-label={on ? '关掉音乐' : '打开音乐'} aria-pressed={on} className={`glass grid shrink-0 place-items-center rounded-2xl text-base ${on ? '' : 'opacity-60'} ${className}`}>
      {on ? '🎵' : '🔇'}
    </button>
  )
}

/** 手机：只有头像的圆钮（点了打开「本局」） */
function AvatarButton({ avatar, name, username, onOpen }: { avatar: string; name: string; username: string; onOpen: () => void }) {
  const shown = name || username
  return (
    <button onClick={onOpen} aria-label={`${shown}（打开本局）`} className="shrink-0 rounded-full active:scale-95">
      <Avatar src={avatar} name={shown} className="size-8" />
    </button>
  )
}

/** 头像：加载失败 / 没设头像时用昵称首字 */
function Avatar({ src, name, className }: { src: string; name: string; className: string }) {
  const [broken, setBroken] = useState(false)
  return src && !broken ? (
    <img src={src} alt="" decoding="async" onError={() => setBroken(true)} className={`rounded-full bg-white/30 object-cover ring-2 ring-white/70 ${className}`} />
  ) : (
    <span className={`grid place-items-center rounded-full bg-gradient-to-br from-amber-200 to-pink-300 text-sm font-bold text-white ring-2 ring-white/70 ${className}`}>{[...(name || '?')][0]}</span>
  )
}
