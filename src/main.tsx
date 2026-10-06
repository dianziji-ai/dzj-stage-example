import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { bgUrl, isExpr, spriteUrl } from './game/content'
import { normalizeSave } from './game/logic'
import { rules } from './game/rules'
import { readZones, watchViewport, type StageSnapshot } from '@dianziji/stage'
import { StageBoot } from '@dianziji/stage/react'
import './index.css'
import { stage } from './stage'

// 安全区 + 键盘遮挡 → CSS 变量 --safe-* / --kb（见 @dianziji/stage 的 viewport.ts）
watchViewport()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 公共启动外壳：看板娘加载页 → 读这一局 → 预加载首屏 → 建好会话交给 App；游戏规则（存档怎么变）在 rules */}
    <StageBoot stage={stage} preload={firstScreen} version={__STAGE_VERSION__} {...rules}>
      <App />
    </StageBoot>
  </StrictMode>,
)

/** 首屏要用的图：当前地点的背景 + 当前表情的立绘（其余表情进游戏后空闲时再拉，不拖慢启动） */
function firstScreen(snap: StageSnapshot): string[] {
  const last = [...snap.history].reverse().find((m) => m.role === 'assistant')?.content ?? ''
  const face = readZones(last, snap).face
  const expr = face?.type === 'data' ? (face.value as Record<string, unknown>)['表情'] : undefined
  return [bgUrl(normalizeSave(snap.save).location), spriteUrl(isExpr(expr) ? expr : 'normal')]
}
