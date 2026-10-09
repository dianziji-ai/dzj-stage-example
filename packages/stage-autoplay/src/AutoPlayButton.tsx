import type { AutoPlayState } from './useAutoPlay'

/**
 * 自动播放开关：默认低调——和标题栏里别的小按钮一个样子，没有边框、没有底色。
 *   关着＝淡淡的 ▶ +「自动」；开着＝图标变主题色、字变亮、❚❚。
 *   倒计时＝「自动」下面一道发丝线从左往右长出来（CSS 动画 scaleX，时长＝这一句要等的毫秒，key 换就从头长），长满就翻下一句。
 *   传了 onSettings：旁边一个淡淡的「调节」小图标，点开舞台自己的设置浮层。
 * 图标都是 SVG（文字 ▶ / ❚❚ 小字号会糊成方块）；不加光晕阴影。配色走 CSS 变量（styles.css 顶部）；想要更显眼的样子舞台自己加样式。
 */
export default function AutoPlayButton({ state, className = '', label = '自动', onSettings, settingsOpen = false }: {
  state: AutoPlayState
  className?: string
  label?: string
  /** 点「调节」那一格（不传就没有这一格） */
  onSettings?: () => void
  settingsOpen?: boolean
}) {
  const { on, toggle, running, duration, cycle } = state
  return (
    <span className={`dzj-ap ${className}`} data-on={on ? '' : undefined} data-running={running ? '' : undefined}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        aria-label={on ? '关闭自动播放' : '开启自动播放'}
        title={on ? '自动播放：开（点一下关）' : '自动播放：关（点一下开）'}
        className="dzj-ap-toggle"
      >
        <svg className="dzj-ap-icon" viewBox="0 0 10 10" aria-hidden>
          {on ? <path d="M2.2 1.6h1.9v6.8H2.2zM5.9 1.6h1.9v6.8H5.9z" /> : <path d="M2.6 1.3 8.6 5 2.6 8.7z" />}
        </svg>
        {label && <span className="dzj-ap-label">{label}</span>}
        {running && <span key={cycle} className="dzj-ap-fill" style={{ animationDuration: `${duration}ms` }} aria-hidden />}
      </button>
      {onSettings && (
        <button type="button" onClick={onSettings} aria-label="自动播放设置" aria-expanded={settingsOpen} title="自动播放设置" className="dzj-ap-more">
          <svg className="dzj-ap-icon" viewBox="0 0 10 10" aria-hidden>
            <path d="M1 2.5h8M1 7.5h8" />
            <circle cx="3.5" cy="2.5" r="1.1" />
            <circle cx="6.5" cy="7.5" r="1.1" />
          </svg>
        </button>
      )}
    </span>
  )
}
