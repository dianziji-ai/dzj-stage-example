// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { Profiler } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useStage, useStageActions } from '../../src/react'
import { withSession, frame, setupReactTests } from './helpers'

setupReactTests()

describe('useStage / useStageActions', () => {
  it('选择器：只取好感的组件，AI 写字时不重画；存档变了才画', async () => {
    const { session, sent, wrap } = withSession()
    let renders = 0
    function Love() {
      return <b data-testid="love">{useStage((s: { save: { love: number } }) => s.save.love)}</b>
    }
    render(
      <Profiler id="love" onRender={() => void (renders += 1)}>
        <Love />
      </Profiler>,
      { wrapper: wrap },
    )
    await act(() => session.send('你好'))
    const before = renders
    for (const t of ['她', '她笑', '她笑了']) {
      act(() => sent[0].h.onDelta!(`<narrative>\n${t}`, ''))
      await frame()
    }
    expect(renders).toBe(before)
    act(() => session.setSave({ love: 23 }))
    expect(screen.getByTestId('love').textContent).toBe('23')
  })

  it('不传选择器：拿全部（状态 + 方法），能直接发话', async () => {
    const { sent, wrap } = withSession()
    function All() {
      const g = useStage()
      return (
        <button onClick={() => void g.send('去公园')} data-testid="send">
          {g.snap.card.name}·{g.busy ? '生成中' : '空闲'}
        </button>
      )
    }
    render(<All />, { wrapper: wrap })
    expect(screen.getByTestId('send').textContent).toBe('测试卡·空闲')
    await act(async () => fireEvent.click(screen.getByTestId('send')))
    expect(sent[0].text).toBe('去公园')
    expect(screen.getByTestId('send').textContent).toBe('测试卡·生成中')
  })

  it('useStageActions：方法引用永远不变，状态变了也不重画', async () => {
    const { session, wrap } = withSession()
    const seen: unknown[] = []
    function Actions() {
      seen.push(useStageActions().send)
      return null
    }
    render(<Actions />, { wrapper: wrap })
    await act(() => session.send('你好'))
    act(() => session.setSave({ love: 99 }))
    expect(seen).toHaveLength(1)
  })

  it('不在 StageBoot 里用：给明确的报错', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Bad() {
      useStage()
      return null
    }
    expect(() => render(<Bad />)).toThrow('要在 <StageBoot> 里面用')
    err.mockRestore()
  })
})
