import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Avatar, CopyButton, Empty, Field, Json, Rows } from '../src/parts'
import { setupPanelTests } from './helpers'

setupPanelTests()

describe('面板小部件', () => {
  it('Json 排版好；Field 标题 + 右侧按钮；Rows 名值表；Empty', () => {
    render(
      <>
        <Field title="存档" action={<button>复制</button>}>
          <Json value={{ a: 1 }} />
        </Field>
        <Rows rows={[['卡', '电子姬'], ['模型', <b key="m">v3</b>]]} />
        <Empty>没有</Empty>
      </>,
    )
    expect(screen.getByText('存档')).toBeTruthy()
    expect(screen.getByRole('button', { name: '复制' })).toBeTruthy()
    expect(screen.getByText(/"a": 1/).textContent).toBe('{\n  "a": 1\n}')
    expect(screen.getByText('卡').nextSibling?.textContent).toBe('电子姬')
    expect(screen.getByText('没有')).toBeTruthy()
  })

  it('Avatar：有图显示图；加载失败 / 没图用名字首字（emoji 名字不切坏）', () => {
    const { container, rerender } = render(<Avatar src="https://x/a.png" name="林川" />)
    fireEvent.error(container.querySelector('img')!)
    expect(container.textContent).toBe('林')
    rerender(<Avatar key="2" src="" name="🐣小鸡" />)
    expect(container.textContent).toBe('🐣')
    rerender(<Avatar key="3" name="" />)
    expect(container.textContent).toBe('?')
  })

  it('CopyButton：复制成功显示已复制；剪贴板被禁（iframe 沙箱）提示手动复制，不报错；2 秒后复原', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<CopyButton text="hello" />)
    await act(async () => fireEvent.click(screen.getByRole('button')))
    expect(writeText).toHaveBeenCalledWith('hello')
    expect(screen.getByRole('button').textContent).toBe('✓ 已复制')
    act(() => void vi.advanceTimersByTime(2000))
    expect(screen.getByRole('button').textContent).toBe('复制')
    await act(async () => fireEvent.click(screen.getByRole('button')))
    expect(screen.getByRole('button').textContent).toBe('复制不了，请手动选中')
  })
})
