import type { StageClient, StageSnapshot } from '@dianziji/stage/client'
import { muted } from '../ui'

/**
 * 指南：舞台只管「玩」，换模型、挂 MOD、看记忆、改 / 删 / 回溯记录这些都是平台的事，在舞台外面做。
 * 名称照网站上的实际按钮写（StageFab 悬浮齿轮 / PlayDock / DockMenu 输入栏齿轮 / MessageToolbar），改了那边记得同步这里。
 */
const SECTIONS: { title: string; where: string; items: [string, string][] }[] = [
  {
    title: '换模型、调参数',
    where: '网站底部工具栏 → 模型',
    items: [
      ['换模型', '选好后从下一句开始生效，这一局之前的内容不变'],
      ['模型参数', '思考档位、温度等；日常游玩思考保持关闭就好，开得越高越慢越贵'],
    ],
  },
  {
    title: '挂 MOD',
    where: '网站底部工具栏 → MOD',
    items: [
      ['我的 MOD', '给这一局挂上 / 取下文风、规则、世界书条目'],
      ['MOD 工坊', '在 MOD 面板里进工坊，复制别人做好的来用'],
    ],
  },
  {
    title: '本局设定与记忆',
    where: '网站底部工具栏 → 本局',
    items: [
      ['本局设定', '你在这一局里的名字、身份、开局偏好；只影响这一局，不改角色卡'],
      ['本局记忆', '较早的对话会被打包成剧情记忆；可以看、改整理频率和每轮带多少条历史'],
    ],
  },
  {
    title: '改、删、回溯记录',
    where: '输入栏右边的齿轮 →「切到对话」，在对话模式里操作',
    items: [
      ['编辑', 'AI 回复下面的「编辑」：直接改这条回复的原文'],
      ['重生', '这条不满意就重新生成一次（消耗能量）'],
      ['回溯到此处', '保留这条，删掉它之后的所有消息，从这里重新走；不可撤销，已花的能量不退'],
      ['删除', '玩家消息上的删除：剧情回到上一条 AI 回复'],
      ['记忆 / 原文', '看这一轮的剧情账本，或者模型输出的原始文字'],
    ],
  },
]

export default function Guide({ stage }: { stage: StageClient; snap: StageSnapshot }) {
  return (
    <>
      <div className="rounded-2xl border border-sp-line bg-sp-card p-3 text-[13px] leading-relaxed">
        <b className="font-medium">舞台负责玩，平台负责管。</b>
        <span className={muted}>
          {' '}
          换模型、挂 MOD、看记忆、改或删记录，都在舞台外面网站的工具栏里做：点舞台右边缘的齿轮叫出工具栏；改记录要先「切到对话」。改完切回舞台，这一局接着玩，进度不会丢。
        </span>
        <button onClick={() => stage.open('chat')} className="mt-2 block text-sp-accent underline underline-offset-2">
          切到对话模式
        </button>
      </div>
      {SECTIONS.map((s) => (
        <section key={s.title} className="rounded-2xl border border-sp-line p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <h3 className="text-[14px] font-medium">{s.title}</h3>
            <span className="text-[11px] text-sp-accent">{s.where}</span>
          </div>
          <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[12.5px]">
            {s.items.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-medium whitespace-nowrap">{k}</dt>
                <dd className={`${muted} min-w-0`}>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <p className={`${muted} text-[11px]`}>回溯、删除、重新生成之后，切回舞台就是改过的样子，不用刷新。</p>
    </>
  )
}
