import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Save from '../../src/tabs/Save'
import { fail, fakeStage, snapOf, setupPanelTests } from '../helpers'

setupPanelTests()

const box = () => screen.getByRole('textbox') as HTMLTextAreaElement
const type = (v: string) => fireEvent.change(box(), { target: { value: v } })

describe('存档', () => {
  it('显示排好版的存档；没改不能保存；改了能还原', () => {
    render(<Save stage={fakeStage()} snap={snapOf()} onSaved={() => {}} />)
    expect(box().value).toBe('{\n  "love": 20\n}')
    expect((screen.getByText('保存修改') as HTMLButtonElement).disabled).toBe(true)
    type('{"love": 30}')
    fireEvent.click(screen.getByText('还原'))
    expect(box().value).toBe('{\n  "love": 20\n}')
    expect(screen.queryByText('还原')).toBeNull()
  })

  it('保存：发出去标 source=panel，成功后通知面板重新读', async () => {
    const stage = fakeStage()
    const onSaved = vi.fn()
    render(<Save stage={stage} snap={snapOf()} onSaved={onSaved} />)
    type('{"love": 67}')
    await act(async () => fireEvent.click(screen.getByText('保存修改')))
    expect(stage.save).toHaveBeenCalledWith({ love: 67 }, { source: 'panel' })
    expect(screen.getByText('已保存')).toBeTruthy()
    expect(onSaved).toHaveBeenCalled()
  })

  it('JSON 写错：不发，告诉哪里错；后端校验不过：显示后端的原因', async () => {
    const stage = fakeStage()
    render(<Save stage={stage} snap={snapOf()} onSaved={() => {}} />)
    type('{love: }')
    await act(async () => fireEvent.click(screen.getByText('保存修改')))
    expect(stage.save).not.toHaveBeenCalled()
    expect(screen.getByText(/^JSON 写错了：/)).toBeTruthy()
    stage.save.mockRejectedValueOnce(fail('存档不符合存档结构：love 不能大于 100', 'invalid'))
    type('{"love": 999}')
    await act(async () => fireEvent.click(screen.getByText('保存修改')))
    expect(screen.getByText('存档不符合存档结构：love 不能大于 100')).toBeTruthy()
  })

  it('「填入开局存档」：按存档结构的 default 填好，等玩家确认再存', () => {
    const stage = fakeStage()
    render(<Save stage={stage} snap={snapOf({ save: { love: 3 } })} onSaved={() => {}} />)
    fireEvent.click(screen.getByText('填入开局存档'))
    expect(JSON.parse(box().value)).toEqual({ love: 20 })
    expect(screen.getByText(/已填入开局存档/)).toBeTruthy()
    expect(stage.save).not.toHaveBeenCalled()
  })

  it('存档结构折叠在下面：开局存档 + JSON Schema，都能复制', () => {
    render(<Save stage={fakeStage()} snap={snapOf()} onSaved={() => {}} />)
    expect(screen.getByText('存档结构')).toBeTruthy()
    expect(screen.getByText('开局存档（各字段 default）')).toBeTruthy()
    expect(screen.getAllByText('复制')).toHaveLength(2)
  })

  it('卡没定义存档结构：说一声，不给编辑框', () => {
    render(<Save stage={fakeStage()} snap={snapOf({ save: null, state_schema: null })} onSaved={() => {}} />)
    expect(screen.getByText('这张卡还没定义存档结构，没有存档')).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})
