<p align="center">
  <img src="wloc.jpg" width="144" />
</p>

# Apple WLOC 网络定位修改

这是一个自维护版 WLOC 项目。它通过代理工具拦截 Apple 网络定位服务
`gs-loc.apple.com` / `gs-loc-cn.apple.com` 的 `/clls/wloc` 响应，修改 WiFi/基站
定位结果中的坐标。项目还包含一个 Cloudflare Worker 选点页面，用来保存目标坐标、
解析地图链接、做 GCJ-02/BD-09/WGS84 坐标换算。

> 仅建议用于你自己的设备、测试环境或开发调试。请遵守当地法律、平台规则和服务条款。

## 当前状态

- 适配 Surge、Quantumult X、Loon、Stash、Shadowrocket，Egern 可使用 Surge 模块。
- 支持 Apple Maps、Google Maps、高德、百度链接解析，也支持直接粘贴经纬度。
- Worker 不需要 KV、数据库或环境变量。
- Cloudflare Workers 免费额度目前仍为每日 100,000 次请求，个人使用通常足够。
- iOS/iPadOS 27 与 iOS/iPadOS 26.7 已在 2026-09-14 发布安全更新。iOS 26 以后系统缓存定位结果更积极，切换坐标后可能需要重启设备才会重新请求 WLOC。

## 上传到你自己的 GitHub

原作者仓库已不可用时，最重要的是把模块中的脚本地址、图标地址、主页、部署按钮和
选点页面地址改成你的仓库。先运行配置脚本：

```bash
node scripts/configure-repo.mjs \
  --repo BH0sec/wloc \
  --worker-url https://YOUR_WORKER_SUBDOMAIN.workers.dev \
  --author "BH0sec"
```

如果你打算用 Cloudflare Pages 作为选点页面，再加：

```bash
node scripts/configure-repo.mjs \
  --repo BH0sec/wloc \
  --worker-url https://YOUR_WORKER_SUBDOMAIN.workers.dev \
  --page-url https://YOUR_WORKER_SUBDOMAIN.workers.dev \
  --author "BH0sec"
```

检查替换结果：

```bash
rg "Yu9191|wloc-pages|wloc-spoofer|YOUR_WORKER_SUBDOMAIN"
```

然后初始化并推送：

```bash
git init
git add .
git commit -m "Initial self-maintained WLOC fork"
git branch -M main
git remote add origin https://github.com/BH0sec/wloc.git
git push -u origin main
```

## 订阅地址

以下地址已指向本仓库。

**Surge**

```text
https://raw.githubusercontent.com/BH0sec/wloc/refs/heads/main/modules/wloc.sgmodule
```

**Quantumult X**

```text
https://raw.githubusercontent.com/BH0sec/wloc/refs/heads/main/modules/wloc.conf
```

**Loon**

```text
https://raw.githubusercontent.com/BH0sec/wloc/refs/heads/main/modules/wloc.lpx
```

**Stash**

```text
https://raw.githubusercontent.com/BH0sec/wloc/refs/heads/main/modules/wloc.stoverride
```

**Shadowrocket**

```text
https://raw.githubusercontent.com/BH0sec/wloc/refs/heads/main/modules/wloc.module
```

## 使用方法

1. 在代理工具里订阅并启用对应模块。
2. 开启 MITM，安装并信任证书。
3. 确认 MITM 主机名包含：

```text
gs-loc.apple.com, gs-loc-cn.apple.com
```

4. 用 Safari 打开你的 Worker 或 Pages 选点页面。
5. 点击地图、搜索地点或粘贴地图链接。
6. 点击「储存到设备」。
7. 打开地图类 App 验证定位。

高版本 iOS/iPadOS 如果日志显示已修改但地图仍停在旧位置，重启设备后再测。飞行模式、
关闭定位服务等方式不一定能清掉 `locationd` 的内存缓存。

## Worker 部署

进入 Worker 目录安装依赖并测试：

```bash
cd worker
npm install
npm test
```

部署 Workers：

```bash
npm run deploy
```

部署 Pages：

```bash
npm run pages:deploy
```

也可以使用一键部署按钮。配置脚本会把按钮地址改成你的仓库：

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/BH0sec/wloc/tree/main/worker)

部署完成后，把得到的 Worker 或 Pages 地址重新写回模块/文档：

```bash
node scripts/configure-repo.mjs \
  --repo BH0sec/wloc \
  --worker-url https://YOUR_WORKER_SUBDOMAIN.workers.dev
```

## 快捷指令

旧快捷指令里写死了公共 Worker 域名。自维护时请复制快捷指令后，把其中的：

```text
https://YOUR_WORKER_SUBDOMAIN.workers.dev/api/parse
```

改成：

```text
https://YOUR_WORKER_SUBDOMAIN.workers.dev/api/parse
```

快捷指令逻辑：

- 设置位置：从地图分享链接读取坐标，调用 `/api/parse` 统一解析并换算到 WGS84。
- 清理恢复：请求 `https://gs-loc.apple.com/wloc-settings/save?action=clear` 清空本地持久化坐标。

## 工作原理

```text
选点页面
  -> fetch https://gs-loc.apple.com/wloc-settings/save?lon=x&lat=y
  -> 代理模块拦截 /wloc-settings/save
  -> wloc-settings.js 写入代理工具持久化存储
  -> Apple 触发 WLOC 网络定位
  -> wloc.js 读取目标坐标
  -> 解 gzip / 解析 protobuf / 替换 WiFi 与基站坐标
  -> 返回修改后的 WLOC 响应
```

坐标优先级：

```text
选点页面保存的坐标 > 模块参数 > 默认透传
```

默认模块参数为深圳示例坐标，但只要没有持久化坐标且参数保持默认，脚本会进入透传模式，
不修改 WLOC 响应。

## 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `longitude` | 目标经度，低于选点页面保存值 | `113.94114` |
| `latitude` | 目标纬度，低于选点页面保存值 | `22.544577` |
| `accuracy` | 精度，单位米 | `25` |
| `randomRadius` | 每次响应在目标点周围随机扰动，单位米，`0` 为关闭 | `0` |
| `logLevel` | 日志级别 | `info` |

## 恢复真实定位

推荐做法是关闭或删除模块，然后重启设备。也可以只清除持久化坐标，让脚本进入透传模式：

- Surge/Loon/Stash/Shadowrocket：清除 `wloc_settings` 持久化字段。
- Quantumult X：运行 `$prefs.removeValueForKey("wloc_settings")`。
- 选点页面：点「当前生效坐标」里的「清除数据」。

如果你手动改过模块参数中的经纬度，清除持久化数据后仍会使用模块参数。要彻底透传，
请把模块参数恢复成默认值或关闭模块。

## 项目结构

```text
dist/                         代理工具实际加载的脚本成品
modules/                      Surge/QX/Loon/Stash/Shadowrocket 订阅模块
worker/src/index.js           Worker 路由
worker/src/page.js            选点页面
worker/src/parse.js           地图链接解析与坐标换算
worker/test/                  回归测试
scripts/configure-repo.mjs    自维护仓库链接替换脚本
```

## 维护建议

- 改 Worker 解析逻辑后跑 `cd worker && npm test`。
- 改模块 URL 后用 `rg "Yu9191|wloc-spoofer|wloc-pages|YOUR_WORKER_SUBDOMAIN"` 检查残留。
- 不要删除 `dist/`，代理工具订阅加载的是这里的成品脚本。
- 不要只在 Cloudflare Dashboard 粘贴单文件部署 Worker；本项目 Worker 由多个源码模块组成，应使用 Wrangler 部署。

## 致谢

- [proxypin-wloc-spoofer](https://github.com/FFF686868/proxypin-wloc-spoofer) - 原始 WLOC 修改思路
- [NSNanoCat/Util](https://github.com/NSNanoCat/util) - 跨平台脚本工具框架
- 原项目及社区贡献者对地图解析、Stash 输出、随机扰动、港澳台边界处理等功能的贡献
