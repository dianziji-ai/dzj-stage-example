import { lazy, Suspense } from 'react'
import type { StageClient } from '@dianziji/stage/client'
import { closeStagePanel, openStagePanel, useStagePanelOpen } from './store'

// 面板本体第一次打开才下载：游戏首屏只多一颗按钮
const load = () => import('./Panel')
const Panel = lazy(load)

/**
 * 舞台面板：每个舞台都带。
 *
 *   <StagePanel stage={stage} />                              右下角一颗「本局」按钮
 *   <StagePanel stage={stage} button={false} />               不要按钮，在自己的菜单里调 openStagePanel()
 *   <StagePanel stage={stage} dev={import.meta.env.DEV} />    强制显示开发信息（在网站「本地开发」里打开时不用传，自动显示）
 *
 * 所有人都能看全部内容（概览 / 初始设定 / 历史消耗 / 图册 / 存档 / 存档结构 / 分区）；
 * 存档玩家可以自己改（后端按存档结构校验；改了会经 stage.on 广播 { type: 'save', source: 'panel' }，游戏订阅它更新界面）；dev 为 true 或网站说这是本地开发（meta.dev）时，概览多出结构细节。
 */
export default function StagePanel({ stage, dev, button = true, title = '本局', buttonClassName = 'right-3 bottom-3' }: {
  stage: StageClient
  /** 强制显示开发信息（一般传 import.meta.env.DEV）；不传就看快照的 meta.dev */
  dev?: boolean
  /** 要不要那颗悬浮按钮；false＝自己放入口，调 openStagePanel() */
  button?: boolean
  /** 面板标题 / 按钮文字 */
  title?: string
  /** 悬浮按钮的位置（Tailwind 类名，默认右下角；会自动加上安全区） */
  buttonClassName?: string
}) {
  const open = useStagePanelOpen()
  return (
    <>
      {button && !open && (
        <div className="pointer-events-none fixed inset-0 z-[89] pt-[var(--safe-top,env(safe-area-inset-top))] pr-[var(--safe-right,env(safe-area-inset-right))] pb-[var(--safe-bottom,env(safe-area-inset-bottom))] pl-[var(--safe-left,env(safe-area-inset-left))]">
          <div className="relative size-full">
            <button
              onClick={openStagePanel}
              onPointerEnter={() => void load()} // 指上去就开始下载，点开时基本已经到了
              className={`pointer-events-auto absolute flex items-center gap-1.5 rounded-full border border-sp-line bg-sp-card px-3.5 py-2 text-xs font-medium text-sp-text shadow-lg ${buttonClassName}`}
            >
              <span className="size-1.5 rounded-full bg-sp-accent" />
              {title}
            </button>
          </div>
        </div>
      )}
      {open && (
        <Suspense fallback={null}>
          <Panel stage={stage} dev={dev} title={title} onClose={closeStagePanel} />
        </Suspense>
      )}
    </>
  )
}
