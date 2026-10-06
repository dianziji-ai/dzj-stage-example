import { createContext } from 'react'
import type { Session } from '..'

/** StageBoot 建好的会话（App 里用 useStage() 拿，不直接用它） */
export const SessionCtx = createContext<Session<unknown> | null>(null)
