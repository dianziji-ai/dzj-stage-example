import { useEffect, useRef, useState, type VideoHTMLAttributes } from 'react'

/**
 * 两段式视频：先摆封面 + ▶，玩家点了才播；不自动播、不循环。**舞台里放视频一律用它**。
 *
 * ★为什么（平台线上踩过，很多人反馈「关不掉」）：UC / 夸克 / QQ / 微信 / 各家安卓自带浏览器会「嗅探」页面里的 <video>，
 *   把它拉进自己的原生全屏播放器——网页上的按钮全被盖住；遇上循环播放的永远播不完，玩家被关在里面。
 *   playsInline 这类属性只是「请求」，这些内核不认。所以不跟浏览器抢，而是：
 *   ① 没点播放之前 <video> 身上根本没有 src，浏览器没东西可嗅（封面用图片，别用 <video> 显示第一帧）；
 *   ② 被拉进原生播放器的只可能是玩家自己点开、会播完的一段，原生播放器自带返回 / 关闭；
 *   ③ 播完 / 退出原生全屏 / 出错 / 点了 6 秒还没动 → 一律清掉 src 收场（清源也逼原生播放器关窗），回到封面。
 *
 *   const { ref, playing, play, stop } = useTapVideo(src, (ended) => …)   // 收场时回调：ended＝是不是正常播完（★解构着用：整个对象带着 ref，lint 会把 tv.playing 误判成读 ref）
 *   <video {...TAP_VIDEO_ATTRS} ref={ref} />           // ★常驻挂载，不写 src / autoPlay / loop
 *   <button onClick={() => play()}>▶</button>          // ★必须在点击回调里同步调用：算用户手势，才能带声音起播
 *   playing / stop()
 *
 * ★用它的组件必须在挂载那一刻就渲染出 <video>（事件在挂载时绑一次）：视频是按需出现的，就包一层子组件。
 */
export function useTapVideo(src: string, onStop?: (ended: boolean) => void) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const st = useRef({ on: false, full: false, t0: 0, moved: false })
  const stopRef = useRef(onStop)
  const srcRef = useRef(src)
  useEffect(() => {
    stopRef.current = onStop
    srcRef.current = src
  })

  const finish = (ended: boolean) => {
    const v = ref.current
    if (!st.current.on) return
    st.current.on = false
    st.current.full = false
    if (v) {
      v.pause()
      v.removeAttribute('src')
      v.load()
    }
    setPlaying(false)
    stopRef.current?.(ended)
  }

  /** 只许在点击回调里同步调用 */
  const play = (muted = false) => {
    const v = ref.current
    if (!v || st.current.on || !srcRef.current) return
    Object.assign(st.current, { on: true, t0: Date.now(), moved: false })
    setPlaying(true)
    v.muted = muted
    v.src = srcRef.current
    v.play()?.catch(() => finish(false))
  }

  useEffect(() => {
    const v = ref.current
    if (!v) return
    const onEnded = () => finish(true)
    const onError = () => {
      if (st.current.on && v.getAttribute('src')) finish(false)
    }
    const onEnter = () => (st.current.full = true)
    const onExit = () => {
      if (st.current.on) finish(false)
    }
    const onDocFs = () => {
      const d = document as Document & { webkitFullscreenElement?: Element | null }
      if (document.fullscreenElement || d.webkitFullscreenElement) st.current.full = true
      else if (st.current.full) onExit()
    }
    v.addEventListener('ended', onEnded)
    v.addEventListener('error', onError)
    v.addEventListener('webkitbeginfullscreen', onEnter) // iOS 原生播放器
    v.addEventListener('webkitendfullscreen', onExit)
    v.addEventListener('x5videoenterfullscreen', onEnter) // X5（QQ / 微信）
    v.addEventListener('x5videoexitfullscreen', onExit)
    document.addEventListener('fullscreenchange', onDocFs)
    document.addEventListener('webkitfullscreenchange', onDocFs)
    // 起不来探测：点了 6 秒还停在开头（慢网 / 被拒播 / 被劫持后卡死）就收场。只看「从没动过」，播到一半被暂停不算
    const tick = setInterval(() => {
      const s = st.current
      if (!s.on || s.moved) return
      if (v.currentTime > 0.05) s.moved = true
      else if (Date.now() - s.t0 > 6000) finish(false)
    }, 500)
    return () => {
      clearInterval(tick)
      v.removeEventListener('ended', onEnded)
      v.removeEventListener('error', onError)
      v.removeEventListener('webkitbeginfullscreen', onEnter)
      v.removeEventListener('webkitendfullscreen', onExit)
      v.removeEventListener('x5videoenterfullscreen', onEnter)
      v.removeEventListener('x5videoexitfullscreen', onExit)
      document.removeEventListener('fullscreenchange', onDocFs)
      document.removeEventListener('webkitfullscreenchange', onDocFs)
      // 卸载时一定清源：不然被劫持的原生播放器还挂着一段没人管的片子
      v.pause()
      v.removeAttribute('src')
      v.load()
    }
    // 事件只在挂载时绑一次；finish 读的都是 ref，不会过期
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { ref, playing, play, stop: () => finish(false) }
}

/**
 * 两段式视频的 <video> 属性：就地播放、别被浏览器接管成全屏 / 投屏（各家内核的私有属性）。
 * 只是「请求」，挡不住所有内核——真正兜底的是 useTapVideo 的「点了才有 src、出事就清源」。
 */
export const TAP_VIDEO_ATTRS = {
  playsInline: true,
  disablePictureInPicture: true,
  controlsList: 'nodownload noplaybackrate noremoteplayback',
  'x5-playsinline': 'true', // X5（QQ 浏览器 / 微信）：就地播
  'x5-video-player-fullscreen': 'false', // X5：别接管全屏
  't7-video-player-type': 'inline', // U4（UC / 夸克）
  'webkit-playsinline': 'true', // 老 WebKit
  'x-webkit-airplay': 'deny', // 禁投屏入口
  preload: 'none',
} as VideoHTMLAttributes<HTMLVideoElement>
