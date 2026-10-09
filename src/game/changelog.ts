/**
 * 更新日志（顶栏「更新」/ 手机菜单）：写给玩家看，一版一两句、只写最重要的，新的在最上面。
 * 发新版舞台时在最上面加一条；id 变了入口亮红点（看过记在本机）。
 */
export type ChangeEntry = { id: string; date: string; title: string; items: string[] }

export const CHANGELOG: ChangeEntry[] = [
  { id: '2026-10-09c', date: '10 月 9 日 · 晚', title: '更顺手', items: ['顶栏可收起', '没选项时点提示直接说话', '新增更新日志'] },
  { id: '2026-10-09b', date: '10 月 9 日 · 傍晚', title: '播放设置', items: ['文字速度、字号、自动播放', '右键藏界面，点空白翻页'] },
  { id: '2026-10-09a', date: '10 月 9 日', title: '一句一句演', items: ['立绘一句一换', '光带选项、换场、心声'] },
  { id: '2026-10-07', date: '10 月 7 日', title: '舞台上线', items: ['开场视频、地图、图册、抓娃娃'] },
]
