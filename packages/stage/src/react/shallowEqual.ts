/** 浅比较：两个对象 / 数组的每一项都是同一个值就算相等（useStage 的选择器一次取好几个字段时传它） */
export function shallowEqual<R>(a: R, b: R): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false
  const ka = Object.keys(a)
  if (ka.length !== Object.keys(b).length) return false
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}
