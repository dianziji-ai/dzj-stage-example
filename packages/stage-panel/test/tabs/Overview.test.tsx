import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Overview from '../../src/tabs/Overview'
import { fakeStage, snapOf, setupPanelTests } from '../helpers'

setupPanelTests()

describe('概览', () => {
  it('玩家卡片 + 卡 / 这一局（链到网站聊天页）/ 模型 / 消耗', () => {
    render(<Overview stage={fakeStage()} snap={snapOf()} dev={false} />)
    expect(screen.getByText('林川')).toBeTruthy()
    expect(screen.getByText('@linchuan · ID 7')).toBeTruthy()
    expect(screen.getByText('电子姬的约会')).toBeTruthy()
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('https://dianziji.ai/chat/card1?s=36933')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(screen.getByText('deepseek-v3.2')).toBeTruthy()
    expect(screen.getByText('最近 1 轮共 ⚡1,200 能量')).toBeTruthy()
    expect(screen.queryByText('线路')).toBeNull() // token 细节只有开发模式有
  })

  it('开发模式：多出 token 过期、线路、网站、图床、分区、存档结构、生成中', () => {
    render(<Overview stage={fakeStage()} snap={snapOf({ streaming: { turn_id: 't9', stream_url: 'u' } })} dev />)
    for (const k of ['卡 id', '完整模型', '线路', 'token 过期', '网站', '图床', '分区', '存档结构', '生成中']) expect(screen.getByText(k)).toBeTruthy()
    expect(screen.getByText(/还剩约 5 小时/)).toBeTruthy()
    expect(screen.getByText('是（t9）')).toBeTruthy()
    expect(screen.getByText('4 个')).toBeTruthy()
  })

  it('没玩家 / token 解析不了 / 过期了 / 没消耗 / 没存档结构：都有兜底文字', () => {
    const { unmount } = render(<Overview stage={fakeStage(snapOf(), null)} snap={snapOf({ user: null, history: [], state_schema: null })} dev />)
    expect(screen.queryByText('林川')).toBeNull()
    expect(screen.getByText('还没有')).toBeTruthy()
    expect(screen.getByText('token 解析不了')).toBeTruthy()
    expect(screen.getByText('没定义（不能存档）')).toBeTruthy()
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3)
    unmount()
    render(<Overview stage={fakeStage(snapOf(), { expiresAt: new Date(Date.now() - 1000) })} snap={snapOf()} dev />)
    expect(screen.getByText(/已过期/)).toBeTruthy()
  })
})
