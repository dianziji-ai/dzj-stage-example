// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useSaveStatus } from '../../src/react'
import { withSession, setupReactTests } from './helpers'

setupReactTests()

describe('useSaveStatus', () => {
  it('跟着存档器变：saving → saved；失败 error', async () => {
    const { session, failSaves } = withSession()
    function S() {
      return <i data-testid="s">{useSaveStatus(session.saver).state}</i>
    }
    render(<S />)
    await act(async () => session.setSave({ love: 2 }, { now: true }))
    expect(screen.getByTestId('s').textContent).toBe('saved')
    failSaves(true)
    await act(async () => session.setSave({ love: 3 }, { now: true }))
    expect(screen.getByTestId('s').textContent).toBe('error')
  })
})
