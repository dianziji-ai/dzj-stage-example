import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Gallery from '../../src/tabs/Gallery'
import { fail, fakeStage, galleryOf, setupPanelTests } from '../helpers'

setupPanelTests()

const many = (n: number) => Array.from({ length: n }, (_, i) => ({ src: `https://cdn/${i}.webp`, thumb: `https://cdn/${i}-t.webp` }))

describe('图册', () => {
  it('打开这一页才请求；书架：预览排第一、开放的有封面、锁着的写还差几轮、没公开的写未公开', async () => {
    const stage = fakeStage()
    render(<Gallery stage={stage} />)
    expect(screen.getByText('读取中…')).toBeTruthy()
    await screen.findByText('已玩 12 轮（这张卡所有会话累计）· 玩到对应轮数解锁相册')
    expect(stage.gallery).toHaveBeenCalledTimes(1)
    const names = [...document.querySelectorAll('.grid > button')].map((b) => b.querySelector('.truncate')?.textContent)
    expect(names).toEqual(['预览', '日常', '告白', '秘密'])
    expect(screen.getByText('再玩 18 轮')).toBeTruthy()
    expect(screen.getByText('作者未公开')).toBeTruthy()
    expect((screen.getByText('告白').closest('button') as HTMLButtonElement).disabled).toBe(true)
  })

  it('点开相册看缩略图，点缩略图看原图，点原图关；返回书架', async () => {
    render(<Gallery stage={fakeStage()} />)
    fireEvent.click(await screen.findByText('日常'))
    const thumbs = document.querySelectorAll('.aspect-square img')
    expect([...thumbs].map((i) => i.getAttribute('src'))).toEqual(['https://cdn/d1-t.webp', 'https://cdn/d2-t.webp'])
    fireEvent.click(thumbs[1].closest('button')!)
    expect(screen.getByLabelText('关闭大图').querySelector('img')?.getAttribute('src')).toBe('https://cdn/d2.webp')
    fireEvent.click(screen.getByLabelText('关闭大图'))
    expect(screen.queryByLabelText('关闭大图')).toBeNull()
    fireEvent.click(screen.getByText('← 图册'))
    expect(screen.getByText('秘密')).toBeTruthy()
  })

  it('图多：每页 24 张，翻页', async () => {
    const stage = fakeStage()
    stage.gallery.mockResolvedValueOnce(galleryOf({ previews: [], packs: [{ name: '大相册', state: 'open', rounds: 0, count: 30, cover: 'c', images: many(30) }] }))
    render(<Gallery stage={stage} />)
    fireEvent.click(await screen.findByText('大相册'))
    expect(document.querySelectorAll('.aspect-square')).toHaveLength(24)
    expect(screen.getByText('1 / 2')).toBeTruthy()
    expect((screen.getByText('上一页') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByText('下一页'))
    expect(document.querySelectorAll('.aspect-square')).toHaveLength(6)
    expect((screen.getByText('下一页') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByText('上一页'))
    expect(screen.getByText('1 / 2')).toBeTruthy()
  })

  it('读失败：给原因 + 再试一次；卡没有图：说一声', async () => {
    const stage = fakeStage()
    stage.gallery.mockRejectedValueOnce(fail('网络连接失败')).mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(galleryOf({ previews: [], packs: [] }))
    render(<Gallery stage={stage} />)
    await screen.findByText('网络连接失败')
    await act(async () => fireEvent.click(screen.getByText('再试一次')))
    await screen.findByText('图册读取失败')
    await act(async () => fireEvent.click(screen.getByText('再试一次')))
    await screen.findByText('这张卡还没有图')
  })

  it('请求回来前关掉：不报错、不改状态', async () => {
    const stage = fakeStage()
    let resolve!: (v: unknown) => void
    stage.gallery.mockReturnValueOnce(new Promise((r) => (resolve = r)))
    const { unmount } = render(<Gallery stage={stage} />)
    unmount()
    await act(async () => resolve(galleryOf()))
  })
})
