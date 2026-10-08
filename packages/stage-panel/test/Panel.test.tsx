import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Panel from '../src/Panel'
import { fakeStage, snapOf, setupPanelTests } from './helpers'

setupPanelTests()

const open = (stage = fakeStage(), dev?: boolean) => {
  const onClose = vi.fn()
  render(<Panel stage={stage} dev={dev} title="本局" onClose={onClose} />)
  return { stage, onClose }
}

describe('面板本体', () => {
  it('打开就是此刻的快照（不用读）；头部是标题、卡名 · 玩家', () => {
    open()
    expect(screen.getByText('电子姬的约会 · 林川')).toBeTruthy()
    expect(screen.getByRole('dialog', { name: '本局' })).toBeTruthy()
  })

  it('网站推了新的：面板跟着变', () => {
    const { stage } = open()
    act(() => stage.push({ card: { id: 'card1', name: '新名字' } }))
    expect(screen.getByText('新名字 · 林川')).toBeTruthy()
  })

  it('还没连上网站：说一声，不报错', () => {
    open(fakeStage(null))
    expect(screen.getByText('还没连上网站…')).toBeTruthy()
  })

  it('七个标签所有人都能看；手机横排 + 电脑竖排两套，点哪个切到哪页', async () => {
    open()
    const [mobile] = screen.getAllByRole('navigation')
    expect(within(mobile).getAllByRole('button').map((b) => b.textContent)).toEqual(['概览', '初始设定', '历史', '图册', '存档', '分区', '指南'])
    for (const [tab, text] of [['初始设定', '填的'], ['历史', /3 条/], ['存档', '保存修改'], ['分区', /4 个分区/], ['图册', /已玩 12 轮/], ['指南', '挂 MOD'], ['概览', '这一局']] as const) {
      fireEvent.click(within(mobile).getByText(tab))
      expect(within(mobile).getByText(tab).getAttribute('aria-current')).toBe('page')
      expect(await screen.findByText(text)).toBeTruthy()
    }
  })

  it('开发：传 dev，或网站说这是本地开发（meta.dev），概览多出结构细节', () => {
    const { unmount } = render(<Panel stage={fakeStage()} dev title="本局" onClose={() => {}} />)
    expect(screen.getByText('卡 id')).toBeTruthy()
    unmount()
    open(fakeStage(snapOf({ meta: { model: 'm', channel: 'c', dev: true } })))
    expect(screen.getByText('卡 id')).toBeTruthy()
  })

  it('关闭：✕、遮罩、Esc 都行', () => {
    const { onClose } = open()
    for (const b of screen.getAllByLabelText('关闭')) fireEvent.click(b)
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('在存档页保存成功：看到的就是刚存的；之后网站推来新存档以网站的为准', async () => {
    const { stage } = open()
    fireEvent.click(screen.getAllByText('存档')[0])
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '{"love": 50}' } })
    await act(async () => fireEvent.click(screen.getByText('保存修改')))
    expect(stage.save).toHaveBeenCalledWith({ love: 50 }, { source: 'panel' })
    expect(screen.queryByText('还原')).toBeNull() // 存好的就是现在显示的：没有未保存的改动
    act(() => stage.push({ save: { love: 70 } }))
    expect(screen.getByText('还原')).toBeTruthy() // 输入框里还是玩家的 50，和最新的 70 不同
  })

  it('没有玩家资料：头部只写卡名', () => {
    const { container } = render(<Panel stage={fakeStage(snapOf({ user: null }))} title="本局" onClose={() => {}} />)
    expect(container.querySelector('header .truncate')?.textContent).toBe('电子姬的约会')
    expect(container.querySelector('header img')).toBeNull()
  })
})
