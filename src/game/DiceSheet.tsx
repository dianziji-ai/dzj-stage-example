import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../components/icons'
import { CHAR_NAME } from './content'
import { ATTRS, diffOfCat, FAIL_HINT, favorBonus, natureOf, outcomeOf, PRESET_CATS, rollD100, searchPresets, targetOf, type Attr, type CheckDraft, type Diff, type Nature, type Outcome, type Preset, type PresetCat } from './dice'
import DiceRoll from './DiceRoll'

const VERDICT: Record<Nature, Record<Outcome, string>> = {
  warm: {
    crit: '正中她的心——她会把这一刻存进 C 盘。',
    success: '她的 CPU 温度明显升高了。',
    fail: '没做成——不扣好感，心意她是收到了的。',
    fumble: '出了个大糗——不扣好感，她大概会笑你一整天。',
  },
  prank: {
    crit: '完美得手！她完全没发现，或者笑得停不下来。',
    success: '得手了，她只是歪了歪头。',
    fail: '被她当场抓包——她鼓起腮帮子了，要扣点好感。',
    fumble: '被抓了个正着，还被她记进了小本本。',
  },
}

/**
 * 行动检定（照《妈妈柳月儿》舞台搬过来）。两步：① 选行动（搜 / 分类 / 现成方案，或自己写）→ ② 掷骰（属性、成功率环、掷）→ 演出 → 演完自动把这句行动连同检定发出去。
 * 难度不让选：现成方案各自带，自己写的按分类定（日常 简单 / 心动 普通 / 恶作剧 普通）——玩家自己挑难度等于都挑简单。
 * 手机一步一屏（左右切换）；电脑左右两栏并排，左边选、右边掷。第三页「怎么玩」讲规则。
 * 每次打开都是空的（输入框里可能是地图「我前往…」这类别的话，不往这里带）。挂到 body 最外层；点遮罩或 ✕ 关（演出中不让关）。
 */
export default function DiceSheet({ favor, onRoll, onClose }: { favor: number; onRoll: (c: CheckDraft) => void; onClose: () => void }) {
  const [tab, setTab] = useState<'roll' | 'rules'>('roll')
  const [step, setStep] = useState<'pick' | 'roll'>('pick')
  const [action, setAction] = useState('')
  const [custom, setCustom] = useState(false)
  const [attr, setAttr] = useState<Attr>('体贴')
  const [diff, setDiff] = useState<Diff>('普通') // 现成方案带的；自己写的在掷之前按分类定
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<PresetCat | null>(null)
  const [pickedCat, setPickedCat] = useState<PresetCat | null>(null) // 现成方案自己的分类（定性质用）
  const [rolled, setRolled] = useState<{ n: number; target: number; shown: boolean } | null>(null)
  const busy = !!rolled && !rolled.shown
  const presets = searchPresets(q, cat)

  const pick = (p: Preset) => {
    setAction(p.text)
    setAttr(p.attr)
    setDiff(p.diff)
    setPickedCat(p.cat)
    setCustom(false)
    setStep('roll')
  }
  const effDiff: Diff = custom ? diffOfCat(cat) : diff
  const nature: Nature = natureOf(custom ? cat : pickedCat)
  const target = targetOf(effDiff, favor)
  // 演完：自动把行动连同检定发出去（Dialogue 那边关面板、发消息）
  useEffect(() => {
    if (!rolled?.shown || !outcome) return
    // 结果先停 1.2 秒让人看清，再自动发出去
    const t = setTimeout(() => onRoll({ action: action.trim(), attr, diff: effDiff, target: rolled.target, roll: rolled.n, nature }), 1200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolled?.shown])
  // 掷之前确认一次：掷完会自动发出去、扣这一轮的能量
  const [confirm, setConfirm] = useState(false)
  const roll = () => {
    if (!action.trim() || rolled) return
    setConfirm(false)
    setRolled({ n: rollD100(), target, shown: false })
  }
  const shown = useCallback(() => setRolled((r) => (r ? { ...r, shown: true } : r)), [])
  const outcome = rolled ? outcomeOf(rolled.n, rolled.target) : null
  const close = () => !busy && onClose()

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 lg:items-center lg:p-6" onClick={close} onContextMenu={(e) => e.stopPropagation()} data-no-advance>
      <div
        onClick={(e) => e.stopPropagation()}
        className="gal-paper flex max-h-[92dvh] w-full max-w-md animate-[sheet-up_0.24s_cubic-bezier(0.2,0.9,0.3,1)] flex-col overflow-hidden rounded-t-[28px] pb-safe shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.4)] lg:h-[40rem] lg:max-w-3xl lg:animate-tip-in lg:rounded-[28px] lg:border-2 lg:border-white"
      >
        {/* 标题栏 */}
        <div className="flex h-14 shrink-0 items-center gap-2 px-4">
          {step === 'roll' && tab === 'roll' && !rolled && (
            <button onClick={() => setStep('pick')} aria-label="换一个行动" className="-ml-1 grid size-9 place-items-center rounded-full text-[#9a7b72] hover:bg-white lg:hidden">
              <Icon name="back" className="size-5" />
            </button>
          )}
          <span className="text-lg">🎲</span>
          <b className="text-[15px] tracking-widest">行动检定</b>
          {tab === 'roll' && !rolled && <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-[#9a7b72] lg:hidden">{step === 'pick' ? '① 选行动' : '② 掷骰'}</span>}
          <span className="flex-1" />
          <button onClick={() => !busy && setTab(tab === 'rules' ? 'roll' : 'rules')} className={`rounded-full px-3 py-1.5 text-[13px] font-bold ${tab === 'rules' ? 'bg-pink-500 text-white' : 'text-pink-500 hover:bg-pink-50'}`}>
            {tab === 'rules' ? '返回' : '怎么玩'}
          </button>
          <button onClick={close} aria-label="关闭" data-sfx="cancel" className="grid size-9 place-items-center rounded-full text-[#9a7b72] hover:bg-white">
            <Icon name="close" className="size-4" />
          </button>
        </div>

        {tab === 'rules' ? (
          <Rules />
        ) : rolled && outcome ? (
          <div className="min-h-0 overflow-y-auto px-5 pt-1 pb-5 text-center">
            <p className="mx-auto max-w-sm text-[15px] leading-snug font-bold">{action}</p>
            <p className="mt-1 text-xs text-[#9a7b72]">
              {attr} · {effDiff} · 成功率 {rolled.target}%
            </p>
            <DiceRoll roll={rolled.n} outcome={outcome} onDone={shown} />
            <Bar target={rolled.target} roll={rolled.shown ? rolled.n : null} />
            <div className={`transition-opacity duration-300 ${rolled.shown ? 'opacity-100' : 'opacity-0'}`}>
              <p className="mt-3 text-sm text-[#9a7b72]">{VERDICT[nature][outcome]}</p>
              <p className="mt-2 text-[12px] text-pink-500">已经连同检定结果发给{CHAR_NAME}了，看她怎么接</p>
            </div>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_19.5rem]">
            {/* ① 选行动 */}
            <div className={`${step === 'pick' ? 'flex' : 'hidden'} min-h-0 flex-col lg:flex lg:border-r lg:border-[#fbe3ea]`}>
              <div className="shrink-0 space-y-2 px-4 pb-2">
                <label className="flex items-center gap-2 rounded-full border border-[#fbe3ea] bg-white px-3.5 py-2 focus-within:border-pink-300">
                  <span className="text-sm text-[#9a7b72]">🔍</span>
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="想做什么？布丁、牵手、抓娃娃…" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#9a7b72] lg:text-sm" />
                  {q && (
                    <button onClick={() => setQ('')} aria-label="清空" className="text-[#9a7b72]">
                      <Icon name="close" className="size-3.5" />
                    </button>
                  )}
                </label>
                <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
                  {[null, ...PRESET_CATS].map((c) => (
                    <button key={c ?? '全部'} onClick={() => setCat(c)} className={`shrink-0 rounded-full px-3.5 py-1 text-[12px] font-bold transition-colors ${cat === c ? 'bg-pink-500 text-white' : 'bg-white text-[#9a7b72] hover:text-pink-500'}`}>
                      {c ?? '全部'}
                    </button>
                  ))}
                </div>
              </div>
              <ul className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                {/* 自己写 */}
                <li className="mb-1.5">
                  {custom ? (
                    <div className="rounded-2xl border border-pink-400 bg-pink-50 p-2.5">
                      <textarea
                        autoFocus
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        rows={2}
                        maxLength={60}
                        placeholder="写下你要做的事，比如：偷偷把她的布丁换成果冻"
                        className="w-full resize-none bg-transparent text-base leading-relaxed outline-none placeholder:text-[#9a7b72] lg:text-sm"
                      />
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[11px] text-[#9a7b72]">{action.length} / 60</span>
                        <button onClick={() => action.trim() && setStep('roll')} disabled={!action.trim()} className="rounded-full bg-pink-500 px-3.5 py-1 text-[12px] font-bold text-white disabled:opacity-40 lg:hidden">
                          下一步 ›
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setCustom(true)} className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-pink-300 px-3 py-2.5 text-left text-[13px] text-pink-500 hover:bg-pink-50">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-pink-50 text-base">✎</span>
                      自己写一个…
                    </button>
                  )}
                </li>
                {presets.length ? (
                  presets.map((p) => <Row key={p.text} p={p} favor={favor} on={!custom && action === p.text} onPick={() => pick(p)} />)
                ) : (
                  <li className="py-6 text-center text-xs text-[#9a7b72]">没搜到合适的，点上面「自己写一个」</li>
                )}
              </ul>
            </div>

            {/* ② 掷骰 */}
            <div className={`${step === 'roll' ? 'flex' : 'hidden'} min-h-0 flex-col overflow-y-auto bg-white/55 px-4 pt-1 pb-4 lg:flex`}>
              {action.trim() ? (
                <>
                  <p className="text-[10.5px] font-bold tracking-[0.25em] text-[#9a7b72]">你要做的事</p>
                  <p className="mt-1 text-[15px] leading-snug font-bold">{action}</p>
                  <button onClick={() => setStep('pick')} className="mt-0.5 self-start text-[11px] text-pink-500 lg:hidden">
                    ‹ 换一个
                  </button>

                  <p className="mt-4 text-[10.5px] font-bold tracking-[0.25em] text-[#9a7b72]">靠什么</p>
                  <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                    {ATTRS.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setAttr(a.id)}
                        aria-pressed={attr === a.id}
                        className={`rounded-xl py-2 text-center text-[13px] font-bold transition-colors ${attr === a.id ? 'bg-pink-500 text-white shadow-md' : 'bg-white text-text hover:bg-pink-50'}`}
                      >
                        <span className="block text-base leading-none">{a.icon}</span>
                        <span className="mt-1 block">{a.id}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-[#9a7b72]">{ATTRS.find((a) => a.id === attr)!.hint}</p>

                  <p className="mt-4 text-[10.5px] font-bold tracking-[0.25em] text-[#9a7b72]">有多难</p>
                  <p className="mt-1 text-[13px]">
                    <b className="text-pink-500">{effDiff}</b>
                    <span className="text-[#9a7b72]">{custom ? `（自己写的按「${cat ?? '心动'}」算）` : '（这件事本来就这么难）'}</span>
                  </p>

                  <p className={`mt-3 rounded-xl px-3 py-2 text-[12px] leading-snug ${nature === 'warm' ? 'bg-emerald-50 text-emerald-700' : 'bg-pink-50 text-pink-600'}`}>
                    {nature === 'warm' ? '♥ ' : '⚠ '}
                    {FAIL_HINT[nature]}
                  </p>

                  <div className="my-4 flex items-center justify-center gap-4">
                    <Ring value={target} />
                    <div className="text-[12px] leading-relaxed text-[#9a7b72]">
                      掷 1～100
                      <br />
                      不超过 <b className="text-pink-500">{target}</b> 就成功
                      {favorBonus(favor) > 0 && (
                        <>
                          <br />
                          <span className="text-amber-600">♥ 好感加成 +{favorBonus(favor)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {confirm ? (
                    <div role="alertdialog" aria-label="确认掷骰" className="mt-auto animate-fade-in rounded-2xl border border-pink-300 bg-white p-3 shadow-lg">
                      <p className="text-[14px] font-bold">掷完会直接发给{CHAR_NAME}</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-[#9a7b72]">结果出来后，这件事连同检定结果会自动作为你这一轮的话发出去，扣这一轮的能量；掷出来的结果不能重掷。</p>
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => setConfirm(false)} className="flex-1 rounded-full bg-white py-2.5 text-[14px] text-[#9a7b72]">
                          再想想
                        </button>
                        <button onClick={roll} className="bg-gradient-to-r from-[#ff5fa2] to-[#ffb44c] text-white shadow-[0_4px_0_#e879a6] active:translate-y-0.5 active:shadow-none flex-[2] rounded-full py-2.5 text-[14px] font-black tracking-widest">
                          🎲 确定，掷！
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setConfirm(true)} className="bg-gradient-to-r from-[#ff5fa2] to-[#ffb44c] text-white shadow-[0_4px_0_#e879a6] active:translate-y-0.5 active:shadow-none mt-auto flex w-full items-center justify-center gap-2 rounded-full py-3 text-base font-black tracking-widest">
                      🎲 掷骰
                    </button>
                  )}
                </>
              ) : (
                <div className="m-auto text-center text-[#9a7b72]">
                  <span className="block text-4xl opacity-40">🎲</span>
                  <p className="mt-2 text-[13px]">左边挑一件事，或自己写一个</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

/** 一条现成方案：图标 · 行动 · 属性/难度 · 成功率 */
function Row({ p, favor, on, onPick }: { p: Preset; favor: number; on: boolean; onPick: () => void }) {
  const t = targetOf(p.diff, favor)
  const locked = p.minFavor !== undefined && favor < p.minFavor
  return (
    <li className="mb-1.5">
      <button onClick={onPick} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${on ? 'bg-pink-50 ring-1 ring-pink-400' : 'bg-white hover:bg-pink-50'}`}>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-lg shadow-sm">{p.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-[13.5px] leading-snug">{p.text}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#9a7b72]">
            {p.attr} · {p.diff}
            <span className={natureOf(p.cat) === 'warm' ? 'text-emerald-600' : 'text-pink-500'}>{natureOf(p.cat) === 'warm' ? '♥ 失败不扣好感' : '😼 失败扣好感'}</span>
            {locked && <span className="rounded bg-pink-50 px-1 text-pink-500">好感 {p.minFavor}+</span>}
          </span>
        </span>
        <b className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] tabular-nums ${t >= 50 ? 'bg-emerald-50 text-emerald-600' : t >= 30 ? 'bg-amber-100 text-amber-600' : 'bg-pink-50 text-pink-500'}`}>{t}%</b>
      </button>
    </li>
  )
}

/** 成功率环 */
function Ring({ value }: { value: number }) {
  const r = 30
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 72 72" className="size-[5.5rem] shrink-0 -rotate-90" aria-label={`成功率 ${value}%`}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="#fbe3ea" strokeWidth="7" />
      <circle cx="36" cy="36" r={r} fill="none" stroke="#ec4899" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(c * value) / 100} ${c}`} className="transition-[stroke-dasharray] duration-500 ease-out" />
      <text x="36" y="40" textAnchor="middle" transform="rotate(90 36 36)" className="fill-pink-500 text-[15px] font-black tabular-nums">
        {value}%
      </text>
    </svg>
  )
}

/** 1～100 的刻度条：成功区（≤ 目标）高亮，点数落下后一根指针停在点数上 */
function Bar({ target, roll }: { target: number; roll: number | null }) {
  return (
    <div className="relative mx-auto mt-1 h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-line">
      <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-300 to-pink-500" style={{ width: `${target}%` }} />
      <div className="absolute inset-y-[-3px] w-1 rounded-full bg-[#4a2f2a] shadow transition-[left,opacity] duration-500 ease-out" style={{ left: `calc(${roll ?? 0}% - 2px)`, opacity: roll === null ? 0 : 1 }} />
    </div>
  )
}

/** 第三页：玩法介绍 */
function Rules() {
  return (
    <div className="min-h-0 overflow-y-auto px-5 pt-1 pb-6 text-[14px] leading-relaxed lg:columns-2 lg:gap-8">
      <Section title="什么时候掷">
        想让一件事<b>更有戏</b>的时候掷：给她买布丁、牵她的手、帮她抓娃娃，或者偷吃她的布丁、藏起她的小鸡帽……
        平常聊天不掷也行，直接说就是。
      </Section>
      <Section title="怎么算成功">
        掷一个 1～100 的数，<b>不超过成功率就成功</b>。
        <span className="mt-1 block rounded-xl bg-white px-3 py-2 text-[13px]">
          成功率 = 难度基础值 + 好感加成
          <br />
          简单 75 · 普通 55 · 困难 35 · 极难 15（难度不用选：现成方案各自带，自己写的按分类定）
          <br />
          好感每 10 点 +3，最低 15%，最高 95%
        </span>
        她越信任你，越容易成。
      </Section>
      <Section title="失败会怎样">
        <span className="block">
          <b className="text-emerald-600">♥ 对她好的事</b>（日常 / 心动）：成功加好感，难度越高加得越多；<b>失败只是没做成，不扣好感</b>。
        </span>
        <span className="mt-1 block">
          <b className="text-pink-600">😼 恶作剧</b>：成功＝她没发现或被逗笑；失败＝被她当场抓包、鼓着腮闹别扭，<b>扣 1～3 点好感</b>。
        </span>
        <span className="block text-[#9a7b72]">自己写的行动按你选的分类算，没选分类就算「对她好」。</span>
      </Section>
      <Section title="属性怎么选">
        <span className="grid grid-cols-2 gap-1 text-[13px]">
          {ATTRS.map((a) => (
            <span key={a.id}>
              {a.icon} <b>{a.id}</b> <span className="text-[#9a7b72]">{a.hint}</span>
            </span>
          ))}
        </span>
        选得贴切，{CHAR_NAME}会照着这个方向演。
      </Section>
      <Section title="掷完之后">
        掷完会自动把这件事连同结果发给{CHAR_NAME}，她按结果演，<b>不会重掷、不会改判</b>。成功不等于为所欲为，失败也有失败的剧情。掷骰点数落在成功率的一成以内是<b>大成功</b>，96 以上是<b>大失败</b>。
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-3 break-inside-avoid">
      <h3 className="mb-1 text-[13px] font-black tracking-widest text-pink-500">{title}</h3>
      <p>{children}</p>
    </section>
  )
}
