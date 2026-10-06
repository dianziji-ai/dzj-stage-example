// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StageError } from '../../src/index'
import { StageBoot, useStage } from '../../src/react'
import { fakeStage, snapOf, setupReactTests } from './helpers'

setupReactTests()

describe('StageBoot：启动外壳', () => {
  beforeEach(() => vi.useRealTimers())

  it('读好这一局才挂 App；App 里 useStage 一定有值', async () => {
    const { stage } = fakeStage(snapOf())
    function App() {
      return <h1>{useStage().snap.card.name}</h1>
    }
    render(
      <StageBoot stage={stage}>
        <App />
      </StageBoot>,
    )
    expect(screen.queryByRole('heading')).toBeNull() // 加载页先出来
    await waitFor(() => expect(screen.getByRole('heading').textContent).toBe('测试卡'), { timeout: 3000 })
  })

  it('自动接收平台推的安全区：作者不用自己调 watchViewport，pt-safe 就有值', async () => {
    const parent = { postMessage: vi.fn() } as unknown as Window
    vi.spyOn(window, 'parent', 'get').mockReturnValue(parent)
    const { stage } = fakeStage(snapOf())
    const r = render(<StageBoot stage={stage}>{null}</StageBoot>)
    expect(parent.postMessage).toHaveBeenCalledWith({ type: 'stage:hello' }, '*')
    const e = new MessageEvent('message', { data: { type: 'stage:viewport', safe: { top: 59, bottom: 34 } } })
    Object.defineProperty(e, 'source', { value: parent })
    window.dispatchEvent(e)
    expect(document.documentElement.style.getPropertyValue('--safe-top')).toBe('59px')
    r.unmount()
    vi.restoreAllMocks()
    document.documentElement.removeAttribute('style')
  })

  it('version 传给加载页显示', () => {
    const { stage } = fakeStage(snapOf())
    render(
      <StageBoot stage={stage} version="v1.2.3">
        <h1>进来了</h1>
      </StageBoot>,
    )
    expect(screen.getByTestId('stage-version').textContent).toBe('v1.2.3')
  })

  it('读失败：给人话 + 重试，重试成功就进去', async () => {
    const { stage } = fakeStage(snapOf())
    const load = stage.load as ReturnType<typeof vi.fn>
    load.mockRejectedValueOnce(new StageError('network', '网络连接失败'))
    render(
      <StageBoot stage={stage}>
        <h1>进来了</h1>
      </StageBoot>,
    )
    await waitFor(() => expect(screen.getByText('网络开小差了')).toBeTruthy())
    fireEvent.click(screen.getByText('重试'))
    await waitFor(() => expect(screen.getByRole('heading').textContent).toBe('进来了'), { timeout: 3000 })
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('游戏规则传进去：onTurn 在 AI 写完时结算', async () => {
    const { stage, sent } = fakeStage(snapOf())
    function App() {
      const g = useStage<{ love: number }>()
      return (
        <button data-testid="b" onClick={() => void g.send('夸她')}>
          {g.save.love}
        </button>
      )
    }
    render(
      <StageBoot stage={stage} onTurn={({ save }: { save: { love: number } }) => ({ love: save.love + 3 })}>
        <App />
      </StageBoot>,
    )
    await waitFor(() => expect(screen.getByTestId('b').textContent).toBe('20'), { timeout: 3000 })
    await act(async () => fireEvent.click(screen.getByTestId('b')))
    act(() => sent[0].h.onDone!('<narrative>\n好呀\n</narrative>'))
    expect(screen.getByTestId('b').textContent).toBe('23')
  })

  it('首屏素材：读好这一局后按它预加载，进度显示「加载素材 n/总数」', async () => {
    const decoded: string[] = []
    vi.stubGlobal('Image', class {
      src = ''
      decoding = ''
      decode() {
        decoded.push(this.src)
        return Promise.resolve()
      }
    })
    const { stage } = fakeStage(snapOf())
    const preload = vi.fn((s: { card: { id: string } }) => [`/bg/${s.card.id}.webp`, '/sprite.webp'])
    render(
      <StageBoot stage={stage} preload={preload}>
        <h1>进来了</h1>
      </StageBoot>,
    )
    await waitFor(() => expect(screen.getByRole('heading')).toBeTruthy(), { timeout: 3000 })
    expect(decoded).toEqual(['/bg/c.webp', '/sprite.webp'])
    vi.unstubAllGlobals()
  })

  it('出错说人话：token 失效 / 维护 / 其他', async () => {
    const cases: [StageError | Error, string, string][] = [
      [new StageError('unauthorized', 'x', 401), '进不去这一局', 'token 无效或过期了'], // 测试跑的是开发模式：提示回网站重新生成
      [new StageError('maintenance', '十点恢复'), '正在维护', '十点恢复'],
      [new StageError('error', '服务器炸了'), '加载失败', '服务器炸了'],
      [new Error(''), '加载失败', '出了点问题'],
    ]
    for (const [err, title, detail] of cases) {
      const { stage } = fakeStage(snapOf())
      ;(stage.load as ReturnType<typeof vi.fn>).mockRejectedValueOnce(err)
      const r = render(<StageBoot stage={stage}>{null}</StageBoot>)
      await waitFor(() => expect(screen.getByText(title)).toBeTruthy())
      expect(screen.getByRole('status').textContent).toContain(detail)
      r.unmount()
    }
  })
})
