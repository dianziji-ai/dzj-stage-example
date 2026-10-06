import { describe, expect, it } from 'vitest'
import { GRIP } from './data'
import { CHUTE_X, grab, makePile, pickPlush, REACH, seeded, swingX, target, X_MAX, X_MIN, type Plush } from './logic'

describe('抓娃娃机规则', () => {
  it('稀有度分布大致是 70 / 25 / 5', () => {
    const rng = seeded(42)
    const n = { normal: 0, rare: 0, gold: 0 }
    for (let i = 0; i < 20000; i++) n[pickPlush(rng).rarity]++
    expect(n.normal / 20000).toBeCloseTo(0.7, 1)
    expect(n.rare / 20000).toBeCloseTo(0.25, 1)
    expect(n.gold / 20000).toBeCloseTo(0.05, 1)
  })
  it('娃娃堆都在可抓范围里、不压进出口', () => {
    for (let s = 1; s < 50; s++) {
      for (const p of makePile(seeded(s))) {
        expect(p.x).toBeGreaterThanOrEqual(X_MIN)
        expect(p.x).toBeLessThanOrEqual(X_MAX)
        expect(p.x).toBeGreaterThan(CHUTE_X + 0.1)
      }
    }
  })
  it('夹子摆动不出范围', () => {
    for (let t = 0; t < 10; t += 0.013) {
      const x = swingX(t)
      expect(x).toBeGreaterThanOrEqual(X_MIN - 1e-9)
      expect(x).toBeLessThanOrEqual(X_MAX + 1e-9)
    }
  })
  const one = (rarity: Plush['rarity']): Plush[] => [{ key: 1, id: 'chick', rarity, x: 0.5, y: 0.8, tilt: 0 }]
  it('够不着就是 miss；对准了才可能抓到', () => {
    expect(target(one('normal'), 0.5 + REACH + 0.01)).toBeNull()
    expect(grab(one('normal'), 0.5 + REACH + 0.01, seeded(1)).kind).toBe('miss')
    expect(target(one('normal'), 0.5 + REACH * 0.9)?.key).toBe(1)
  })
  it('越稀有越难抓、越歪越难抓（统计）', () => {
    const rate = (rarity: Plush['rarity'], off: number) => {
      const rng = seeded(7)
      let win = 0
      for (let i = 0; i < 5000; i++) if (grab(one(rarity), 0.5 + off, rng).kind === 'win') win++
      return win / 5000
    }
    expect(rate('normal', 0)).toBeCloseTo(GRIP.normal, 1)
    expect(rate('gold', 0)).toBeLessThan(rate('rare', 0))
    expect(rate('rare', 0)).toBeLessThan(rate('normal', 0))
    expect(rate('normal', REACH * 0.9)).toBeLessThan(rate('normal', 0))
  })
  it('没抓牢的滑落点在提起途中（25%–75%）', () => {
    const rng = seeded(3)
    for (let i = 0; i < 2000; i++) {
      const o = grab(one('gold'), 0.5, rng)
      if (o.kind === 'slip') {
        expect(o.at).toBeGreaterThanOrEqual(0.25)
        expect(o.at).toBeLessThanOrEqual(0.75)
      }
    }
  })
})
