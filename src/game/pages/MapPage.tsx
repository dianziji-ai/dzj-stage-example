import { showTip } from '../tipStore'
import { mapOf } from '../art'
import { PLACES, withCall, type PlaceId } from '../content'
import { usePack } from '../useGame'
import Page from './Page'

/** 地图：白相框里的小镇地图 + 地点胶囊（地点全部开放）；当前位置粉色；生成中不能点。 */
export default function MapPage({ focus, here, busy, call, line, onGo, onBack }: {
  /** 要高亮的地点（从提示「去电玩城」过来时跳动一下） */
  focus?: PlaceId | null
  /** 出发时替玩家说的那句（确认框里原样引用，说的就是发的） */
  line: (id: PlaceId) => string
  here: PlaceId; busy: boolean; call: string; onGo: (id: PlaceId) => void; onBack: () => void }) {
  const pack = usePack()
  return (
    <Page title="地图" onBack={onBack} sub={busy ? '她正在说话，等一下再走吧～' : '今天想和电子姬去哪儿约会呢？'}>
      <div className="mx-auto w-full max-w-[min(100%,70dvh)] px-4 pt-2 pb-4">
        <div className="rounded-[28px] bg-white p-2 shadow-[0_14px_40px_-12px_rgba(236,72,153,0.35)]">
          <div className="relative aspect-square overflow-hidden rounded-[22px] bg-[#e9f5df]">
            <img src={mapOf(pack)} alt="" decoding="async" className="size-full object-cover" />
            {PLACES.map((p) => {
              const cur = p.id === here
              const hot = p.id === focus && !cur
              return (
                <button
                  key={p.id}
                  disabled={cur}
                  onClick={() => {
                    if (busy) return showTip({ icon: '💬', title: '她还在说话呢', text: '等她说完再一起出发吧～' })
                    // ★出发＝替玩家发一句话（AI 接着写这段路上的剧情，消耗一轮能量）：先确认，别误点就扣
                    const name = withCall(p.name, call)
                    showTip({
                      icon: '🗺️',
                      title: `和电子姬一起去${name}？`,
                      text: `会替你说一句「${line(p.id).replace(/^（|）$/g, '')}」，\n她会接着写路上和到了以后的剧情。`,
                      note: '⚡ 算一轮对话，会消耗能量',
                      action: { label: '出发！', onClick: () => onGo(p.id) },
                      dismiss: '再想想',
                    })
                  }}
                  style={{ left: `${p.at[0]}%`, top: `${p.at[1]}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${hot ? 'z-10 animate-bounce ring-4 ring-pink-300/80' : ''} px-3 py-1.5 text-xs font-semibold whitespace-nowrap shadow-md transition-transform ${
                    cur
                      ? 'bg-gradient-to-br from-pink-400 to-rose-500 text-white ring-2 ring-white'
                      : 'border-2 border-pink-200 bg-white text-[#4a2f2a] active:scale-95'
                  }`}
                >
                  {cur ? `📍 ${withCall(p.name, call)}` : withCall(p.name, call)}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Page>
  )
}
