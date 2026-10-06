import { useCallback, useMemo, useState } from 'react'
import { bgm } from './audio/bgm'
import { PLACE_SONG } from './audio/songs'
import { useBgm, useBgmPrefs } from './audio/useBgm'
import ClawGame from './claw/ClawGame'
import EntryButton from './claw/EntryButton'
import { plushName, type PlushId } from './claw/data'
import { EGGS, placeName, PLACES, spriteUrl, type PlaceId } from './game/content'
import Dialogue from './game/Dialogue'
import Hud, { type HudAction } from './game/Hud'
import { CgViewer, GalleryPage, LogPage, MapPage } from './game/pages'
import VideoViewer from './game/VideoViewer'
import Scene from './game/Scene'
import ThoughtBubble from './game/ThoughtBubble'
import TabBar, { type Tab } from './game/TabBar'
import TipHost from './game/Tip'
import GameMenu from './game/GameMenu'
import { showTip } from './game/tipStore'
import { useGame, useThought } from './game/useGame'
import { useOnline } from './game/useOnline'
import { splitState } from '@dianziji/stage'
import { stage } from './stage'
import { SaveIndicator, StageToaster } from '@dianziji/stage/react'
import { openStagePanel, StagePanel } from '@dianziji/stage-panel'

type PageId = 'play' | 'map' | 'gallery' | 'log' | 'claw'

const TABS: Tab[] = [
  { id: 'play', icon: 'play', label: '游玩' },
  { id: 'map', icon: 'map', label: '地图' },
  { id: 'gallery', icon: 'gallery', label: '图册' },
  { id: 'log', icon: 'log', label: '记录' },
  // 「本局」不是一页：点了打开舞台面板（@dianziji/stage-panel），当前页不变
  { id: 'panel', icon: 'info', label: '本局' },
]

/**
 * 电子姬的同居日常。
 *  · 游玩页全屏：背景 + 立绘 + 对话框 + 状态栏，右上角一个菜单钮（电脑上直接平铺几个入口）。
 *  · 地图 / 图册 / 记录是单独的页面；「本局」打开舞台面板（概览 / 初始设定 / 历史消耗 / 图册 / 存档 / 分区），底部有菜单，点「游玩」回去。
 *  · 切到别的页面时游戏画面只是隐藏（display:none，动画随之暂停），不卸载——生成中的回复照常收。
 */
export default function App() {
  const g = useGame()
  const thought = useThought() // 状态说明里显示（一轮才变一次）
  const [page, setPage] = useState<PageId>('play')
  const [menu, setMenu] = useState(false) // 手机菜单（顶栏 ☰）
  const [view, setView] = useState<number | null>(null) // 图册里点开看的 CG
  const [egg, setEgg] = useState<number | null>(null) // 图册里点开看的彩蛋视频（EGGS 下标）

  // 打开地图并让某个地点跳动高亮（从提示弹窗「去电玩城」过来）；离开地图就清掉
  const [mapFocus, setMapFocus] = useState<PlaceId | null>(null)
  const go = useCallback((p: string) => {
    if (p === 'panel') return openStagePanel()
    if (p !== 'map') setMapFocus(null)
    setPage(p as PageId)
  }, [])

  const openMenu = useCallback(() => setMenu(true), [])
  const closeMenu = useCallback(() => setMenu(false), [])
  /** 地图 / 图册 / 记录左上角的返回：回游玩页 */
  const back = useCallback(() => go('play'), [go])
  const online = useOnline()
  // 左上角的玩家块：站内资料（memo 的 Hud 只在这几个值变了才重渲染）
  const u = g.snap.user
  const hudUser = useMemo(() => (u ? { avatar: u.avatar, name: u.name, username: u.username, id: u.id, onOpen: openStagePanel } : null), [u])

  // 背景音乐：抓娃娃机里放「霓虹小跳步」，其余按地点；🎵 开关记在本机
  useBgm(page === 'claw' ? 'lively' : PLACE_SONG[g.location] ?? 'day')
  const music = useBgmPrefs()
  const toggleMusic = useCallback(() => bgm.setOn(!bgm.prefs.on), [])
  // 电脑顶栏的入口：「本局」不放这里（左上角玩家头像点了就是本局）
  const actions = useMemo<HudAction[]>(() => TABS.filter((t) => t.id !== 'play' && t.id !== 'panel').map((t) => ({ icon: t.icon, label: t.label, onClick: () => go(t.id) })), [go])

  // 记录：每一轮的原文（AI 的完整输出，含分区标签），不做解析
  // 玩家的话去掉附带的 <dj_state> 状态再显示（库里存的是原文）；AI 的原文原样显示
  const log = useMemo(() => g.history.map((m) => ({ id: m.id, role: m.role, text: m.role === 'user' ? splitState(m.content).text : m.content })), [g.history])

  // 抓娃娃机：送娃娃＝扣一只收藏、回游玩页、发给她；离开时选了「告诉她」就把战绩发过去
  // ★先发、发出去了再从收藏里扣：能量不足 / 断网 / 她还在说时 send 返回 false，娃娃留在收藏柜里（错误由对话框讲）
  const giftPlush = async (id: PlushId) => {
    setPage('play')
    if (await g.send(`（把刚抓到的「${plushName(id)}」送给电子姬）`)) {
      g.updateClaw((c) => ({ ...c, collection: { ...c.collection, [id]: Math.max(0, (c.collection[id] ?? 0) - 1) } }))
    }
  }
  const leaveClaw = (report: string | null) => {
    setPage('play')
    if (report) void g.send(report)
  }

  // 抓娃娃机一直显示：不在电玩城就灰着提示怎么去；她在说话时等她说完
  const arcade = PLACES.find((p) => p.id === 'arcade')!
  const clawHint = g.busy ? '等她说完' : g.location === 'arcade' ? null : `先去地图 · ${arcade.name}`

  // 状态说明（点顶栏的好感框）：每一项是什么、怎么获得
  const showStatus = useCallback(
    () =>
      showTip({
        image: spriteUrl(g.expr),
        title: '和电子姬的状态',
        text: thought ? `💭 ${thought}` : undefined,
        rows: [
          { icon: '♥', label: '好感', value: `${g.status.好感} / 100`, desc: '温柔陪伴、认真夸她会涨，敷衍冷落会降（每轮最多 ±5）。越高她越黏人；80 以上，在星空天台说出心意时会解锁告白回忆。' },
          { icon: '🪙', label: '硬币', value: `${g.save.claw.coins} 枚`, desc: `电玩城的小鸡抓抓乐，一局 1 枚。开局送 5 枚；聊天里她想请你玩时会送你硬币（每次最多 3 枚）。` },
          { icon: '😊', label: '心情', value: g.status.心情, desc: '她此刻的心情，跟着剧情变。' },
          { icon: '📅', label: '天数', value: `第 ${g.status.天数} 天`, desc: '一起生活的第几天，过了午夜算新的一天。' },
          { icon: '🖼️', label: '回忆', value: `${g.save.unlockedCg.length} / 8`, desc: '剧情走到特别的时刻会解锁回忆 CG，在「图册」里看。' },
        ],
        dismiss: '好的',
      }),
    [g.status, g.save, g.expr, thought],
  )

  const showMap = (id: PlaceId) => {
    setMapFocus(id)
    go('map')
  }

  // 灰着的抓娃娃机点了：弹提示（能去就给「去地图」按钮）
  const clawLocked = () =>
    showTip(
      g.busy
        ? { icon: '💬', title: '她还在说话呢', text: '等她说完再去玩吧～' }
        : { icon: '🕹️', title: '抓娃娃机在电玩城', text: `先和电子姬一起去${arcade.name}，才能玩小鸡抓抓乐哦！`, action: { label: `去${arcade.name}`, onClick: () => showMap('arcade') } },
    )

  // 收藏柜「去抓娃娃」：人在电玩城就直接进机器；不在就走和灰色入口同一套（提示 + 去电玩城）
  const atArcade = g.location === 'arcade' && !g.busy
  const clawCta = { label: atArcade ? '去抓娃娃' : `去${arcade.name}`, go: atArcade ? () => setPage('claw') : clawLocked }

  // 出发＝替玩家说这一句（地点用玩家名字，和提示词「{{user}}的房间」对上）；地图确认框里引用的也是这一句
  const travelLine = useCallback((id: PlaceId) => `（和电子姬一起去${placeName(id, g.player.name || '主人')}）`, [g.player.name])
  const travel = (id: PlaceId) => {
    go('play') // 走 go：顺手清掉地图的高亮，下次打开地图不会还在跳
    void g.send(travelLine(id))
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-white select-none">
      <div className={page === 'play' ? 'contents' : 'hidden'}>
        <Scene place={g.location} expr={g.expr} talking={g.busy} />
        {/* 心声：她没说出口的那句，写完才浮出来 */}
        <ThoughtBubble />
        <Hud user={hudUser} place={g.location} call={g.player.call} time={g.time} love={g.status.好感} loveTick={g.loveTick} mood={g.status.心情} day={g.status.天数} coins={g.save.claw.coins} onStatus={showStatus} actions={actions} onMore={openMenu} musicOn={music.on} onMusic={toggleMusic} />
        {/* 手机：右侧细竖栏（顶栏下面 10px）——抓娃娃小圆钮 + 存档时才冒的小图标；立绘在中间，右边本来就空 */}
        <div className="pointer-events-none absolute inset-x-0 top-[calc(var(--safe-top)+60px)] z-20 px-safe lg:hidden">
          {/* 和顶栏同一列（平板上不贴屏幕边、角标不被裁），右边缘对齐细胶囊 */}
          <div className="pointer-events-auto mx-auto flex max-w-2xl flex-col items-end gap-2.5 px-3 pt-1 pr-4">
            <EntryButton variant="rail" coins={g.save.claw.coins} hint={clawHint} onOpen={() => setPage('claw')} onLocked={clawLocked} />
            <SaveIndicator quiet className="glass text-white" />
          </div>
        </div>
        {/* 电脑：顶栏下面，左边保存按钮、右边街机招牌（和顶栏同一个布局容器，左右边缘对齐） */}
        <div className="pointer-events-none absolute inset-x-0 top-[calc(var(--safe-top)+80px)] z-20 hidden px-safe lg:block">
          <div className="mx-auto flex max-w-6xl items-start justify-between px-5">
            <span className="pointer-events-auto">
              <SaveIndicator className="glass text-white" />
            </span>
            <span className="pointer-events-auto">
              <EntryButton variant="sign" coins={g.save.claw.coins} hint={clawHint} onOpen={() => setPage('claw')} onLocked={clawLocked} />
            </span>
          </div>
        </div>
        <Dialogue said={g.said} me={g.player.name} busy={g.busy} error={g.error} topupUrl={stage.siteUrl('/recharge')} onSend={g.send} onDismissError={g.dismissError} />
      </div>

      {page === 'claw' && <ClawGame claw={g.save.claw} busy={g.busy} call={g.player.call} onUpdate={g.updateClaw} onGift={giftPlush} onLeave={leaveClaw} />}

      {page !== 'play' && page !== 'claw' && (
        <div className="gal-paper absolute inset-0 flex animate-fade-in flex-col">
          {page === 'map' && <MapPage focus={mapFocus} here={g.location} busy={g.busy} call={g.player.call} line={travelLine} onGo={travel} onBack={back} />}
          {page === 'gallery' && <GalleryPage unlocked={g.save.unlockedCg} url={g.cgUrl} onOpen={setView} onEgg={setEgg} collection={g.save.claw.collection} claw={clawCta} onBack={back} />}
          {page === 'log' && <LogPage items={log} me={g.player.name} avatar={g.player.avatar} hasMore={g.hasOlder} onMore={g.loadOlder} onBack={back} />}
          <TabBar tabs={TABS} active={page} onPick={go} />
        </div>
      )}

      <GameMenu open={menu} onClose={closeMenu} go={go} musicOn={music.on} onMusic={toggleMusic} />
      <TipHost />

      {/* 本局面板：入口是顶栏 / 底部菜单里的「本局」，不要悬浮按钮；本地开发也显示 token 细节 */}
      <StagePanel stage={stage} button={false} dev={import.meta.env.DEV} />
      {/* SDK 的结果自动弹顶部提示（读取 / 存档 / 图册失败、面板改了存档）；发消息出错由对话框里的 ErrorNotice 讲 */}
      <StageToaster />

      {/* 断网提醒（连上自动消失） */}
      {!online && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-safe pt-safe">
          <div className="mt-2 animate-fade-in rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white shadow-lg">📡 网络断开了，连上后再继续</div>
        </div>
      )}

      {/* 新解锁的 CG 自动弹；图册里点开的也用同一个查看器 */}
      {g.cg !== null && <CgViewer key={g.cg} src={g.cgUrl(g.cg)} onClose={g.closeCg} />}
      {view !== null && <CgViewer key={view} src={g.cgUrl(view)} onClose={() => setView(null)} />}
      {egg !== null && EGGS[egg] && <VideoViewer key={egg} clip={EGGS[egg]} onClose={() => setEgg(null)} />}
      {g.film && <VideoViewer clip={g.film} closeLabel="跳过" closeOnEnd onClose={g.closeFilm} />}
    </div>
  )
}
