import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSettingsStore } from '@dianziji/stage-settings'
import { resetForTest, setStore, sfx } from '../src/engine'
import * as synth from '../src/synth'

afterEach(() => {
  resetForTest()
  vi.restoreAllMocks()
  delete (window as { AudioContext?: unknown }).AudioContext
})

/** 假的 AudioContext：只要建得出来就行（声音怎么合成不在这里测） */
function fakeAudio() {
  ;(window as { AudioContext?: unknown }).AudioContext = class {
    state = 'running'
    currentTime = 0
    resume = () => Promise.resolve()
  }
  vi.spyOn(synth, 'createBus').mockImplementation((ctx) => ({ ctx, input: { gain: { value: 0 } } as unknown as GainNode }))
  return vi.spyOn(synth, 'render').mockImplementation(() => {})
}

describe('sfx', () => {
  it('浏览器没有 AudioContext：安静不响、不报错', () => {
    expect(() => sfx('click')).not.toThrow()
  })
  it('开着就响；关了 / 音量 0 不响', () => {
    const render = fakeAudio()
    const store = createSettingsStore(null)
    setStore(store)
    sfx('click')
    expect(render).toHaveBeenCalledTimes(1)
    store.set({ sfx: { on: false } })
    sfx('confirm')
    store.set({ sfx: { on: true, volume: 0 } })
    sfx('confirm')
    expect(render).toHaveBeenCalledTimes(1)
  })
  it('悬停有限流：划过一排按钮不会连响', () => {
    const render = fakeAudio()
    setStore(createSettingsStore(null))
    sfx('hover')
    sfx('hover')
    sfx('hover')
    expect(render).toHaveBeenCalledTimes(1)
  })
})
