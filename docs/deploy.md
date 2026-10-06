# 上线

```bash
npm run pack       # 打包 + 压成 stage.zip
```

**构建号**：每次打包都把打包时刻的时间戳写进加载页底部（`BUILD 1791312345`）。上传后刷新游戏，看加载页底部的 BUILD 号变没变，就知道玩家拿到的是不是新版。本地 `npm run dev` 显示 `BUILD dev`。

网站编辑器 →「舞台」→「③ 上线」上传 `stage.zip`。★**目前只有平台管理员能上传**：普通作者把 `stage.zip` 和卡 id 发给平台管理员，审核后由管理员上传（编辑器「舞台 → ③ 上线」里也写着）。

- 解压后最多 30MB，根目录要有 `index.html`。自己压的话：把 `dist` 里的内容压进去，或者直接压整个 `dist` 文件夹也行（平台会自动去掉外面那一层）。
- 每次上传是一个新版本：全部传完才切换，玩家只会看到完整的旧版或完整的新版。平台保留最近 3 个版本。
- 舞台放在独立域名（和网站不是同一个域名），碰不到网站的登录信息。

## 玩家怎么进来

```
玩家点开卡 → 新游戏 / 读档 → 初始设定 → 开场 → 进入舞台
  → 平台弹授权框（每次进入都弹）：这张卡的舞台要读头像 / ID / 用户名、以玩家身份在这一局聊天、读写这一局存档
  → 玩家同意 → 平台签 6 小时的凭证，放在舞台地址 # 后面
  → 舞台 readLaunch() 读出来（读完从地址栏擦掉），开始玩
```

凭证过期了，玩家刷新页面就会重签。

## ★凭证安全（必看）

- **线上只用 `readLaunch()`**，不读 `.env`：Vite 打包会把 `.env` 写进 js，玩家打开开发者工具就能拿走你的开发凭证。
- `vite.config.ts` 打包时会把 `VITE_STAGE_API` / `VITE_STAGE_TOKEN` 强制清空，双保险，**别删这段**。
- `src/stage.ts` 的写法照抄：

```ts
export const stage = createStage(
  readLaunch() ??
    (import.meta.env.DEV ? { api: import.meta.env.VITE_STAGE_API, token: import.meta.env.VITE_STAGE_TOKEN } : { api: '', token: '' }),
)
```

## ★路径

- `vite.config.ts` 用相对路径（`base: './'`）：上传后舞台在 `{卡id}/{版本号}/` 目录下。
- `public/` 里的文件用 `import.meta.env.BASE_URL` 拼：`` `${import.meta.env.BASE_URL}brand/logo.webp` ``。**别写 `/brand/logo.webp`**：绝对路径会去域名根目录找，全部 404。
- 大图（立绘、背景、CG）放卡的素材库，用素材库的完整地址，不打进包里。

## 上传前自检

- [ ] `npm test`、`npx tsc -b`、`npm run lint` 全过
- [ ] `npm run pack` 成功
- [ ] 电脑（1280 宽和 2000 宽）、手机（375×667、390×844）各看一遍：顶部刘海、底部 home 条有没有被挡
- [ ] 没有外链别的网站的素材
- [ ] `packages/` 没被改过（`npm run test:sdk` 会检查）
