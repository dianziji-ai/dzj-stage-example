import s from './DiceButton.module.css'

/** 「行动检定」徽章（手机在右侧竖栏、电脑在顶栏下面），点开掷骰面板 */
export default function DiceButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button data-no-advance data-sfx="open" onClick={onClick} disabled={disabled} aria-label="行动检定 · 掷骰" title="行动检定 · 掷骰" className={s.btn}>
      <span className={s.die} aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={s.pip}>
            ♥
          </span>
        ))}
      </span>
      <span className={s.tag}>检定</span>
    </button>
  )
}
