import { describe, expect, it } from 'vitest'
import { createBus, render, type SfxName } from '../src/synth'

/** 能记账的假 AudioContext：每个节点 / 参数都有，用来确认九个声音都合成得出来、不调不存在的方法 */
function fakeCtx() {
  const made: string[] = []
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} })
  const node = (kind: string) => {
    made.push(kind)
    return { gain: param(), frequency: param(), Q: param(), type: '', buffer: null as unknown, connect(n: unknown) { return n }, start() {}, stop() {} }
  }
  const ctx = {
    sampleRate: 8000,
    currentTime: 0,
    destination: {},
    createGain: () => node('gain'),
    createOscillator: () => node('osc'),
    createBiquadFilter: () => node('filter'),
    createConvolver: () => node('verb'),
    createBufferSource: () => node('src'),
    createBuffer: (ch: number, len: number) => ({ getChannelData: () => new Float32Array(len), numberOfChannels: ch }),
  }
  return { ctx: ctx as unknown as AudioContext, made }
}

describe('synth', () => {
  it('九个声音都合成得出来', () => {
    const { ctx, made } = fakeCtx()
    const bus = createBus(ctx)
    const names: SfxName[] = ['hover', 'click', 'confirm', 'cancel', 'open', 'on', 'off', 'page', 'error']
    for (const n of names) expect(() => render(bus, n)).not.toThrow()
    expect(made.filter((k) => k === 'osc').length).toBeGreaterThan(10)
    expect(made).toContain('verb')
  })
})
