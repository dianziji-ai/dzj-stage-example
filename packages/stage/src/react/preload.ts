/**
 * 预加载图片：下载 + 解码（decode 完再上屏不会闪、不会卡第一帧）。
 * 单张最多等 5 秒、整体由调用方决定；失败的图不卡住启动（跳过，用到时再加载）。
 */
export function preloadImages(urls: string[], onProgress?: (done: number, total: number) => void): Promise<void> {
  const list = [...new Set(urls.filter(Boolean))]
  let done = 0
  onProgress?.(0, list.length)
  return Promise.all(
    list.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          img.decoding = 'async'
          img.src = src
          let settled = false // 超时和解码完成只算一次
          const finish = () => {
            if (settled) return
            settled = true
            onProgress?.(++done, list.length)
            resolve()
          }
          const timer = setTimeout(finish, 5000)
          img
            .decode()
            .catch(() => {})
            .finally(() => {
              clearTimeout(timer)
              finish()
            })
        }),
    ),
  ).then(() => {})
}
