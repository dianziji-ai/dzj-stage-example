import { useState } from 'react'

/** CG 全屏查看：点任意处关闭 */
export default function CgViewer({ src, onClose }: { src: string; onClose: () => void }) {
  const [broken, setBroken] = useState(!src) // 没地址 / 加载失败：给句话，别是一片黑
  return (
    <button onClick={onClose} className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black">
      {broken ? (
        <span className="px-8 text-center text-sm leading-6 text-white/70">这张回忆的图片没加载出来<br />检查一下网络，稍后在「图册」里再看看</span>
      ) : (
        <img src={src} alt="" decoding="async" onError={() => setBroken(true)} className="max-h-full max-w-full object-contain" />
      )}
      <span className="absolute inset-x-0 bottom-0 pb-safe text-center text-xs text-white/50">
        <span className="inline-block py-3">点击继续</span>
      </span>
    </button>
  )
}
