/**
 * 线上从平台进入时拿连接：平台签好 token，放在舞台地址 # 后面（#api=…&token=…）。
 * # 后面的内容不会发给服务器、不进 Referer；读完立刻从地址栏擦掉（舞台里的报错上报之类别把它带出去）。
 *
 *   const stage = createStage(readLaunch() ?? 本地开发的连接)
 *
 * 没有（直接打开、本地开发）＝null。★线上别退回 .env：打包会把 .env 写进 js，玩家都看得到——官方例子的 stage.ts 是这么分的。
 */
export type Launch = { api: string; token: string }

export function readLaunch(): Launch | null {
  if (typeof location === 'undefined' || !location.hash) return null
  const params = new URLSearchParams(location.hash.slice(1))
  const api = params.get('api')
  const token = params.get('token')
  if (!api || !token) return null

  // 擦掉：只去掉这两项，# 后面别的东西（舞台自己的路由之类）留着
  params.delete('api')
  params.delete('token')
  const rest = params.toString()
  try {
    history.replaceState(history.state, '', `${location.pathname}${location.search}${rest ? `#${rest}` : ''}`)
  } catch {
    /* 有的沙盒环境不让改地址：擦不掉也照常用 */
  }
  return { api, token }
}
