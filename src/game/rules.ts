import type { SessionOptions } from '@dianziji/stage'
import { cgNumbers, nextSave, normalizeSave, type GameSave } from './logic'

/**
 * 这张卡的游戏规则，交给 <StageBoot {...rules}>（框架在对的时机调它们）：
 *   normalize   读回来的存档过一遍（补默认、丢非法值）+ 把历史里出现过、存档里还没记的 CG 补上（比如开场自带的那张）
 *   onTurn      一轮写完：按这轮的分区算新存档（好感 / 心情 / 天数 / 地点 / 解锁 / 硬币，规则在 logic.ts 的 nextSave）
 * onTurn 只在 AI 这一轮写完、玩家在场时算一次；玩家提前走了这一轮就不算（不补算），存档和历史允许对不上。
 */
export const rules: Pick<SessionOptions<GameSave>, 'normalize' | 'onTurn'> = {
  normalize(raw, snap) {
    const save = normalizeSave(raw)
    const seen = snap.history.flatMap((m) => (m.role === 'assistant' ? cgNumbers(m.content) : []))
    const missing = [...new Set(seen)].filter((n) => !save.unlockedCg.includes(n))
    if (missing.length) save.unlockedCg = [...save.unlockedCg, ...missing].sort((a, b) => a - b)
    return save
  },
  onTurn: ({ raw, zones, save }) => nextSave(raw, zones, save).save,
}
