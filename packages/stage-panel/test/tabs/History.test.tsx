import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import History from '../../src/tabs/History'
import { fail, fakeStage, msg, snapOf, spend, setupPanelTests } from '../helpers'

setupPanelTests()

describe('历史', () => {
  it('每条：谁说的、字数、本轮消耗（模型短名）、原文；合计能量', () => {
    render(<History stage={fakeStage()} snap={snapOf()} dev={false} />)
    expect(screen.getByText('3 条 · 这些回复共 ⚡1,200 能量')).toBeTruthy()
    expect(screen.getByText('开场')).toBeTruthy()
    expect(screen.getByText('你')).toBeTruthy()
    expect(screen.getByText('AI')).toBeTruthy()
    expect(screen.getByText('⚡1,200 · deepseek-v3.2')).toBeTruthy()
    // 展开后的明细：输入 / 输出 token 和各花多少
    expect(screen.getByText('5.8k token · ⚡400')).toBeTruthy()
    expect(screen.getByText('800 token · ⚡800')).toBeTruthy()
    expect(screen.queryByText(/#3 · /)).toBeNull() // 消息 id 只有开发模式显示
  })

  it('断流（扣了费、只写了半截）/ 失败（没扣费）分开标；老消息没有输入明细写 —', () => {
    const old = { ...spend, in_tokens: null, in_cost: null, out_cost: null, model: null, channel: null }
    const snap = snapOf({ history: [msg(5, 'assistant', '半截', { status: 'error', spend: old }), msg(6, 'assistant', '', { status: 'error' })] })
    render(<History stage={fakeStage()} snap={snap} dev />)
    expect(screen.getByText('断流')).toBeTruthy()
    expect(screen.getByText('失败')).toBeTruthy()
    expect(screen.getByText('#5 · 2 字')).toBeTruthy()
    expect(screen.getByText('800 token')).toBeTruthy()
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3)
  })

  it('往前翻：拼在前面、去重、更早没有了按钮消失', async () => {
    const stage = fakeStage()
    stage.load.mockResolvedValueOnce(snapOf({ history: [msg(0, 'user', '更早的一句'), msg(1, 'assistant', '重复的')], has_more: false }))
    const { container } = render(<History stage={stage} snap={snapOf({ has_more: true })} dev={false} />)
    expect(screen.getByText(/更早还有/)).toBeTruthy()
    await act(async () => fireEvent.click(screen.getByText('↑ 更早的 20 条')))
    expect(stage.load).toHaveBeenCalledWith({ before: 1, limit: 20 })
    expect(container.querySelectorAll('details')).toHaveLength(4)
    expect(container.querySelector('pre')?.textContent).toBe('更早的一句')
    expect(screen.queryByText('↑ 更早的 20 条')).toBeNull()
  })

  it('往前翻失败：给原因，按钮还在可以再点', async () => {
    const stage = fakeStage()
    stage.load.mockRejectedValueOnce(fail('网络连接失败')).mockRejectedValueOnce(new Error('x'))
    render(<History stage={stage} snap={snapOf({ has_more: true })} dev={false} />)
    await act(async () => fireEvent.click(screen.getByText('↑ 更早的 20 条')))
    expect(screen.getByText('网络连接失败')).toBeTruthy()
    await act(async () => fireEvent.click(screen.getByText('↑ 更早的 20 条')))
    expect(screen.getByText('加载失败，再试一次')).toBeTruthy()
  })

  it('一条都没有：不请求更早的', async () => {
    const stage = fakeStage()
    render(<History stage={stage} snap={snapOf({ history: [], has_more: true })} dev={false} />)
    await act(async () => fireEvent.click(screen.getByText('↑ 更早的 20 条')))
    expect(stage.load).not.toHaveBeenCalled()
  })
})
