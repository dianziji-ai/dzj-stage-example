import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Guide from '../../src/tabs/Guide'
import { fakeStage, snapOf, setupPanelTests } from '../helpers'

setupPanelTests()

describe('指南', () => {
  it('四块：模型 / MOD / 本局 / 改删回溯，各写清楚在网站哪里点', () => {
    render(<Guide stage={fakeStage()} snap={snapOf()} />)
    for (const t of ['换模型、调参数', '挂 MOD', '本局设定与记忆', '改、删、回溯记录']) expect(screen.getByText(t)).toBeTruthy()
    expect(screen.getByText('网站底部工具栏 → 模型')).toBeTruthy()
    expect(screen.getByText('网站底部工具栏 → MOD')).toBeTruthy()
    expect(screen.getByText('网站底部工具栏 → 本局')).toBeTruthy()
    expect(screen.getByText('输入栏右边的齿轮 →「切到对话」，在对话模式里操作')).toBeTruthy()
    for (const k of ['编辑', '重生', '回溯到此处', '删除']) expect(screen.getByText(k)).toBeTruthy()
  })

  it('「切到对话模式」：请网站切过去', () => {
    const stage = fakeStage()
    render(<Guide stage={stage} snap={snapOf()} />)
    fireEvent.click(screen.getByText('切到对话模式'))
    expect(stage.open).toHaveBeenCalledWith('chat')
  })
})
