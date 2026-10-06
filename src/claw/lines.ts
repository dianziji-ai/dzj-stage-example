/**
 * 电子姬在机器旁的本地台词：按下 / 失手 / 抓到时立刻冒出来（不等 AI，丝滑）。
 * 真正的「她怎么看」交给 AI：送娃娃、回去跟她说战绩时才发消息。
 */
import type { ExprId } from '../game/content'
import type { Rarity } from './data'

export type Line = { text: string; face: ExprId }

const L = {
  idle: [
    { text: '冲呀主人！看准了再按！', face: 'happy' },
    { text: '人家想要那只！就那只！', face: 'wink' },
    { text: '主人加油～人家给你打气！', face: 'love' },
  ],
  drop: [
    { text: '就、就是那里！', face: 'surprised' },
    { text: '下去了下去了——', face: 'happy' },
  ],
  miss: [
    { text: '啊……空的。主人瞄歪啦～', face: 'pout' },
    { text: '唔，什么都没夹到……', face: 'sad' },
  ],
  slip: [
    { text: '掉、掉了！！差一点点！', face: 'surprised' },
    { text: '呜哇——明明都夹起来了！', face: 'sad' },
  ],
  normal: [
    { text: '抓到啦～主人好厉害！', face: 'happy' },
    { text: '欸嘿嘿，好可爱！', face: 'love' },
  ],
  rare: [{ text: '哇！是稀有的！主人是天才吗！', face: 'surprised' }],
  gold: [{ text: '金、金色的？！人家第一次见！！', face: 'love' }],
  broke: [{ text: '硬币用完了……去跟人家聊聊天，说不定会有好事哦？', face: 'wink' }],
} satisfies Record<string, Line[]>

export type LineKind = keyof typeof L | Rarity

export function line(kind: LineKind, rng: () => number = Math.random): Line {
  const pool = L[kind as keyof typeof L]
  return pool[Math.floor(rng() * pool.length)]
}
