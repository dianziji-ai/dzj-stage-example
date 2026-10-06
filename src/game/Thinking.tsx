/**
 * 等回复时对话框里的样子：先把玩家刚说的那句显示出来（署名＝初始设定里的名字，没填写「你」），下面是「电子姬正在想…」+ 跳动的点。
 * 第一个字一到就被正文替换掉。点只动 opacity，手机上不费性能。
 */
export default function Thinking({ said, name, me }: { said: string; name: string; me: string }) {
  return (
    <div className="space-y-2">
      {said && <p className="line-clamp-2 text-sm text-pink-200/80">{me || '你'}：{said}</p>}
      <div className="flex items-center gap-2 text-white/70">
        <span>{name}正在想</span>
        <span className="inline-flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-1.5 animate-blink rounded-full bg-white" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </span>
      </div>
    </div>
  )
}
