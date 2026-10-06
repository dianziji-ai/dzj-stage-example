/** zones.gen.js 的类型（生成文件配套，勿手改；源头 frontend/src/stage-sdk/zones.ts） */
export type Zone = { label: string; value: unknown; type: string }
export type Zones = Record<string, Zone | ''>

export function composeZones(
  slots: unknown[],
  content: string,
  opts: { reasoning?: string; imagePack?: unknown | null },
): Zones
