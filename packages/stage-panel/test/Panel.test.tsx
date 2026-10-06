import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Panel from '../src/Panel'
import { fail, fakeStage, snapOf, setupPanelTests } from './helpers'

setupPanelTests()

const open = async (stage = fakeStage(), dev?: boolean) => {
  const onClose = vi.fn()
  render(<Panel stage={stage} dev={dev} title="本局" onClose={onClose} />)
  await screen.findByText('林川', { selector: 'div' })
  return { stage, onClose }
}

describe('面板本体', () => {
  it('打开就读这一局（20 条）；先显示读取中；头部是标题、卡名 · 玩家', async () => {
    const stage = fakeStage()
    render(<Panel stage={stage} title="本局" onClose={() => {}} />)
    expect(screen.getAllByText('读取中…').length).toBeGreaterThan(0)
    expect(await screen.findByText('电子姬的约会 · 林川')).toBeTruthy()
    expect(stage.load).toHaveBeenCalledWith({ limit: 20 })
    expect(screen.getByRole('dialog', { name: '本局' })).toBeTruthy()
  })

  it('六个标签所有人都能看；手机横排 + 电脑竖排两套，点哪个切到哪页', async () => {
    await open()
    const [mobile] = screen.getAllByRole('navigation')
    expect(within(mobile).getAllByRole('button').map((b) => b.textContent)).toEqual(['概览', '初始设定', '历史', '图册', '存档', '分区'])
    for (const [tab, text] of [['初始设定', '填的'], ['历史', /3 条/], ['存档', '保存修改'], ['分区', /4 个分区/], ['图册', /已玩 12 轮/], ['概览', '这一局']] as const) {
      fireEvent.click(within(mobile).getByText(tab))
      expect(within(mobile).getByText(tab).getAttribute('aria-current')).toBe('page')
      expect(await screen.findByText(text)).toBeTruthy()
    }
  })

  it('开发：传 dev 或 token 是开发 token，概览多出 token 细节', async () => {
    await open(fakeStage(), true)
    expect(screen.getByText('token 过期')).toBeTruthy()
    cleanup()
    await open(fakeStage(snapOf({ dev: true })))
    expect(screen.getByText('token 过期')).toBeTruthy()
  })

  it('刷新：再读一次；读的时候按钮显示读取中、不能连点', async () => {
    const { stage } = await open()
    let done!: () => void
    stage.load.mockImplementationOnce(() => new Promise((r) => (done = () => r(snapOf({ card: { id: 'card1', name: '新名字' } })))))
    fireEvent.click(screen.getByRole('button', { name: '刷新' }))
    expect((screen.getByText('读取中…', { selector: 'button' }) as HTMLButtonElement).disabled).toBe(true)
    await act(async () => done())
    expect(screen.getByText('新名字 · 林川')).toBeTruthy()
  })

  it('读失败：给原因 + 再试一次，成功就显示', async () => {
    const stage = fakeStage()
    stage.load.mockRejectedValueOnce(fail('网络连接失败')).mockRejectedValueOnce(new Error('x'))
    render(<Panel stage={stage} title="本局" onClose={() => {}} />)
    await screen.findByText('网络连接失败')
    await act(async () => fireEvent.click(screen.getByText('再试一次')))
    await screen.findByText('读取失败')
    await act(async () => fireEvent.click(screen.getByText('再试一次')))
    expect(await screen.findByText('电子姬的约会 · 林川')).toBeTruthy()
  })

  it('关闭：✕、遮罩、Esc 都行；卸载后 Esc 不再触发', async () => {
    const { onClose } = await open()
    for (const b of screen.getAllByLabelText('关闭')) fireEvent.click(b)
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('在存档页保存成功：面板重新读，看到的就是刚存的', async () => {
    const { stage } = await open()
    fireEvent.click(screen.getAllByText('存档')[0])
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '{"love": 50}' } })
    stage.load.mockResolvedValueOnce(snapOf({ save: { love: 50 } }))
    await act(async () => fireEvent.click(screen.getByText('保存修改')))
    expect(stage.load).toHaveBeenCalledTimes(2)
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('{\n  "love": 50\n}')
  })

  it('没有玩家资料：头部只写卡名', async () => {
    const { container } = render(<Panel stage={fakeStage(snapOf({ user: null }))} title="本局" onClose={() => {}} />)
    await screen.findByText('这一局')
    expect(container.querySelector('header .truncate')?.textContent).toBe('电子姬的约会')
    expect(container.querySelector('header img')).toBeNull()
  })
})
