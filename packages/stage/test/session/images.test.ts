import { describe, expect, it } from 'vitest'
import { imageRefs, imageUrl, resolveImages, stripImages } from '../../src/session/images'
import { readZones } from '../../src/session/zones'

const snap = { image_pack: { groups: [], images: [{ n: 1, src: 'https://cdn/1.webp' }, { n: 3, src: 'https://cdn/3.webp' }] } }

describe('配图编号 helper', () => {
  it('imageRefs：原文里引用了哪些编号，按出现顺序去重；外链图不算', () => {
    expect(imageRefs('![](3) 文字 ![说明](1)\n![]( 3 ) ![](https://x/a.webp)')).toEqual([3, 1])
    expect(imageRefs('没有图')).toEqual([])
  })

  it('imageUrl：数字、\'3\'、\'![](3)\' 都行；不是整数 / 配图库里没有 / 没配图库＝null', () => {
    expect(imageUrl(snap, 3)).toBe('https://cdn/3.webp')
    expect(imageUrl(snap, '3')).toBe('https://cdn/3.webp')
    expect(imageUrl(snap, ' 1\n')).toBe('https://cdn/1.webp') // 分区里写的数字带换行
    expect(imageUrl(snap, '![](3)')).toBe('https://cdn/3.webp') // 分区里写的是图片写法
    expect(imageUrl(snap, '\n![回忆]( 1 )\n')).toBe('https://cdn/1.webp')
    expect(imageUrl(snap, '![](3) ![](1)')).toBeNull() // 不止一张：用 imageRefs 拆开再一张张取
    expect(imageUrl(snap, 2)).toBeNull()
    expect(imageUrl(snap, '3张')).toBeNull()
    expect(imageUrl(snap, 1.5)).toBeNull()
    expect(imageUrl(snap, '')).toBeNull()
    expect(imageUrl(snap, null)).toBeNull()
    expect(imageUrl({ image_pack: null }, 1)).toBeNull()
  })

  it('resolveImages：编号换成地址（说明保留）；配图库里没有的删掉；外链图不动', () => {
    expect(resolveImages('看 ![花](3) 和 ![](2) 还有 ![](https://x/a.webp)', snap)).toBe('看 ![花](https://cdn/3.webp) 和  还有 ![](https://x/a.webp)')
  })

  it('stripImages：编号图全删；独占一行的连这一行一起删，不留空行；外链图不动', () => {
    expect(stripImages('她笑了。\n![](3)\n「主人……」')).toBe('她笑了。\n「主人……」')
    expect(stripImages('行内 ![](1) 也删')).toBe('行内  也删')
    expect(stripImages('![](https://x/a.webp)')).toBe('![](https://x/a.webp)')
  })

  it('readZones 不碰编号：原样留在分区里', () => {
    const z = readZones('<narrative>\n她笑了。\n![](3)\n</narrative>', { slots: [{ zone: 'narrative', kind: 'markdown' }] })
    expect(z.narrative?.value).toBe('她笑了。\n![](3)')
  })
})
