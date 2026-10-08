import { createStage } from '@dianziji/stage/client'

/**
 * 整个项目共用的一个舞台连接：和外层网站之间的桥。舞台不连后端、没有凭证——网站把这一局推进来，舞台有事请网站去做。
 * 线上和本地开发一样都在网站里打开（本地开发：网站上进入这张卡 → 工具行「开发」→ 本地开发，填本机地址）。
 * 直接打开 localhost（不在网站里）：加载页显示「请在网站里打开」。
 */
export const stage = createStage()
