// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useTurnCursor, useZoneText } from '../../src/react'
import { msg, snapOf, withSession, setupReactTests } from './helpers'

setupReactTests()

/** 翻页按钮 + 一行状态：正文|回看?|往前几轮|那一轮玩家说的|能往前|能往后 */
function View() {
  const c = useTurnCursor()
  const body = useZoneText('narrative')
  return (
    <>
      <p data-testid="v">
        {body}|{c.viewing ? 'viewing' : 'latest'}|{c.back}|{c.said}|{String(c.canPrev)}|{String(c.canNext)}
      </p>
      <button onClick={() => void c.prev()}>prev</button>
      <button onClick={c.next}>next</button>
      <button onClick={c.latest}>latest</button>
    </>
  )
}
const text = () => screen.getByTestId('v').textContent
const click = async (name: string) => {
  await act(async () => {
    fireEvent.click(screen.getByText(name))
  })
}

describe('useTurnCursor：上一轮 / 下一轮', () => {
  it('翻页时按区订阅的组件跟着倒回；到最新回到平时；生成中不能翻', async () => {
    const { session, wrap } = withSession(
      snapOf({
        history: [
          msg(1, 'assistant', '<face>\n表情: normal\n</face>\n<narrative>\n开场\n</narrative>'),
          msg(2, 'user', '你好'),
          msg(3, 'assistant', '<narrative>\n第二轮\n</narrative>'),
        ],
      }),
    )
    render(<View />, { wrapper: wrap })
    expect(text()).toBe('第二轮|latest|0||true|false')

    await click('prev')
    expect(text()).toBe('开场|viewing|1||false|true')

    await click('next')
    expect(text()).toBe('第二轮|latest|0||true|false')

    await click('prev')
    await click('latest')
    expect(text()).toBe('第二轮|latest|0||true|false')

    await act(() => session.send('再说'))
    expect(text()).toContain('|false|false') // 生成中：两边都不能翻
  })

  it('回看那一轮之前玩家说的话', async () => {
    const { wrap } = withSession(
      snapOf({ history: [msg(1, 'assistant', '<narrative>\n开场\n</narrative>'), msg(2, 'user', '摸摸头'), msg(3, 'assistant', '<narrative>\nB\n</narrative>'), msg(4, 'user', '再来'), msg(5, 'assistant', '<narrative>\nC\n</narrative>')] }),
    )
    render(<View />, { wrapper: wrap })
    await click('prev')
    expect(text()).toBe('B|viewing|1|摸摸头|true|true')
  })
})
