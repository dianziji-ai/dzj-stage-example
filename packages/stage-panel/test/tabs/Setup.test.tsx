import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Setup from '../../src/tabs/Setup'
import { snapOf, setupPanelTests } from '../helpers'

setupPanelTests()

describe('初始设定', () => {
  it('玩家看「项目 / 填的」，没填的写「没填」，不显示 key 和原文', () => {
    const { container } = render(<Setup snap={snapOf()} dev={false} />)
    expect(screen.getByText('项目')).toBeTruthy()
    expect(screen.getByText('林川')).toBeTruthy()
    expect(screen.getByText('没填')).toBeTruthy()
    expect(screen.queryByText('key')).toBeNull()
    expect(container.querySelector('pre')).toBeNull()
  })
  it('开发模式：多一列 key + 原文（AI 看到的就是它）', () => {
    render(<Setup snap={snapOf()} dev />)
    expect(screen.getByText('key')).toBeTruthy()
    expect(screen.getByText('call')).toBeTruthy()
    expect(screen.getByText('原文（setup.text）')).toBeTruthy()
    expect(screen.getByText(/称呼：前辈/)).toBeTruthy()
  })
  it('卡没有设定字段：直接给原文；什么都没有：说一声', () => {
    const { rerender } = render(<Setup snap={snapOf({ setup: { text: '随便写的设定', fields: [] } })} dev={false} />)
    expect(screen.getByText('随便写的设定')).toBeTruthy()
    rerender(<Setup snap={snapOf({ setup: { text: '', fields: [] } })} dev={false} />)
    expect(screen.getByText('这一局没有初始设定')).toBeTruthy()
  })
})
