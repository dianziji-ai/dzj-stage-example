// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TAP_VIDEO_ATTRS, useTapVideo } from '../../src/react/useTapVideo'

/* jsdom 不会真的播放：play / pause / load 换成假的，play 返回的 Promise 由用例决定成败 */
let playResult: Promise<void>
beforeEach(() => {
  vi.useFakeTimers()
  playResult = Promise.resolve()
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => playResult)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function Player({ src = 'https://cdn/a.mp4', onStop = () => {} }: { src?: string; onStop?: (ended: boolean) => void }) {
  const { ref, playing, play, stop } = useTapVideo(src, onStop)
  return (
    <>
      <video data-testid="v" {...TAP_VIDEO_ATTRS} ref={ref} />
      <button onClick={() => play()}>播放</button>
      <button onClick={stop}>停</button>
      <i data-testid="s">{playing ? 'playing' : 'idle'}</i>
    </>
  )
}
const video = () => screen.getByTestId('v') as HTMLVideoElement
const state = () => screen.getByTestId('s').textContent

describe('useTapVideo：两段式视频（安卓浏览器关不掉的坑）', () => {
  it('点播放之前 <video> 上没有 src（浏览器没东西可嗅）；防嗅探属性都在、不自动播不循环', () => {
    render(<Player />)
    expect(video().getAttribute('src')).toBeNull()
    expect(video().getAttribute('x5-video-player-fullscreen')).toBe('false')
    expect(video().getAttribute('t7-video-player-type')).toBe('inline')
    expect(video().autoplay).toBe(false)
    expect(video().loop).toBe(false)
    expect(video().getAttribute('preload')).toBe('none')
  })

  it('点了才设 src 起播；播完清源收场（ended=true），回到封面', () => {
    const onStop = vi.fn()
    render(<Player onStop={onStop} />)
    fireEvent.click(screen.getByText('播放'))
    expect(video().getAttribute('src')).toBe('https://cdn/a.mp4')
    expect(state()).toBe('playing')
    act(() => void video().dispatchEvent(new Event('ended')))
    expect(video().getAttribute('src')).toBeNull()
    expect(state()).toBe('idle')
    expect(onStop).toHaveBeenCalledWith(true)
  })

  it('退出原生全屏（iOS / X5）、出错、手动停：都清源收场（ended=false）', () => {
    for (const ev of ['webkitendfullscreen', 'x5videoexitfullscreen', 'error', 'stop']) {
      const onStop = vi.fn()
      const r = render(<Player onStop={onStop} />)
      fireEvent.click(screen.getByText('播放'))
      if (ev === 'stop') fireEvent.click(screen.getByText('停'))
      else act(() => void video().dispatchEvent(new Event(ev)))
      expect(video().getAttribute('src'), ev).toBeNull()
      expect(onStop, ev).toHaveBeenCalledWith(false)
      r.unmount()
    }
  })

  it('点了 6 秒还停在开头（被劫持卡死 / 慢网）：收场，不让玩家对着黑屏', () => {
    const onStop = vi.fn()
    render(<Player onStop={onStop} />)
    fireEvent.click(screen.getByText('播放'))
    act(() => void vi.advanceTimersByTime(5500))
    expect(onStop).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(1000))
    expect(onStop).toHaveBeenCalledWith(false)
    expect(video().getAttribute('src')).toBeNull()
  })

  it('播起来了（时间动过）之后不算卡住：暂停很久也不收场', () => {
    const onStop = vi.fn()
    render(<Player onStop={onStop} />)
    fireEvent.click(screen.getByText('播放'))
    Object.defineProperty(video(), 'currentTime', { value: 1.2, configurable: true })
    act(() => void vi.advanceTimersByTime(20_000))
    expect(onStop).not.toHaveBeenCalled()
  })

  it('浏览器拒绝起播：收场', async () => {
    const onStop = vi.fn()
    playResult = Promise.reject(new Error('NotAllowedError'))
    playResult.catch(() => {})
    render(<Player onStop={onStop} />)
    await act(async () => fireEvent.click(screen.getByText('播放')))
    expect(onStop).toHaveBeenCalledWith(false)
  })

  it('没有地址：点了什么都不做；卸载时清源', () => {
    const onStop = vi.fn()
    const r = render(<Player src="" onStop={onStop} />)
    fireEvent.click(screen.getByText('播放'))
    expect(state()).toBe('idle')
    r.rerender(<Player onStop={onStop} />)
    fireEvent.click(screen.getByText('播放'))
    const v = video()
    r.unmount()
    expect(v.getAttribute('src')).toBeNull()
  })
})
