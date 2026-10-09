/**
 * 电子姬在机器旁的本地台词：按下 / 失手 / 抓到时立刻冒出来（不等 AI，丝滑）。
 * 真正的「她怎么看」交给 AI：送娃娃、回去跟她说战绩时才发消息。
 */
import type { Rarity } from './data'

/** face＝她这句的表情（中文，直接拿去配图库挑立绘，和对话区写的一样） */
export type Line = { text: string; face: string }

const L = {
  idle: [
    { text: '冲呀主人！看准了再按！', face: '开心' },
    { text: '人家想要那只！就那只！', face: '调皮' },
    { text: '主人加油～人家给你打气！', face: '心动' },
  ],
  drop: [
    { text: '就、就是那里！', face: '惊讶' },
    { text: '下去了下去了——', face: '开心' },
  ],
  miss: [
    { text: '啊……空的。主人瞄歪啦～', face: '生气' },
    { text: '唔，什么都没夹到……', face: '委屈' },
  ],
  slip: [
    { text: '掉、掉了！！差一点点！', face: '惊讶' },
    { text: '呜哇——明明都夹起来了！', face: '委屈' },
  ],
  normal: [
    { text: '抓到啦～主人好厉害！', face: '开心' },
    { text: '欸嘿嘿，好可爱！', face: '心动' },
  ],
  rare: [{ text: '哇！是稀有的！主人是天才吗！', face: '惊讶' }],
  gold: [{ text: '金、金色的？！人家第一次见！！', face: '心动' }],
  broke: [{ text: '硬币用完了……去跟人家聊聊天，说不定会有好事哦？', face: '调皮' }],
} satisfies Record<string, Line[]>

export type LineKind = keyof typeof L | Rarity

export function line(kind: LineKind, rng: () => number = Math.random): Line {
  const pool = L[kind as keyof typeof L]
  return pool[Math.floor(rng() * pool.length)]
}
