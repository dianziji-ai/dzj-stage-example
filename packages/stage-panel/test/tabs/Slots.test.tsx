import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Slots from '../../src/tabs/Slots'
import { msg, snapOf, setupPanelTests } from '../helpers'

setupPanelTests()

describe('分区', () => {
  it('一区一张卡：名字、区 id、类型；收起时看最近一轮写了什么；停用的标出来', () => {
    render(<Slots snap={snapOf()} />)
    expect(screen.getByText('4 个分区 · 最近一轮写了 1 个 · 舞台里用')).toBeTruthy()
    expect(screen.getByText('face')).toBeTruthy()
    expect(screen.getByText('yaml')).toBeTruthy()
    expect(screen.getAllByText('嗯？')).toHaveLength(2) // 最近一轮（最后一条 AI 回复）的正文：收起那行 + 展开后的值
    expect(screen.getAllByText('最近一轮没写')).toHaveLength(3)
    expect(screen.getByText('停用')).toBeTruthy()
  })

  it('展开：最近一轮的值、AI 写法、说明、其他字段', () => {
    const snap = snapOf({ history: [msg(1, 'assistant', '<face>\n表情: happy\n</face>\n<narrative>\n她笑了。\n</narrative>\n<action>\n- 摸头\n- 走\n</action>')] })
    render(<Slots snap={snap} />)
    expect(screen.getByText('表情 happy')).toBeTruthy() // 数据区压成「键 值」
    expect(screen.getByText('摸头 / 走')).toBeTruthy() // 选项用 / 连
    expect(screen.getByText('AI 写法（schema）')).toBeTruthy()
    expect(screen.getByText('每轮写')).toBeTruthy()
    expect(screen.getByText('其他字段')).toBeTruthy()
  })

  it('原始 JSON 开关；没有 AI 回复时一个区都没写', () => {
    render(<Slots snap={snapOf({ history: [] })} />)
    expect(screen.getByText(/最近一轮写了 0 个/)).toBeTruthy()
    fireEvent.click(screen.getByText('原始 JSON'))
    expect(screen.getByText(/"zone": "face"/)).toBeTruthy()
    fireEvent.click(screen.getByText('卡片'))
    expect(screen.getByText('face')).toBeTruthy()
  })
})
