import { describe, expect, it } from 'vitest'
import { PLACES } from '../game/content'
import { cells, noteFreq, PLACE_SONG, SONGS } from './songs'

describe('曲谱', () => {
  it('音名换算频率准', () => {
    expect(noteFreq('A4')).toBeCloseTo(440, 5)
    expect(noteFreq('C4')).toBeCloseTo(261.63, 1)
    expect(noteFreq('A#1')).toBeCloseTo(58.27, 1)
    expect(noteFreq('H4')).toBeNull()
    expect(noteFreq('-')).toBeNull()
  })
  for (const song of Object.values(SONGS)) {
    it(`「${song.name}」每小节 8 格、音名都认得、各声部小节数一致`, () => {
      const bars = song.lead.length
      for (const voice of ['lead', 'arp', 'bass'] as const) {
        expect(song[voice]).toHaveLength(bars)
        const all = song[voice].flatMap(cells)
        song[voice].forEach((bar, i) => expect(cells(bar), `${voice} 第 ${i + 1} 小节`).toHaveLength(8))
        expect(all[0], `${voice} 不能以「-」开头`).not.toBe('-')
        for (const c of all) if (c !== '-' && c !== '.') expect(noteFreq(c), `${voice}：${c}`).not.toBeNull()
      }
      if (song.drums) {
        expect(song.drums).toHaveLength(bars)
        for (const bar of song.drums) {
          expect(cells(bar)).toHaveLength(8)
          for (const c of cells(bar)) expect('ksh.').toContain(c)
        }
      }
    })
  }
  it('每个地点都有曲子', () => {
    for (const p of PLACES) expect(SONGS[PLACE_SONG[p.id]]).toBeDefined()
  })
})
