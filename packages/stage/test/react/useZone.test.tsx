// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import { Profiler } from 'react'
import { describe, expect, it } from 'vitest'
import { useWritingZone, useZone, useZoneData, useZoneList, useZoneText } from '../../src/react'
import { withSession, frame, setupReactTests } from './helpers'

setupReactTests()

describe('按区订阅：只有变了的区才重画', () => {
  it('AI 写正文时：订阅正文的组件跟着变，订阅表情的组件一次都不画', async () => {
    const { session, sent, wrap } = withSession()
    // 用 React 官方的 Profiler 数每块真正提交了几次渲染
    const renders = { face: 0, body: 0 }
    const count = (id: string) => () => void (renders[id as 'face' | 'body'] += 1)
    function Face() {
      const z = useZone('face', { hold: true, complete: true })
      return <i data-testid="face">{z?.type === 'data' ? String((z.value as Record<string, unknown>)['表情']) : '-'}</i>
    }
    function Body() {
      const z = useZone('narrative')
      return <p data-testid="body">{z?.type === 'narrative' ? z.value : ''}</p>
    }
    render(
      <>
        <Profiler id="face" onRender={count('face')}>
          <Face />
        </Profiler>
        <Profiler id="body" onRender={count('body')}>
          <Body />
        </Profiler>
      </>,
      { wrapper: wrap },
    )
    expect(screen.getByTestId('face').textContent).toBe('normal')

    await act(() => session.send('你好'))
    const h = sent[0].h
    act(() => h.onDelta!('<face>\n表情: happy\n</face>\n<narrative>\n她', ''))
    await frame()
    expect(screen.getByTestId('face').textContent).toBe('happy')
    const faceAfter = renders.face
    const bodyAfter = renders.body

    for (const t of ['她笑', '她笑了', '她笑了。']) {
      act(() => h.onDelta!(`<face>\n表情: happy\n</face>\n<narrative>\n${t}`, ''))
      await frame()
    }
    expect(screen.getByTestId('body').textContent).toContain('她笑了。')
    expect(renders.body).toBeGreaterThan(bodyAfter) // 正文在变：它重画
    expect(renders.face).toBe(faceAfter) // 表情没变：一次都没画
  })

  it('表情写到一半（complete）：先保持上一次的，写完才换', async () => {
    const { session, sent, wrap } = withSession()
    function Face() {
      const z = useZone('face', { hold: true, complete: true })
      return <i data-testid="face">{z?.type === 'data' ? String((z.value as Record<string, unknown>)['表情']) : '-'}</i>
    }
    render(<Face />, { wrapper: wrap })
    await act(() => session.send('你好'))
    act(() => sent[0].h.onDelta!('<face>\n表情: hap', ''))
    await frame()
    expect(screen.getByTestId('face').textContent).toBe('normal') // 半截不给，hold 上一次的
    act(() => sent[0].h.onDelta!('<face>\n表情: happy\n</face>', ''))
    await frame()
    expect(screen.getByTestId('face').textContent).toBe('happy')
  })

  it('正在写哪个区：跟着流变，写完回到 null', async () => {
    const { session, sent, wrap } = withSession()
    function Writing() {
      return <i data-testid="w">{useWritingZone() ?? 'none'}</i>
    }
    render(<Writing />, { wrapper: wrap })
    await act(() => session.send('你好'))
    act(() => sent[0].h.onDelta!('<face>\n</face>\n<narrative>\n她', ''))
    await frame()
    expect(screen.getByTestId('w').textContent).toBe('narrative')
    act(() => sent[0].h.onDone!('<narrative>\n好\n</narrative>'))
    expect(screen.getByTestId('w').textContent).toBe('none')
  })

  it('没写过的数据区：useZoneData 给同一个空对象（不会让组件白重画）', () => {
    const { wrap } = withSession()
    const seen: unknown[] = []
    function C() {
      seen.push(useZoneData('status'))
      return null
    }
    const r = render(<C />, { wrapper: wrap })
    r.rerender(<C />)
    expect(seen[0]).toEqual({})
    expect(seen[0]).toBe(seen[1])
  })

  it('useZoneText：数据区取一行 / 文字区取原文；没有＝空字符串', () => {
    const { wrap } = withSession()
    function T() {
      return (
        <>
          <i data-testid="face">{useZoneText('face', '表情')}</i>
          <i data-testid="body">{useZoneText('narrative')}</i>
          <i data-testid="none">[{useZoneText('status', '心情')}]</i>
        </>
      )
    }
    render(<T />, { wrapper: wrap })
    expect(screen.getByTestId('face').textContent).toBe('normal')
    expect(screen.getByTestId('body').textContent).toBe('开场')
    expect(screen.getByTestId('none').textContent).toBe('[]')
  })

  it('useZoneList：选项一条一条；还没写到＝同一个空数组', async () => {
    const { session, sent, wrap } = withSession()
    const seen: string[][] = []
    function L() {
      const list = useZoneList('action')
      seen.push(list)
      return <i data-testid="l">{list.join('|')}</i>
    }
    const r = render(<L />, { wrapper: wrap })
    r.rerender(<L />)
    expect(seen[0]).toEqual([])
    expect(seen[0]).toBe(seen[1])
    await act(() => session.send('你好'))
    act(() => sent[0].h.onDone!('<narrative>\n好\n</narrative>\n<action>\n- 摸摸头\n- 去公园\n</action>'))
    expect(screen.getByTestId('l').textContent).toBe('摸摸头|去公园')
  })
})
