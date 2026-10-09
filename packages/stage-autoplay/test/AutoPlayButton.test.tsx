import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AutoPlayButton from '../src/AutoPlayButton'
import type { AutoPlayState } from '../src/useAutoPlay'

const state = (s: Partial<AutoPlayState> = {}): AutoPlayState => ({ on: false, toggle: vi.fn(), running: false, duration: 1400, cycle: 'a', ...s })

describe('AutoPlayButton', () => {
  it('关着：没有倒计时底色、没有「调节」格；点一下调 toggle', () => {
    const st = state()
    const { getByRole, container, queryByRole } = render(<AutoPlayButton state={st} />)
    const b = getByRole('button', { name: '开启自动播放' })
    expect(b.getAttribute('aria-pressed')).toBe('false')
    expect(container.querySelector('.dzj-ap-fill')).toBeNull()
    expect(queryByRole('button', { name: '自动播放设置' })).toBeNull()
    fireEvent.click(b)
    expect(st.toggle).toHaveBeenCalled()
  })
  it('开着在计时：底色填满的时长＝这一句要等的毫秒；「调节」格点了调 onSettings', () => {
    const onSettings = vi.fn()
    const { getByRole, container } = render(<AutoPlayButton state={state({ on: true, running: true })} label="" className="x" onSettings={onSettings} settingsOpen />)
    getByRole('button', { name: '关闭自动播放' })
    const cap = container.querySelector('.dzj-ap')!
    expect(cap.className).toContain('x')
    expect(cap.hasAttribute('data-running')).toBe(true)
    expect((container.querySelector('.dzj-ap-fill') as HTMLElement).style.animationDuration).toBe('1400ms')
    const more = getByRole('button', { name: '自动播放设置' })
    expect(more.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(more)
    expect(onSettings).toHaveBeenCalled()
  })
})
