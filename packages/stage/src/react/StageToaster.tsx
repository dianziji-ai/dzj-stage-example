import { useContext, useEffect, useSyncExternalStore } from 'react'
import type { StageClient, StageOp } from '..'
import { SessionCtx } from './context'
import { dismissToast, toast, toastStore } from './toast'

/** 默认替哪些操作弹失败提示：发消息 / 停止 / 重生的失败游戏一般自己在对话框里讲，不重复 */
const DEFAULT_OPS: StageOp[] = ['older', 'save', 'gallery', 'turn']

/**
 * SDK 的结果自动变成顶部提示：App 里放一个就行，不用知道游戏界面长什么样。
  *   <StageToaster />                                       读更早的 / 存档 / 图册失败、游戏规则（onTurn）出错 + 玩家在本局面板改了存档（StageBoot 里面不用传 stage）
 *   <StageToaster stage={stage} ops={['send','stop','regenerate','older','save','gallery','open','turn']} />   全部失败都提示
 * 自己也能弹：toast('抓到啦！', 'ok')。
 * 位置：顶部居中（让刘海），手机电脑一样；只动 transform / opacity。
 */
export default function StageToaster({ stage: own, ops = DEFAULT_OPS }: { stage?: StageClient; ops?: StageOp[] }) {
  const session = useContext(SessionCtx)
  const stage = own ?? session?.stage
  if (!stage) throw new Error('StageToaster 要在 <StageBoot> 里面用，或者传 stage')
  const items = useSyncExternalStore(toastStore.subscribe, toastStore.get)
  const key = ops.join(',')

  useEffect(
    () =>
      stage.on((e) => {
        if (e.type === 'error' && key.split(',').includes(e.op)) toast(e.error.message, 'error')
        else if (e.type === 'save' && e.source === 'panel') toast('存档已更新', 'ok')
      }),
    [stage, key],
  )

  if (!items.length) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-[calc(var(--safe-top,env(safe-area-inset-top))+12px)]" aria-live="polite">
      {items.map((t) => (
        <button
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className="pointer-events-auto flex max-w-[min(92vw,420px)] animate-[toast-in_0.22s_ease-out] items-center gap-2 rounded-full border border-sp-line bg-sp-card px-4 py-2 text-left text-[13px] leading-snug text-sp-text shadow-[0_8px_24px_-6px_rgb(0_0_0/0.35)]"
        >
          <span className={t.kind === 'error' ? 'text-sp-danger' : t.kind === 'ok' ? 'text-sp-ok' : 'text-sp-accent'}>{t.kind === 'error' ? '⚠' : t.kind === 'ok' ? '✓' : 'ℹ'}</span>
          <span className="min-w-0 [overflow-wrap:anywhere]">{t.text}</span>
        </button>
      ))}
    </div>
  )
}
