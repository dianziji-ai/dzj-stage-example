/** 舞台拿到的数据形状：网站经桥推过来的快照（见 protocol.ts、docs/bridge.md）。网站那边改了，这里跟着改。 */

export type StageRole = 'user' | 'assistant' | 'system'

/** opening＝平台写入的开场，lead＝幕启，null＝正常对话 */
export type StageKind = 'opening' | 'lead' | null

export type StageMessage = {
  id: number
  role: StageRole
  kind: StageKind
  /** 原文，怎么显示由舞台决定 */
  content: string
  /** 发送 / 生成时间（ISO 8601）。舞台自己先插进去、还没刷新的那条没有 */
  created_at?: string | null
  /** ok · error＝断流（正文只写了半截、照样扣费）或生成失败（空正文、没扣费） */
  status?: 'ok' | 'error' | string
  /** 这一轮花了多少（同聊天页「本轮消耗」）：只有扣了能量的 AI 回复才有，否则 null */
  spend?: StageSpend | null
}

/** 一轮的消耗。in_* / out_cost 来自结算流水，老消息查不到是 null（只有总能量和输出 token） */
export type StageSpend = {
  /** 这一轮一共扣的能量 */
  cost: number
  /** 模型 id（如 deepseek/deepseek-v3.2）；显示时常只取 / 后面那半 */
  model: string | null
  /** 线路 */
  channel: string | null
  out_tokens: number
  in_tokens: number | null
  in_cost: number | null
  out_cost: number | null
}

/** 卡的分区结构（只列舞台常用的字段，其余原样透传） */
export type StageSlot = { zone: string; kind?: string; label?: string; [k: string]: unknown }

export type StageSave = Record<string, unknown>

/** 配图库里的一张图：n＝编号（AI 写 ![](n)），src＝地址，g＝属于哪些组（组名） */
export type StageImage = { n: number; src: string; w?: number; h?: number; g?: string[] }
/** 配图库：一张扁平的图表 + 分组（图册按组展示；rounds＝第几轮解锁这组，-1/缺省＝不进图册，0＝一直可见） */
export type StageImagePack = { groups: { name: string; rounds?: number }[]; images?: StageImage[] }

/** 存档结构：标准 JSON Schema，根节点 type:object；开局存档＝properties 里各字段的 default */
export type StageSchema = {
  type: 'object'
  properties?: Record<string, { type?: string | string[]; default?: unknown; [k: string]: unknown }>
  [k: string]: unknown
}

/** 初始设定（进场前玩家在平台填的）：text＝原文（和 AI 看到的一字不差）；fields＝按卡的设定字段拆好，没填的 value＝null */
export type StageSetup = { text: string; fields: { key: string; label: string; value: string | null }[] }

/** 图册里的一张图：thumb＝缩略图（格子用，只取第一帧），src＝原图（点开看） */
export type StageGalleryImage = { src: string; thumb: string }

/**
 * 图册（stage.gallery()）：和网站画廊同一套规则。
 * turns＝这个人在这张卡所有会话累计的 AI 回复数（开场、失败不算）；相册 rounds：-1 不公开 / 0 一直开放 / N 玩到第 N 轮解锁。
 * 锁着（locked）和没开放（hidden）的相册只有名字、张数、门槛，没有图片地址。
 */
export type StageGallery = {
  turns: number
  /** 卡的门面图（谁都能看） */
  previews: StageGalleryImage[]
  packs: {
    name: string
    state: 'open' | 'locked' | 'hidden'
    rounds: number
    count: number
    /** 封面缩略图（只有 open 才有） */
    cover: string | null
    images: StageGalleryImage[]
  }[]
}

/** 玩家的公开资料 */
export type StageUser = { id: number; username: string; name: string; avatar: string }

/** 正在生成的这一轮：said＝玩家说的那句（已去掉 <dj_state>），text＝到目前为止的原文，reasoning＝思维链（多数舞台用不到） */
export type StageLive = { said: string; text: string; reasoning: string }

/** 这一轮失败：code 决定给什么按钮；retry＝能「再说一次」的那句原话（连接 / 上游出错时才有）；retryAfter＝太频繁时要等的秒数 */
export type StageTurnError = { code: StageErrorCode; message: string; retry?: string | null; retryAfter?: number }

/** 这一局用的模型（只用来显示，换模型由网站管）；dev＝作者本人在本地开发 */
export type StageMeta = { model: string; channel: string; dev: boolean }

/** 刘海 / home 条占的像素（舞台在 iframe 里，CSS 的 env() 恒为 0，由网站量好推进来） */
export type SafeArea = { top: number; right: number; bottom: number; left: number }

/** 这一局的快照：网站 init 时整份给，之后 update 只给变了的那几项 */
export type StageSnapshot = {
  card: { id: string; name: string }
  /** 网站地址（如 https://dianziji.ai）：拼站内链接用（stage.siteUrl） */
  site: string
  /** 玩家：只有展示用的几项 */
  user: StageUser | null
  /** 卡素材的图床地址：卡里写的 {{asset}}/卡id/assets/… 把 {{asset}} 换成它就是完整地址 */
  asset_base: string
  slots: StageSlot[]
  /** 存档结构（JSON Schema，编辑器「舞台 → ② 存档结构」定义）；没定义＝null，此时不能存档 */
  state_schema: StageSchema | null
  /** 配图库：AI 按编号引用的图（readZones 不换，用 imageUrl(snap, 编号) 取）。没配＝null */
  image_pack: StageImagePack | null
  /** 初始设定（只读；要改回网站的设定）。按 key 取值：setup.fields.find((f) => f.key === 'name')?.value */
  setup: StageSetup
  /** 最近的历史（正序，库里原文，{{asset}} 已展开）。读更早的：stage.older() */
  history: StageMessage[]
  has_more: boolean
  /** 舞台存档（只在 init 里给：之后只有舞台自己存，网站不会再推） */
  save: StageSave | null
  /** 正在生成＝这一轮；没在生成＝null。谁发的都一样（舞台、网站输入框、快捷指令、重生） */
  live: StageLive | null
  /** 上一轮失败＝原因；没有＝null。玩家再发一句时网站会清掉 */
  error: StageTurnError | null
  meta: StageMeta
  safe_area: SafeArea
}

export type StageErrorCode =
  | 'unauthorized'
  | 'insufficient'
  | 'invalid'
  | 'too_large'
  | 'busy'
  | 'rate_limited'
  | 'maintenance'
  | 'error'
  | 'network'
  | 'stream'
  | 'version'
