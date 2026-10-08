// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TurnProgress } from '../../src/react'
import { withSession, frame, setupReactTests } from './helpers'

setupReactTests()

describe('TurnProgress：这一轮写到哪儿了', () => {
  it('没在生成不显示；刚发出去「正在想…」；写到哪个区显示哪个；写完收起', async () => {
    const { session, wrap, delta, done } = withSession()
    const { container } = render(<TurnProgress labels={{ action: '准备选项中' }} />, { wrapper: wrap })
    expect(container.textContent).toBe('')
    await act(() => session.send('你好'))
    expect(screen.getByRole('status').textContent).toContain('正在想…')
    act(() => delta('<face>\n表情: happy\n</face>\n<narrative>\n她'))
    await frame()
    expect(screen.getByRole('status').textContent).toContain('正在写 · narrative') // 测试卡的分区没写 label：用区 id
    act(() => delta('<face>\n表情: happy\n</face>\n<narrative>\n她笑了\n</narrative>\n<action>\n- 摸'))
    await frame()
    expect(screen.getByRole('status').textContent).toContain('准备选项中') // 自己的说法
    act(() => done('<narrative>\n好\n</narrative>')) // AI 写完就结束：不管后面还有几个区没写
    expect(container.textContent).toBe('')
  })
})
