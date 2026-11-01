# 在线脚本库

自己的、AI 生成的、以及第三方的在线脚本库。所有文件都有稳定外链，可以直接 `<script src>` 引用。

- 目录页：<https://liijjj.github.io/my-repository/>
- CDN：`https://cdn.jsdelivr.net/gh/liijjj/my-repository@main/<路径>`
- 清单：`libs.json`（目录页读它来渲染，加库时记得同步）

## 目录结构

```
.
├─ libs.json                  库清单（目录页 / 校验工作流用）
├─ index.html                 目录页（GitHub Pages 首页）
├─ js/
│  ├─ gthx/                   一个库一个目录，主文件与目录同名
│  │  ├─ gthx.js
│  │  ├─ demo.html
│  │  ├─ test.html
│  │  └─ README.md
│  ├─ my/                     自己写的
│  │  ├─ mylib.js             ← 当前版，改这个文件
│  │  └─ archive/             每次提交后自动归档一份带时间戳的副本
│  └─ others/                 第三方库，文件名 名字-版本.min.js
└─ .github/workflows/
   ├─ archive-my-js.yml       改 js/my/*.js 后自动归档
   └─ check.yml               校验 js 语法 + libs.json 里文件是否存在
```

约定：

- **路径即身份**：`js/<库名>/<库名>.js`，库名小写、用连字符。
- **第三方**放 `js/others/`，文件名带版本：`sweetalert2-11.10.3.min.js`，方便一眼看出是不是旧版。
- **自己的**放 `js/my/`，主文件固定叫 `mylib.js`，历史版本交给 `archive/`。
- 需要样式的库可以建 `js/<库名>/<库名>.css`，规则一样。

## 外链怎么取

| 写法 | 例子 | 说明 |
| --- | --- | --- |
| 跟随最新 | `@main` | 改动后最长约 12 小时生效（有缓存） |
| 锁定版本 | `@v1.0.0` | tag 不可变，适合长期引用 |
| 锁定提交 | `@2edd6ec` | 最精确，适合排查问题 |
| 刷新缓存 | `https://purge.jsdelivr.net/gh/liijjj/my-repository@main/js/gthx/gthx.js` | 改完立刻生效 |

```html
<script src="https://cdn.jsdelivr.net/gh/liijjj/my-repository@v1.0.0/js/gthx/gthx.js" charset="utf-8"></script>
```

## 现在有哪些

| 库 | 文件 | 版本 | 外链 |
| --- | --- | --- | --- |
| gthx.js（网页翻译 + 悬停看原文） | `js/gthx/gthx.js` | 1.0.0 | [@v1.0.0](https://cdn.jsdelivr.net/gh/liijjj/my-repository@v1.0.0/js/gthx/gthx.js) · [@main](https://cdn.jsdelivr.net/gh/liijjj/my-repository@main/js/gthx/gthx.js) |
| mylib（个人用户脚本） | `js/my/mylib.js` | 跟随提交 | [@main](https://cdn.jsdelivr.net/gh/liijjj/my-repository@main/js/my/mylib.js) |
| crypto-js | `js/others/crypto-js-4.1.1.min.js` | 4.1.1 | [@main](https://cdn.jsdelivr.net/gh/liijjj/my-repository@main/js/others/crypto-js-4.1.1.min.js) |
| SweetAlert2 | `js/others/sweetalert2-11.10.3.min.js` | 11.10.3 | [@main](https://cdn.jsdelivr.net/gh/liijjj/my-repository@main/js/others/sweetalert2-11.10.3.min.js) |

## 新增一个库

1. 建目录放文件：`js/foo/foo.js`（第三方就放 `js/others/foo-1.2.3.min.js`）。
2. `libs.json` 的 `items` 里加一条（id、name、desc、file、version、ref、demo、doc、tags）；
   `version` 是显示用的库版本，`ref` 是想固定的 tag（不写就跟随 `@main`）。
3. 根 README 的表格加一行，`git push`；要长期引用就打个 tag：

```bash
git tag -a v1.0.0 -m "gthx 1.0.0"
git push origin v1.0.0
```

## 每月更新 mylib 的做法

1. 直接改 `js/my/mylib.js`，提交推送。
2. `archive-my-js.yml` 会把它复制成 `js/my/archive/mylib-YYYYMMDDHHmm.js`（北京时间）并自动提交；
   内容没变的不会重复归档。
3. 想要固定外链就用某份归档：

```
https://cdn.jsdelivr.net/gh/liijjj/my-repository@main/js/my/archive/mylib-202505040941.js
```

不再需要把时间戳写进正在用的文件名里——`mylib.js` 就是稳定入口，历史留档交给 `archive/`。

## 工作流

- `archive-my-js.yml`：push 改到 `js/my/*.js` 时触发，内容与最新归档不同才新增副本（机器人提交不会自激）。
- `check.yml`：所有 js 过一遍 `node --check`，并检查 `libs.json` 里写的文件是否真的存在——防止清单和文件对不上。

## 许可

`js/my/` 下是自己的代码；`js/others/` 是各自的上游项目（crypto-js: MIT，SweetAlert2: MIT），
版权和许可归原作者，这里只是镜像一份便于引用。`js/gthx/` 用 MIT 即可，随你。
