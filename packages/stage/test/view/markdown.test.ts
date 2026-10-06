import { describe, expect, it } from 'vitest'
import { hideOpenMarks, renderMarkdown } from '../../src/view/markdown'

describe('renderMarkdown', () => {
  it('安全：HTML 转义成文字、危险链接清空', () => {
    expect(renderMarkdown('<script>alert(1)</script>')).not.toContain('<script')
    expect(renderMarkdown('<img src=x onerror=alert(1)>')).not.toContain('<img')
    expect(renderMarkdown('[点我](javascript:alert(1))')).not.toContain('javascript:')
  })
  it('加粗 / 斜体 / 引用 / 列表', () => {
    const h = renderMarkdown('**加粗** *斜体*\n\n> 引用\n\n- 一\n- 二')
    expect(h).toContain('<strong>加粗</strong>')
    expect(h).toContain('<em>斜体</em>')
    expect(h).toContain('<blockquote>')
    expect(h).toContain('<li>一</li>')
  })
  it('对白上色；没闭合的「 也先上色；不碰标签里面', () => {
    expect(renderMarkdown('她说「你好」然后走了')).toBe('<p>她说<span class="quote">「你好」</span>然后走了</p>')
    expect(renderMarkdown('她说「你好')).toBe('<p>她说<span class="quote">「你好</span></p>')
    expect(renderMarkdown('**「加粗的对白」**')).toBe('<p><strong><span class="quote">「加粗的对白」</span></strong></p>')
  })
  it('段内单换行保留（交给 pre-line）；块之间不留换行（不然多出空行）', () => {
    expect(renderMarkdown('第一行\n第二行')).toBe('<p>第一行\n第二行</p>')
    expect(renderMarkdown('一段\n\n二段')).toBe('<p>一段</p><p>二段</p>')
  })
  it('空内容', () => expect(renderMarkdown('  \n ')).toBe(''))
})

describe('hideOpenMarks：打字到一半的标记先藏起来', () => {
  it('没闭合的 ** 拿掉；闭合了不动', () => {
    expect(hideOpenMarks('她**害')).toBe('她害')
    expect(hideOpenMarks('她**害羞**了')).toBe('她**害羞**了')
    expect(hideOpenMarks('**a** 和 **b')).toBe('**a** 和 b')
  })
  it('没闭合的 * 拿掉；不把 ** 当成两个 *', () => {
    expect(hideOpenMarks('轻轻*地')).toBe('轻轻地')
    expect(hideOpenMarks('*轻轻*地**')).toBe('*轻轻*地')
    expect(hideOpenMarks('**粗** *斜')).toBe('**粗** 斜')
  })
  it('渲染效果：打一半看不到星号', () => {
    expect(renderMarkdown(hideOpenMarks('她**害'))).not.toContain('*')
  })
})
