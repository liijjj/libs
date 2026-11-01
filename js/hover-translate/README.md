# hover-translate.js — 网页翻译 + 悬停显示原文

`hover-translate.js` 是一个自包含的网页翻译脚本：把整页文字翻译成目标语言，**鼠标停在译文上时弹出小气泡显示原文**，移开即消失。

它替代了原来的 `gtranslate()` 方案（`float.js` + `lib.min.js`），不再依赖 gtranslate 的 CDN 和它的接口。

```
hover-translate.js      脚本本体（约 35 KB，无依赖，ES5 + Promise，默认不输出任何日志）
index.html   成品页面（无调试面板）
test.html    自测页面（12 项自动检查 + 调试面板，仅开发用）
```

## 一、它调的到底是谁的接口

**不是 gtranslate 的接口。** 原方案里 `float.js` 只是切换器 UI，真正干活的是它加载的
`lib.min.js`——一份改写过的 Google `element.js`，向下面这个地址发送整页 HTML：

```
POST https://translate-pa.googleapis.com/v1/translateHtml
     X-goog-api-key: AIzaSy...            （gtranslate 硬编码在他们脚本里的 key）
     Content-Type: application/json+protobuf
```

额度、封禁、key 失效都是 gtranslate 那边的事，你改了也不受控。

新脚本用的是 Google 自己的另一个入口：

```
GET https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=zh-CN&q=...&q=...
```

就是 Chrome 内置翻译扩展用的那个。特点：

- 不需要任何 key，响应头带 `Access-Control-Allow-Origin: *`，纯 GET，无预检；
- 一次请求可以带多个 `q`，回来的数组和输入一一对应，还会带识别出的原文语言；
- 不是公开 API，**没有官方额度**，靠 IP 限流。压测时超过一定频率会被 302 到
  `google.com/sorry`（人机验证页），所以脚本做了：批量（1200 字符 / 20 段一次）、
  串行、批间 120 ms、同文本去重、`localStorage` 缓存、连续失败两批就停手。
- 一般文章整页 1～3 个请求；同一页面第二次访问命中缓存，基本 0 请求。

要 SLA 就走官方付费：Google Cloud Translation 每月 50 万字符免费，之后约 $20 / 百万字符。

## 二、用法

```html
<script>
window.hoverTranslateSettings = {
    default_language: 'auto',          // 原文语言，auto = 自动检测
    languages: ['zh-CN', 'en', 'ja'],  // 切换器里可选的语言
    auto_translate: 'zh-CN',           // 启动后自动翻译成这个语言；'' 或 false = 不自动翻译
    show_original: true,               // true = 悬停显示原文；false = 只翻译，不弹气泡
    ui_position: 'top-right'           // 切换器位置
};
</script>
<script src="hover-translate.js" charset="utf-8"></script>
```

`auto_translate` 每次启动都生效，会盖过"上次选择的语言"；
不写它（或写 `false`）时，则恢复上次在切换器里选的语言。

手动调用：

```js
HoverTranslate.translate('zh-CN');   // 翻译成简体中文（Promise）
HoverTranslate.restore();            // 还原原文（逐字还原，空白也不动）
HoverTranslate.toggle();             // 原文 / 第一个语言 之间切换
HoverTranslate.language;             // 当前目标语言，'' 表示原文
HoverTranslate.config({ show_original: false });   // 运行时也能改
```

事件：`ht:done`、`ht:error`、`ht:restore`（都挂在 `document` 上）。

## 三、替换你现在的 `gtranslate()`

原来那几行（`window.gtranslateSettings`、`myz.myappend('div', ... 'my-gtranslate-box')`、
`cdn.gtranslate.net/widgets/latest/float.js`）全部删掉：

```js
function gtranslate(){
    if (window.HoverTranslate || window.__htLoading) return;
    window.__htLoading = true;
    window.hoverTranslateSettings = {
        default_language: 'auto',
        languages: ['zh-CN', 'en', 'ja'],
        auto_translate: '',          // 想开机自动翻译就填 'zh-CN'
        show_original: true,
        ui_position: 'top-right'
    };
    var s = document.createElement('script');
    s.src = '/js/hover-translate.js';           // 改成你的实际路径
    s.defer = true;
    document.head.appendChild(s);
}
```

想把切换器放回自己的容器里，保留那个 div 并加 `ui_container: '.my-gtranslate-box'`
（此时用容器自身定位，不再是 fixed）。

## 四、配置项

| 键 | 默认值 | 说明 |
| --- | --- | --- |
| `default_language` | `'auto'` | 原文语言；固定成 `'en'` 之类可提高质量 |
| `languages` | `['zh-CN','en','ja']` | 切换器可选语言 |
| **`auto_translate`** | `null` | `'zh-CN'` = 每次打开自动译成它；`false`/`''` = 不自动 |
| **`show_original`** | `null` | `false` = 关闭悬停气泡（同时去掉悬停浅色底） |
| `initial_language` | `''` | `auto_translate` 的内部等价项 |
| `tooltip` | `true` | `show_original` 的内部等价项 |
| `language_names` | `null` | 自定义语言名，如 `{ en: 'English' }` |
| `detect_browser_language` | `false` | 首次访问按浏览器语言自动翻译 |
| `ui` | `true` | 是否显示切换器 |
| `ui_position` | `'top-right'` | `top-left` / `bottom-right` / `bottom-left` |
| `ui_container` | `''` | 渲染到某个容器（改为静态定位） |
| `hover_highlight` | `true` | 悬停时译文加一层浅色底 |
| `hover_delay` | `0` | 显示延迟（毫秒） |
| `hide_delay` | `60` | 隐藏延迟（毫秒） |
| `source_label` | `'原文'` | 气泡里的标签文字 |
| `observe` | `true` | 监听动态内容，新增文字自动翻译 |
| `unit_bytes` | `8000` | 一个块（p/li/td…）最多多少编码字节，整段一起翻 |
| `batch_bytes` | `11000` | 单次请求 URL 里 q 的总编码字节（实测 12KB 上限） |
| `batch_items` | `400` | 单次请求最多多少段 |
| `concurrency` | `3` | 同时几个请求 |
| `request_gap` | `60` | 同一并发槽内的请求间隔 |
| `cache_max` | `3000` | 译文缓存条数上限 |
| `endpoint` / `client` | Google `translate_a/t` | 换接口时才需要动 |
| `storage_key` / `cache_key` | `__HT_STATE` / `__HT_CACHE` | 语言记忆与译文缓存 |
| `debug` | `false` | 打开后才有 `console.log` |

## 五、原文是从哪来的（源码里为什么搜不到）

因为原文根本不在脚本里，它是**页面现有的 DOM 文本**。

翻译一个文本节点时：

```js
var raw  = textNode.nodeValue;                     // ← 页面上此刻的真实文字
var span = document.createElement('span');
span.textContent = 译文;
span.__ht = { orig: raw, core: raw.trim(), src: 'en' };   // ← 原文挂在这个 span 上
textNode.parentNode.replaceChild(span, textNode);
```

于是每一段译文 `<span>` 自己带着自己的原文（`__ht.orig` 是逐字原文，`core` 是折叠空白后的
展示版）。悬停时只是把 `span.__ht.core` 塞进气泡的 `textContent`，**不发任何请求**，
所以是瞬时的；同一个字在页面上出现两次，也各存各的。

可以自己验证：翻译后按 F12 选中一段译文，控制台执行

```js
$0.__ht            // { orig: "For most of the internet's history…", core: "…", src: "en" }
$0.__ht.orig        // 逐字原文
```

`HoverTranslate.restore()` 就是拿 `__ht.orig` 生成一个新的文本节点换回去，所以还原是逐字的，
不是"再翻译回去"。

## 六、实现上的几个细节

- **按"块"整段翻译**：一个 `<p>`/`<li>`/`<td>`（或最近的块级祖先）里所有文本节点拼成一段，
  用 `[[htN]]` 标记隔开送去翻译，回来再按标记切回各片段。句子完整，译文质量明显好于逐片段翻；
  标记在 Google 那边能完整保留（实测 5 组句子全过）。
- **悬停给的是整段原文**：每个译文片段都记着所属块的完整原文和自己的位置。段落短就显示整段；
  段落长就显示"包含该片段的那一句"，并把你指到的那几个词标黄（和当年 Google 组件一样）。
  不额外发请求，读的是翻译时就地存下的原文。
- 引擎整句重排时，个别片段的译文会整体挪到相邻片段（这一段的译文变成空）。这种空片段**不生成悬停热区**，
  否则它会在行首变成一个"永远显示同一句"的假热区。
- 中文原文片段之间本来没有空格，译成英文时自动补空格（`ChinaPolitical` → `China Political`）；
  译成中日韩文字时反过来去掉多余空格。
- **只翻译文本节点**，跳过 `script/style/code/pre/textarea/iframe/svg`、`.notranslate`、
  `translate="no"`、`contenteditable` 和脚本自己的 UI。
- 首尾空白单独保存，替换时原样拼回，排版不会因为翻译被破坏；中日文相邻片段之间的空格会自动去掉。
- 单次请求按 **URL 编码后字节数**（默认 11KB，实测 12KB 是 Google 的上限）打包，并发 3 路；
  失败先退避、再把批次劈半重试，连续失败 5 次才停手。
- 同批请求内相同文本只发一次；译文按 `语言 + 原文` 缓存进 `localStorage`（上限 3000 条）。
- 切换语言先还原再翻译，并用"代数"作废进行中的旧语言请求（这里原本有个竞态会留下半页旧语言，已修）。
- `MutationObserver` 处理动态内容（500 ms 去抖）；脚本自己写 DOM 的变动会被识别并忽略，不会自激。
- 气泡：`position: fixed` 实时测量视口，自动上下翻转、左右收边，箭头指向鼠标所在行，滚动跟随，
  `Esc` 关闭；触屏轻点译文也能看 5 秒。

**长页面实测**（维基百科 Donald Trump 词条，正文 24.7 万字符、8325 个文本节点，走代理）：

| | 1.1.1（逐节点） | 1.2.0（整段 + 并发） |
| --- | --- | --- |
| 请求数 | 约 417 个（估算，20 段/次） | 41 个 |
| 总耗时 | 约 8 分钟（估算，串行） | **14 秒** |
| 译文 | 每个片段单独翻，句子被切碎 | 整句翻译，段落连贯 |

普通博客/文章页（1~3 万字）通常 2~5 个请求，1~2 秒。


## 七、限制

- 需要能访问 `clients5.google.com`（和原来的 gtranslate 一样要能连 Google）。
- 按文本节点分段：一句话被 `<a>`、`<b>` 切开时会分段翻译，断点处可能略生硬；
  换来的是悬停粒度更细。
- 译文是纯文本，不保留原文里的内联标签结构（也不会破坏页面元素）。
- 脚本内含中文字符串，请以 UTF-8 保存，`<script>` 上标 `charset="utf-8"`。

## 八、自测

`test.html` 跑完会自动执行 12 项检查并打印在页面左下角（**这个调试面板只在 test.html 里，
`hover-translate.js` 和 `index.html` 都没有，脚本默认也不向控制台输出任何东西**）：

译文已应用 / 悬停出现气泡 / 气泡内容是原文 / 标注原文语言 / 移出后隐藏 /
还原无残留 / 还原逐字一致 / 切换到日语 / 日语下仍保留原文 ……

本地打开（`file://` 下 XMLHttpRequest 会被拦，需要 http）：

```
python -m http.server 8765
# http://127.0.0.1:8765/index.html   成品页面
# http://127.0.0.1:8765/test.html    自测
```
