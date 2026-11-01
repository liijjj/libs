# 在线脚本库

自己的、AI 生成的、以及第三方的在线脚本，一个文件一个稳定外链，直接 `<script src>` 引用。

- 目录页：<https://liijjj.github.io/libs/>
- 清单：`libs.json`（目录页读它渲染，加库时同步一条）
- CDN：`https://cdn.jsdelivr.net/gh/liijjj/libs@main/<路径>`

## 结构

```
.
├─ libs.json                  库清单
├─ index.html                 目录页（GitHub Pages 首页）
├─ js/
│  └─ hover-translate/        一个库一个目录，主文件和目录同名
│     ├─ hover-translate.js
│     ├─ demo.html
│     ├─ test.html
│     └─ README.md
└─ .github/workflows/
   ├─ check.yml               校验 js 语法 + libs.json 里文件是否存在
   └─ pages.yml               发布到 GitHub Pages
```

约定（以后加库时照着来就行）：

- `js/<库名>/<库名>.js`，库名小写、用连字符；要样式就并排放 `<库名>.css`。
- 第三方放 `js/others/`，文件名带版本：`名字-1.2.3.min.js`。
- 自己的放 `js/my/`。
- 这两个目录现在都还没建，需要时新建即可，建完在 `libs.json` 加一条。

## 外链怎么取

| 写法 | 例子 | 说明 |
| --- | --- | --- |
| 跟随最新 | `@main` | 改动后最长约 12 小时生效（有缓存） |
| 锁定版本 | `@v1.2.0` | tag 不可变，适合长期引用 |
| 锁定提交 | `@2edd6ec` | 最精确，适合排查问题 |
| 刷新缓存 | `https://purge.jsdelivr.net/gh/liijjj/libs@main/js/hover-translate/hover-translate.js` | 改完立刻生效 |

```html
<script src="https://cdn.jsdelivr.net/gh/liijjj/libs@v1.2.0/js/hover-translate/hover-translate.js" charset="utf-8"></script>
```

## 现在有哪些

| 库 | 文件 | 版本 | 外链 |
| --- | --- | --- | --- |
| hover-translate.js（网页翻译 + 悬停看原文） | `js/hover-translate/hover-translate.js` | 1.2.0 | [@v1.2.0](https://cdn.jsdelivr.net/gh/liijjj/libs@v1.2.0/js/hover-translate/hover-translate.js) · [@main](https://cdn.jsdelivr.net/gh/liijjj/libs@main/js/hover-translate/hover-translate.js) |

演示：<https://liijjj.github.io/libs/js/hover-translate/demo.html>
自测：<https://liijjj.github.io/libs/js/hover-translate/test.html>

> 之前的名字是 `gthx`（gt = Google Translate，hx = hover），1.1.0 起改成 `hover-translate`。
> 旧链接 `@v1.0.0/js/gthx/gthx.js` 仍然可用，只是不再更新。

## 加一个库

1. 建目录放文件：`js/foo/foo.js`。
2. `libs.json` 的 `items` 里加一条：`id`、`name`、`desc`、`file`、`version`（显示用）、
   `ref`（想固定的 tag，不写就 `@main`）、`demo`、`doc`、`tags`。
3. 上面「现在有哪些」的表格加一行，push。
4. 要长期引用就打 tag：

```bash
git tag -a v1.2.0 -m "foo 1.2.0"
git push origin v1.2.0
```

## 工作流

- `check.yml`：所有 js 过一遍 `node --check`，并检查 `libs.json` 里写的文件是否真的存在。
- `pages.yml`：push 到 `main` 就把根目录发布到 GitHub Pages（目录页 + 各库 demo）。

## 改名

仓库名是 `libs`。以后要再改名：Settings → General → Repository name，然后把 README 和
`libs.json` 里的 `libs` 换成新名字（目录页的 CDN 链接是从当前地址算的，不用改），
Pages 地址会变成 `https://liijjj.github.io/<新名字>/`，jsDelivr 链接里的 `libs` 也要跟着换。
