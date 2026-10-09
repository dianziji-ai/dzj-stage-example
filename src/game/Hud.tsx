import { memo, useEffect, useState } from 'react'
import { Icon, type IconName } from '../components/icons'
import { LOGO_URL, placeName, type PlaceId } from './content'

/** dot＝右上角亮小红点（有没看过的新东西，比如更新日志） */
export type HudAction = { icon: IconName; label: string; onClick: () => void; dot?: boolean }

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
 *   电脑（一行）：  [头像 昵称 @用户名·ID] [📍地点 · 第几天 时间] [♥ 好感条 🪙 心情]  ……  [🎵] [地图|图册]
 *
 * 头像点了打开「本局」面板；状态条点了弹状态说明。
 * ★可以收起：︿ 收起后整条只剩左上角她的圆头像（带好感数 / 红点），点头像展开；收起与否记在本机。
 *   收起与否也标在 <html data-hud-folded> 上：顶栏下面那一列（手机抓娃娃小圆钮）跟着挪到顶上。
 * ★改高度要同步 App.tsx 里「顶栏下面」那些东西的 top（手机 60px、电脑 80px）。
 * memo：只收数值，打字时数值没变就不重渲染。
 */
export default memo(function Hud(p: Props) {
  const [folded, setFolded] = useState(readFolded)
  useEffect(() => {
    document.documentElement.setAttribute('data-hud-folded', folded ? '1' : '0')
    writeFolded(folded)
  }, [folded])
  const fold = () => setFolded(true)
  if (folded)
    return (
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 pt-safe px-safe">
        <div className="mx-auto max-w-2xl px-3 pt-2.5 lg:max-w-6xl lg:px-5 lg:pt-4">
          <button onClick={() => setFolded(false)} aria-label="展开顶栏" title="展开顶栏" className="pointer-events-auto relative block animate-fade-in rounded-full active:scale-95">
            <img src={LOGO_URL} alt="" className="size-11 rounded-full bg-white/30 object-cover ring-2 ring-white/80 shadow-[0_6px_18px_rgb(0_0_0/0.35)] lg:size-14" />
            <span className="absolute -right-1.5 -bottom-1 rounded-full bg-pink-500 px-1.5 text-[10px] leading-4 font-bold text-white shadow">♥{p.love}</span>
            {p.actions.some((a) => a.dot) && <Dot />}
          </button>
        </div>
      </div>
    )
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/35 to-transparent pt-safe px-safe">
      <div className="pointer-events-auto mx-auto max-w-2xl px-3 pt-2.5 pb-6 lg:max-w-6xl lg:px-5 lg:pt-4">
        <Mobile {...p} onFold={fold} />
        <Desktop {...p} onFold={fold} />
      </div>
    </div>
  )
})

/**
 * 手机：只有一条 40px 细胶囊——立绘是主角，界面退后，信息点开再看：
 *   [头像  星空天台 · 00:15 ……  ♥ 20  ☰]
 * 头像→本局；♥→状态说明（好感条 / 硬币 / 心情 / 天数都在里面）；☰→菜单（地图 / 图册 / 本局 / 音乐 / 保存）。
 */
function Mobile(p: Props & { onFold: () => void }) {
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
      <button onClick={p.onFold} aria-label="收起顶栏" className="grid size-8 shrink-0 place-items-center rounded-full text-white/70 active:bg-white/15">
        <Icon name="up" className="size-4" />
      </button>
      <button onClick={p.onMore} aria-label="菜单" className="relative grid size-8 shrink-0 place-items-center rounded-full active:bg-white/15">
        <Icon name="menu" className="size-5" />
        {p.actions.some((a) => a.dot) && <Dot />}
      </button>
    </div>
  )
}

/** 电脑：一行，左边三块（我 / 在哪 / 状态）同高，右边音乐 + 入口 */
function Desktop(p: Props & { onFold: () => void }) {
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
          <button key={a.label} onClick={a.onClick} className="relative flex h-full items-center gap-1.5 rounded-xl px-3 text-sm hover:bg-white/15">
            <Icon name={a.icon} className="size-4" />
            {a.label}
            {a.dot && <Dot />}
          </button>
        ))}
      </div>
      <button onClick={p.onFold} aria-label="收起顶栏" title="收起顶栏" className="glass grid w-12 shrink-0 place-items-center rounded-2xl text-white/80 hover:text-white">
        <Icon name="up" className="size-4" />
      </button>
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

/** 小红点：有没看过的新东西 */
export function Dot() {
  return <span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-pink-500 ring-2 ring-white/90" aria-hidden />
}

/** 顶栏收起了没有（本机偏好，读写包 try：隐私模式会抛） */
const FOLD_KEY = 'gal-hud-folded'
function readFolded(): boolean {
  try {
    return localStorage.getItem(FOLD_KEY) === '1'
  } catch {
    return false
  }
}
function writeFolded(v: boolean) {
  try {
    localStorage.setItem(FOLD_KEY, v ? '1' : '0')
  } catch {
    /* 存不了就只管这一次 */
  }
}
