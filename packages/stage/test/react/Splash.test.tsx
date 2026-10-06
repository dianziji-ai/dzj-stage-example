// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Splash from '../../src/react/Splash'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/** jsdom 没有 Web Animations：给元素装一个假的 animate，记下每次动画的起止 scaleX */
function fakeAnimations() {
  const calls: { from: string; to: string; duration: number }[] = []
  const anims: { cancel: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; onfinish: (() => void) | null }[] = []
  HTMLElement.prototype.animate = vi.fn(function (frames: Keyframe[], opts?: number | KeyframeAnimationOptions) {
    calls.push({ from: String(frames[0].transform), to: String(frames[1].transform), duration: (opts as KeyframeAnimationOptions).duration as number })
    const a = { cancel: vi.fn(), pause: vi.fn(), onfinish: null as (() => void) | null }
    anims.push(a)
    return a as unknown as Animation
  }) as unknown as HTMLElement['animate']
  HTMLElement.prototype.getAnimations = vi.fn(() => []) as unknown as HTMLElement['getAnimations']
  return { calls, anims }
}

describe('Splash 加载页', () => {
  it('加载中：显示当前步骤，读屏能读到（role=status）', () => {
    render(<Splash step="读取存档…" progress={0.2} />)
    expect(screen.getByRole('status').textContent).toContain('读取存档…')
  })

  it('出错：标题 + 说明 + 重试按钮（点了回调）；没给重试就不显示按钮', () => {
    const retry = vi.fn()
    const { rerender } = render(<Splash step="" progress={0} error={{ title: '网络开小差了', detail: '检查一下网络' }} onRetry={retry} />)
    expect(screen.getByText('网络开小差了')).toBeTruthy()
    fireEvent.click(screen.getByText('重试'))
    expect(retry).toHaveBeenCalled()
    rerender(<Splash step="" progress={0} error={{ title: '进不去', detail: '' }} />)
    expect(screen.queryByText('重试')).toBeNull()
  })

  it('版本号：给了就在底部显示（出错时也显示，方便确认是哪一版出的错）；没给不显示', () => {
    const { rerender } = render(<Splash step="" progress={0.2} version="v0.1.3 · 10-07 14:20" />)
    expect(screen.getByTestId('stage-version').textContent).toBe('v0.1.3 · 10-07 14:20')
    rerender(<Splash step="" progress={0} error={{ title: '进不去', detail: '' }} version="v0.1.3" />)
    expect(screen.getByTestId('stage-version').textContent).toBe('v0.1.3')
    rerender(<Splash step="" progress={0} />)
    expect(screen.queryByTestId('stage-version')).toBeNull()
  })

  it('准备好了：淡出且不挡点击', () => {
    render(<Splash step="准备好啦！" progress={1} leaving />)
    expect(screen.getByRole('status').className).toContain('opacity-0')
    expect(screen.getByRole('status').className).toContain('pointer-events-none')
  })

  it('进度条：先走到这一步，再往剩下的一半慢慢爬；下一步从当前位置接着走；完成走满', () => {
    const { calls, anims } = fakeAnimations()
    const { rerender } = render(<Splash step="" progress={0.4} />)
    expect(calls[0]).toMatchObject({ to: 'scaleX(0.4)', duration: 350 })
    anims[0].onfinish?.() // 走到了：开始慢爬
    expect(calls[1].duration).toBe(8000)
    rerender(<Splash step="" progress={0.9} />)
    expect(anims[1].pause).toHaveBeenCalled() // 上一段慢爬停掉
    expect(calls[2]).toMatchObject({ to: 'scaleX(0.9)' })
    rerender(<Splash step="" progress={0.9} leaving />)
    expect(calls.at(-1)).toMatchObject({ to: 'scaleX(1)', duration: 300 })
  })

  it('没有 Web Animations 的环境：不报错，停在初始宽度', () => {
    // @ts-expect-error 模拟老浏览器
    HTMLElement.prototype.animate = undefined
    expect(() => render(<Splash step="" progress={0.5} />)).not.toThrow()
  })
})
