import s from './DiaryButton.module.css'

/** 检定骰子下面的「日志」徽章：点开她电脑里的 log.txt；有没看过的新页＝角上「新」+ 文件轻轻浮动 */
export default function DiaryButton({ unread, onClick }: { unread: boolean; onClick: () => void }) {
  return (
    <button data-no-advance data-sfx="open" onClick={onClick} aria-label={unread ? '她的日志 · 有新的一页' : '她的日志'} title="她的日志" className={`${s.btn} ${unread ? s.unread : ''}`}>
      <span className={s.file} aria-hidden>
        <span className={s.ext}>.txt</span>
      </span>
      {unread && <span className={s.new}>新</span>}
      <span className={s.tag}>日志</span>
    </button>
  )
}
