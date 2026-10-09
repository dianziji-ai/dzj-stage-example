import type { Voice } from './useVoice'

/**
 * 标题栏的「配音」开关：一眼看得出开没开（★要清楚，不藏进设置里）。
 *   关＝喇叭带斜杠 +「配音」；开＝喇叭 + 主题色；取声音时一圈细环在转；念的时候三道声波在动；出错停下＝红点；
 *   跳过她在念的那句（suspended）＝喇叭半亮 + 一个暂停小记号，点一下接着念。
 * 点一下开 / 关。配色走 CSS 变量（styles.css 顶部），尺寸用 className 调。
 */
export default function VoiceButton({ voice, className = '', label = '配音' }: { voice: Voice; className?: string; label?: string }) {
  const { state, on, toggle } = voice
  const title =
    state === 'halted' ? '配音出错已暂停（点一下重新打开）'
    : state === 'suspended' ? '配音已暂停：你跳过了她在念的那句（点一下接着念）'
    : on ? '配音：开（点一下关）'
    : '配音：关（点一下开，按字数扣能量）'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={state === 'suspended' ? '恢复配音' : on ? '关闭配音' : '开启配音'}
      title={title}
      className={`dzj-vc ${className}`}
      data-state={state}
    >
      <svg className="dzj-vc-icon" viewBox="0 0 16 16" aria-hidden>
        <path className="dzj-vc-spk" d="M2 6h2.6L8 3v10L4.6 10H2z" />
        {on ? (
          <g className="dzj-vc-waves">
            <path d="M10.2 6.2a2.6 2.6 0 0 1 0 3.6" />
            <path d="M11.9 4.6a4.9 4.9 0 0 1 0 6.8" />
          </g>
        ) : (
          <path className="dzj-vc-mute" d="M10.5 5.5l4 5M14.5 5.5l-4 5" />
        )}
      </svg>
      {label && <span className="dzj-vc-label">{label}</span>}
      {state === 'halted' && <span className="dzj-vc-dot" aria-hidden />}
      {state === 'suspended' && <span className="dzj-vc-pause" aria-hidden />}
    </button>
  )
}
