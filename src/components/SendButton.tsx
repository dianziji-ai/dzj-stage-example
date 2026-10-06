import { Icon } from './icons'

export default function SendButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label="发送" className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-white disabled:bg-line disabled:text-muted">
      <Icon name="send" />
    </button>
  )
}
