import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Overview from '../../src/tabs/Overview'
import { fakeStage, snapOf, setupPanelTests } from '../helpers'

setupPanelTests()

describe('概览', () => {
  it('玩家卡片 + 卡 / 这一局（切到对话模式）/ 模型 / 消耗', () => {
    const stage = fakeStage()
    render(<Overview stage={stage} snap={snapOf()} dev={false} />)
    expect(screen.getByText('林川')).toBeTruthy()
    expect(screen.getByText('@linchuan · ID 7')).toBeTruthy()
    expect(screen.getByText('电子姬的约会')).toBeTruthy()
    fireEvent.click(screen.getByText('切到对话模式看这一局'))
    expect(stage.open).toHaveBeenCalledWith('chat')
    expect(screen.getByText('deepseek-v3.2')).toBeTruthy()
    expect(screen.getByText('最近 1 轮共 ⚡1,200 能量')).toBeTruthy()
    expect(screen.queryByText('线路')).toBeNull() // 结构细节只有开发模式有
  })

  it('开发模式：多出卡 id、线路、网站、图床、分区、存档结构、生成中', () => {
    render(<Overview stage={fakeStage()} snap={snapOf({ live: { said: '你好', text: '', reasoning: '' } })} dev />)
    for (const k of ['卡 id', '完整模型', '线路', '网站', '图床', '分区', '存档结构', '生成中']) expect(screen.getByText(k)).toBeTruthy()
    expect(screen.getByText('是')).toBeTruthy()
    expect(screen.getByText('4 个')).toBeTruthy()
  })

  it('没玩家 / 没模型 / 没消耗 / 没存档结构：都有兜底文字', () => {
    render(<Overview stage={fakeStage()} snap={snapOf({ user: null, history: [], state_schema: null, meta: { model: '', channel: '', dev: true } })} dev />)
    expect(screen.queryByText('林川')).toBeNull()
    expect(screen.getByText('还没有')).toBeTruthy()
    expect(screen.getByText('没定义（不能存档）')).toBeTruthy()
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3)
  })
})
