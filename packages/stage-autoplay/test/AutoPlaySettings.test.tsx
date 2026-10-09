import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AutoPlaySettings from '../src/AutoPlaySettings'
import { createAutoPlayStore } from '../src/store'

describe('AutoPlaySettings', () => {
  it('开关、两条滑杆改 store；预览跟着变', () => {
    const store = createAutoPlayStore(null)
    const { getByRole, getAllByRole, getByText } = render(<AutoPlaySettings store={store} className="y" />)
    fireEvent.click(getByRole('switch'))
    expect(store.get().on).toBe(true)
    const [perChar, pause] = getAllByRole('slider')
    fireEvent.change(perChar, { target: { value: '50' } })
    fireEvent.change(pause, { target: { value: '1000' } })
    expect(store.get()).toMatchObject({ perChar: 50, pause: 1000 })
    getByText('50 毫秒')
    getByText('1.0 秒')
    // 预览那句 30 个字：1000 + 30 × 50 ＝ 2.5 秒
    getByText(/约停 2\.5 秒/)
  })
})
