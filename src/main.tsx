import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { parseBeats, spriteAt } from './game/beats'
import { bgUrl, spriteUrl } from './game/content'
import { normalizeSave } from './game/logic'
import { rules } from './game/rules'
import { readZones, zoneText, type StageSnapshot } from '@dianziji/stage'
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

/** 首屏要用的图：当前地点的背景 + 最后一轮第一句的立绘（其余表情进游戏后空闲时再拉，不拖慢启动） */
function firstScreen(snap: StageSnapshot): string[] {
  const last = [...snap.history].reverse().find((m) => m.role === 'assistant')?.content ?? ''
  const z = readZones(last, snap)
  const expr = spriteAt(parseBeats(zoneText(z, 'narrative'), z.talk?.value), 0, 'normal')
  return [bgUrl(normalizeSave(snap.save).location), spriteUrl(expr)]
}
