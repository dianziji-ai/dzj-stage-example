/**
 * 8-bit 背景音乐曲谱（电子姬＝电子鸡，复古电子宠物的「哔哔」音色）。
 *
 * 写法：每小节一行字符串，8 格＝8 个八分音符（4/4 拍）。
 *   "E5" 音符（可带 # 升号，如 F#4）· "-" 延长上一个音 · "." 休止
 * 鼓：k 底鼓 · s 军鼓 · h 踩镲 · . 空
 * 每首 8 小节循环。
 */

export type Voice = 'lead' | 'arp' | 'bass'
export type Song = {
  id: SongId
  name: string
  bpm: number
  lead: string[]
  arp: string[]
  bass: string[]
  drums?: string[]
}
export type SongId = 'day' | 'lively' | 'night'

const day: Song = {
  id: 'day',
  name: '小鸡的日常',
  bpm: 104,
  //       C                    Am                   F                    G
  lead: ['E5 . G5 . A5 G5 E5 .', 'C5 . E5 . A5 . G5 .', 'F5 . A5 . C6 . A5 G5', 'G5 - - . D5 . . .',
  //       C                    Am                   Dm  G                C
         'E5 . G5 . C6 . D6 C6', 'B5 A5 . E5 A5 . C6 .', 'A5 . F5 . G5 . B5 .', 'C6 - - - . . . .'],
  arp: ['C4 E4 G4 E4 C4 E4 G4 E4', 'A3 C4 E4 C4 A3 C4 E4 C4', 'F3 A3 C4 A3 F3 A3 C4 A3', 'G3 B3 D4 B3 G3 B3 D4 B3',
        'C4 E4 G4 E4 C4 E4 G4 E4', 'A3 C4 E4 C4 A3 C4 E4 C4', 'D4 F4 A4 F4 G3 B3 D4 B3', 'C4 E4 G4 E4 C4 E4 G4 C5'],
  bass: ['C3 - G2 - C3 - G2 -', 'A2 - E2 - A2 - E2 -', 'F2 - C3 - F2 - C3 -', 'G2 - D3 - G2 - D3 -',
         'C3 - G2 - C3 - G2 -', 'A2 - E2 - A2 - E2 -', 'D3 - A2 - G2 - D3 -', 'C3 - G2 - C3 - . -'],
  drums: ['k . h . k . h .', 'k . h . k . h .', 'k . h . k . h .', 'k . h . k . s s',
          'k . h . k . h .', 'k . h . k . h .', 'k . h . k . h .', 'k . h . k s s s'],
}

const lively: Song = {
  id: 'lively',
  name: '霓虹小跳步',
  bpm: 136,
  //       F                    Dm                   Bb                   C
  lead: ['A5 . C6 A5 F5 . A5 .', 'D6 . C6 A5 F5 . D5 .', 'D5 F5 A#5 . A5 . G5 .', 'G5 . E5 . C5 . . .',
         'A5 C6 F6 . E6 D6 C6 .', 'D6 . A5 . F5 . A5 .', 'A#5 . A5 . G5 . A5 A#5', 'C6 . . . E5 . G5 .'],
  arp: ['F4 A4 C5 A4 F4 A4 C5 A4', 'D4 F4 A4 F4 D4 F4 A4 F4', 'A#3 D4 F4 D4 A#3 D4 F4 D4', 'C4 E4 G4 E4 C4 E4 G4 E4',
        'F4 A4 C5 A4 F4 A4 C5 A4', 'D4 F4 A4 F4 D4 F4 A4 F4', 'A#3 D4 F4 D4 A#3 D4 F4 D4', 'C4 E4 G4 E4 C4 E4 G4 A#4'],
  bass: ['F2 F3 F2 F3 F2 F3 F2 F3', 'D2 D3 D2 D3 D2 D3 D2 D3', 'A#1 A#2 A#1 A#2 A#1 A#2 A#1 A#2', 'C2 C3 C2 C3 C2 C3 C2 C3',
         'F2 F3 F2 F3 F2 F3 F2 F3', 'D2 D3 D2 D3 D2 D3 D2 D3', 'A#1 A#2 A#1 A#2 A#1 A#2 A#1 A#2', 'C2 C3 C2 C3 C2 C3 E2 G2'],
  drums: ['k h s h k h s h', 'k h s h k h s h', 'k h s h k h s h', 'k h s h k s s s',
          'k h s h k h s h', 'k h s h k h s h', 'k h s h k h s h', 'k h s h s s s s'],
}

const night: Song = {
  id: 'night',
  name: '星空下',
  bpm: 72,
  //       Am                   F                    C                    G
  lead: ['E5 - - - C5 - - -', 'A4 - - - C5 - D5 -', 'E5 - - - G5 - - -', 'D5 - - - - - - .',
         'A5 - - - G5 - E5 -', 'F5 - - - E5 - C5 -', 'E5 - - - D5 - C5 -', 'B4 - - - - - - .'],
  arp: ['A3 C4 E4 A4 E4 C4 A3 C4', 'F3 A3 C4 F4 C4 A3 F3 A3', 'C4 E4 G4 C5 G4 E4 C4 E4', 'G3 B3 D4 G4 D4 B3 G3 B3',
        'A3 C4 E4 A4 E4 C4 A3 C4', 'F3 A3 C4 F4 C4 A3 F3 A3', 'C4 E4 G4 C5 G4 E4 C4 E4', 'G3 B3 D4 G4 D4 B3 G3 B3'],
  bass: ['A2 - - - - - - -', 'F2 - - - - - - -', 'C3 - - - - - - -', 'G2 - - - - - - -',
         'A2 - - - - - - -', 'F2 - - - - - - -', 'C3 - - - - - - -', 'G2 - - - - - - -'],
}

export const SONGS: Record<SongId, Song> = { day, lively, night }

/** 哪个地点放哪首 */
export const PLACE_SONG: Record<string, SongId> = { home: 'day', cafe: 'day', park: 'day', street: 'lively', arcade: 'lively', rooftop: 'night' }

/** 音名 → 频率（A4 = 440Hz）；不认识返回 null */
export function noteFreq(n: string): number | null {
  const m = /^([A-G])(#?)(\d)$/.exec(n)
  if (!m) return null
  const semis = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1] as 'C'] + (m[2] ? 1 : 0)
  const midi = (Number(m[3]) + 1) * 12 + semis
  return 440 * 2 ** ((midi - 69) / 12)
}

/** 一小节拆成 8 格 */
export const cells = (bar: string) => bar.trim().split(/\s+/)
