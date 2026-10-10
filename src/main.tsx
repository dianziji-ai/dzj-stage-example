import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { allSprites, bgOf, NO_LOOK, spriteOf } from './game/art'
import { lastLook, scriptBeats } from './game/beats'
import { normalizeSave } from './game/logic'
import { rules } from './game/rules'
import { readZones, zoneData, zoneRows, type StageSnapshot } from '@dianziji/stage'
import { StageBoot } from '@dianziji/stage/react'
import './index.css'
import { stage } from './stage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 公共启动外壳：看板娘加载页 → 读这一局 → 预加载首屏 → 建好会话交给 App；游戏规则（存档怎么变）在 rules */}
    <StageBoot stage={stage} preload={firstScreen} version={__STAGE_VERSION__} {...rules}>
      <App />
    </StageBoot>
  </StrictMode>,
)

/** 首屏要用的图：当前地点的背景 + 最后一轮她最后的样子那张立绘（都从配图库挑，见 art.ts；其余立绘进游戏后空闲时再拉） */
function firstScreen(snap: StageSnapshot): string[] {
  const last = [...snap.history].reverse().find((m) => m.role === 'assistant')?.content ?? ''
  const z = readZones(last, snap)
  const scene = zoneData(z, 'scene')
  const look = lastLook(scriptBeats(zoneRows(z, 'narrative'))) ?? NO_LOOK
  const sprite = spriteOf(snap, look, String(scene['穿着'] ?? ''))?.src ?? allSprites(snap)[0]
  return [bgOf(snap, normalizeSave(snap.save).location, String(scene['时间'] ?? '')), sprite].filter(Boolean)
}
