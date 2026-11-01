# gtwrap.js — 给 Google 官方翻译组件套一层壳

不重写翻译，直接加载官方的 `translate_a/element.js`，只做三件事：

1. **去掉顶部横幅**（以及它给 `<body>` 加的 `top:40px` 整体下移）；
2. 把官方那坨控件藏到屏幕外，换成一个**左下角的小胶囊**驱动它；
3. 记住上次选的语言，下次打开自动恢复。

翻译本身、悬停显示原文（那个小白气泡）都是谷歌官方的，原汁原味。

## 用法

```html
<script>
window.gtwrapSettings = {
    languages: ['zh-CN', 'en', 'ja'],   // 胶囊里放哪些语言
    position: 'bottom-left',            // bottom-left / bottom-right / top-left / top-right
    auto_translate: ''                  // 'zh-CN' = 打开就翻；空 = 等用户选
};
</script>
<script src="gtwrap.js"></script>
```

或者手动控制：

```js
GTWrap.setLanguage('zh-CN');   // 翻成中文
GTWrap.restore();              // 回到原文
GTWrap.language;               // 当前目标语言，'' = 原文
GTWrap.ready;                  // 官方组件是否就绪
```

## 配置

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `page_language` | `''` | 原文语言；空 = 读 `<html lang>` |
| `languages` | `['zh-CN','en','ja']` | 胶囊里可选的语言 |
| `position` | `'bottom-left'` | 四个角随便放 |
| `auto_translate` | `''` | 载入后自动翻译成这个语言 |
| `restore_label` | `'原文'` | 菜单里"回到原文"那一项的文字 |
| `storage_key` | `'__GTWRAP_LANG'` | 记住语言的 localStorage 键 |
| `debug` | `false` | 控制台日志 |

## 它是怎么去掉横幅的

官方组件翻译后会在页面顶部插一个 40px 的 iframe 并给 `<body>` 加 `top:40px`：

```css
iframe.VIpgJd-ZVi9od-ORHb-OEVmcd { display: none !important; }              /* 横幅本体（iframe） */
body > .skiptranslate:has(> iframe.VIpgJd-ZVi9od-ORHb-OEVmcd) { display: none !important; }  /* 横幅外层 */
body > .skiptranslate[style*="height:40px"] { display: none !important; }   /* 老的浏览器兜底 */
html body { top: 0 !important; }                                            /* 被顶下去的内容 */
```

**注意**：不能直接写 `body > .skiptranslate { display: none }`。原文气泡（`#goog-gt-tt`）的外层
`div` 也是 `class="skiptranslate"`，一刀切会把气泡一起藏掉——表现就是"悬停文字变色了，但气泡不出现"。
只认"里面装着横幅 iframe"的那一个（`:has()`）才安全。

## 为什么不用自己实现翻译

谷歌这个组件走 `translate-pa.googleapis.com/v1/translateHtml`（整块 HTML 进出，标签原样保留），
但那个接口**不对第三方页面返回 CORS 头**，普通网页里根本调不通——只有组件自己（在它自己的框架里）能调。
所以正确的做法就是像这样"用它的组件、只改它的外壳"。

## 已知情况

- 需要能访问 `translate.google.com`（和官方组件一样）。
- 官方组件会把选择记在 `googtrans` cookie 里，本脚本另外记一份在 localStorage，两者会互相同步。
