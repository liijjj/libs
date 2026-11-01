/*!
 * hover-translate.js  v1.1.0
 * 网页翻译（Google 翻译接口）+ 悬停显示原文
 *
 * 不依赖 gtranslate 的 float.js / lib.min.js，单文件即可工作。
 *
 * 用法一（自动）：
 *   <script src="hover-translate.js" charset="utf-8"></script>
 *   window.hoverTranslateSettings = { default_language:'auto', languages:['zh-CN','en','ja'] };
 *
 * 用法二（手动）：
 *   HoverTranslate.translate('zh-CN');   // 翻译整页
 *   HoverTranslate.restore();            // 还原原文
 *   HoverTranslate.language;             // 当前目标语言（空字符串 = 原文）
 */
(function (window, document) {
    'use strict';

    var VERSION = '2.0.0';

    /* ------------------------------------------------------------ 语言名称 */
    var LANG_CN = {
        'af': '南非荷兰语', 'am': '阿姆哈拉语', 'ar': '阿拉伯语', 'az': '阿塞拜疆语',
        'be': '白俄罗斯语', 'bg': '保加利亚语', 'bn': '孟加拉语', 'bs': '波斯尼亚语',
        'ca': '加泰罗尼亚语', 'ceb': '宿务语', 'co': '科西嘉语', 'cs': '捷克语',
        'cy': '威尔士语', 'da': '丹麦语', 'de': '德语', 'el': '希腊语', 'en': '英语',
        'eo': '世界语', 'es': '西班牙语', 'et': '爱沙尼亚语', 'eu': '巴斯克语',
        'fa': '波斯语', 'fi': '芬兰语', 'fr': '法语', 'fy': '弗里西语', 'ga': '爱尔兰语',
        'gd': '苏格兰盖尔语', 'gl': '加利西亚语', 'gu': '古吉拉特语', 'ha': '豪萨语',
        'haw': '夏威夷语', 'he': '希伯来语', 'iw': '希伯来语', 'hi': '印地语',
        'hmn': '苗语', 'hr': '克罗地亚语', 'ht': '海地克里奥尔语', 'hu': '匈牙利语',
        'hy': '亚美尼亚语', 'id': '印尼语', 'ig': '伊博语', 'is': '冰岛语',
        'it': '意大利语', 'ja': '日语', 'jw': '爪哇语', 'ka': '格鲁吉亚语',
        'kk': '哈萨克语', 'km': '高棉语', 'kn': '卡纳达语', 'ko': '韩语',
        'ku': '库尔德语', 'ky': '吉尔吉斯语', 'la': '拉丁语', 'lb': '卢森堡语',
        'lo': '老挝语', 'lt': '立陶宛语', 'lv': '拉脱维亚语', 'mg': '马尔加什语',
        'mi': '毛利语', 'mk': '马其顿语', 'ml': '马拉雅拉姆语', 'mn': '蒙古语',
        'mr': '马拉地语', 'ms': '马来语', 'mt': '马耳他语', 'my': '缅甸语',
        'ne': '尼泊尔语', 'nl': '荷兰语', 'no': '挪威语', 'ny': '齐切瓦语',
        'pa': '旁遮普语', 'pl': '波兰语', 'ps': '普什图语', 'pt': '葡萄牙语',
        'ro': '罗马尼亚语', 'ru': '俄语', 'sd': '信德语', 'si': '僧伽罗语',
        'sk': '斯洛伐克语', 'sl': '斯洛文尼亚语', 'sm': '萨摩亚语', 'sn': '修纳语',
        'so': '索马里语', 'sq': '阿尔巴尼亚语', 'sr': '塞尔维亚语', 'st': '塞索托语',
        'su': '巽他语', 'sv': '瑞典语', 'sw': '斯瓦希里语', 'ta': '泰米尔语',
        'te': '泰卢固语', 'tg': '塔吉克语', 'th': '泰语', 'tl': '菲律宾语',
        'tr': '土耳其语', 'uk': '乌克兰语', 'ur': '乌尔都语', 'uz': '乌兹别克语',
        'vi': '越南语', 'xh': '科萨语', 'yi': '意第绪语', 'yo': '约鲁巴语',
        'zh': '中文', 'zh-CN': '简体中文', 'zh-TW': '繁体中文', 'zu': '祖鲁语'
    };

    /* ---------------------------------------------------------------- 配置 */
    var DEFAULTS = {
        default_language: 'auto',        // 原文语言，auto = 自动检测
        languages: ['zh-CN', 'en', 'ja'],// 切换器里可选的目标语言
        language_names: null,            // 自定义语言名称，如 { en:'English' }
        initial_language: '',            // 加载后自动翻译成哪种语言（空 = 不自动翻译）
        auto_translate: null,            // initial_language 的别名：'zh-CN' 即启动后自动翻译
        detect_browser_language: false,  // 首次访问时按浏览器语言自动翻译
        auto_init: true,                 // 是否在 DOM 就绪后自动初始化

        endpoint: 'https://clients5.google.com/translate_a/t',
        html_endpoint: 'https://translate-pa.googleapis.com/v1/translateHtml',
        api_key: 'AIzaSyATBXajvzQLTDHEQbcpq0Ihe0vWDHmO520',
        mode: 'text',                    // text = 文本+标记（默认，任何页面都能用）；html = 官方 translateHtml（受 CORS 限制，通常只在扩展/代理里可用）
        html_batch_chars: 30000,         // 单次 POST 里 HTML 的总字符数
        html_batch_items: 16,            // 单次 POST 里最多几块
        client: 'dict-chrome-ex',
        unit_bytes: 8000,                // 一个"块"（p/li/td…）最多多少编码字节，整段一起翻
        batch_bytes: 11000,              // 单次请求 URL 里 q 的总编码字节（实测 12KB 是上限）
        batch_items: 400,                // 单次请求最多多少段（URL 大小由 batch_bytes 兜底）
        concurrency: 3,                  // 同时几个请求
        request_gap: 60,                 // 同一并发槽内的请求间隔（毫秒）
        retries: 1,                      // 单批失败后重试次数

        ui: true,                        // 是否显示语言切换器
        ui_position: 'top-right',        // top-right / top-left / bottom-right / bottom-left
        ui_container: '',                // 渲染到某个容器里（此时不再 fixed 定位）

        tooltip: true,                   // 悬停显示原文
        show_original: null,             // tooltip 的别名：false = 只翻译、不弹原文气泡
        hover_highlight: true,           // 悬停时给译文一层浅色底
        hover_delay: 0,                  // 显示延迟（毫秒）
        hide_delay: 300,                 // 隐藏延迟（毫秒）：留出把鼠标移进气泡的时间
        source_label: '原文',

        observe: true,                   // 监听动态内容并自动翻译
        storage_key: '__HT_STATE',     // 记住上次选择的语言
        cache_key: '__HT_CACHE',       // 译文缓存（跨页面复用）
        cache_max: 3000,               // 缓存条数上限
        debug: false
    };

    var cfg = extend({}, DEFAULTS);

    /* 用户写的 show_original / auto_translate 同步到内部选项 */
    function normalizeCfg() {
        if (cfg.auto_translate !== null && cfg.auto_translate !== undefined) {
            cfg.initial_language = cfg.auto_translate || '';
        }
        if (cfg.show_original !== null && cfg.show_original !== undefined) {
            cfg.tooltip = !!cfg.show_original;
        }
    }

    /* ------------------------------------------------------------ 小工具 */
    function extend(target) {
        for (var i = 1; i < arguments.length; i++) {
            var src = arguments[i];
            if (!src) continue;
            for (var k in src) {
                if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
            }
        }
        return target;
    }

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, ms); });
    }

    function log() {
        if (!cfg.debug) return;
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[hover-translate]');
        try { console.log.apply(console, args); } catch (e) { }
    }

    function langName(code) {
        if (!code) return '';
        var custom = cfg.language_names || {};
        if (custom[code]) return custom[code];
        if (LANG_CN[code]) return LANG_CN[code];
        var base = String(code).split('-')[0];
        return LANG_CN[base] || code;
    }

    /* 判断字符里是否含有文字（避免翻译纯数字、纯符号） */
    var HAS_LETTER;
    try {
        HAS_LETTER = new RegExp('\\p{L}', 'u');
    } catch (e) {
        HAS_LETTER = /[A-Za-zÀ-ÖØ-öø-ÿ\u00c0-\u024f\u0370-\u03ff\u0400-\u04ff\u0590-\u05ff\u0600-\u06ff\u0900-\u097f\u0e00-\u0e7f\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]/;
    }

    /* ---------------------------------------------------------------- 状态 */
    var state = {
        lang: '',        // 当前目标语言，'' = 原文
        detected: '',    // 最近一次识别出的原文语言
        spans: [],       // 我们创建的所有译文 span
        empties: [],     // 被引擎整句重排后变成空的片段（只有文本节点，没有 span）
        running: false,
        again: false,
        promise: null,
        gen: 0,          // 语言切换代数，用于作废进行中的请求
        cache: {},
        cacheDirty: false,
        anchor: null,    // 当前悬停的 span
        uiBuilt: false,
        uiRoot: null
    };

    var hideTimer = 0;
    var showTimer = 0;

    /* --------------------------------------------------------------- 样式 */
    function injectCSS() {
        if (document.getElementById('ht-style')) return;
        var css = [
            /* 译文片段 */
            '.ht-s{transition:background-color .12s ease}',
            '.ht-s.ht-hl:hover{background:rgba(26,115,232,.13);border-radius:3px;box-shadow:0 0 0 2px rgba(26,115,232,.13)}',

            /* 原文气泡 */
            '.ht-tip{position:fixed;z-index:2147483647;left:0;top:0;box-sizing:border-box;',
            'max-width:min(460px,calc(100vw - 24px));background:#fff;color:#202124;',
            'border:1px solid rgba(0,0,0,.14);border-radius:10px;',
            'box-shadow:0 6px 24px rgba(0,0,0,.18),0 1px 3px rgba(0,0,0,.08);',
            'padding:9px 13px 10px;font:400 14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",Arial,sans-serif;',
            'text-align:left;word-break:break-word;overflow-wrap:break-word;',
            'pointer-events:auto;opacity:0;visibility:hidden;transform:translateY(3px);user-select:text;',
            'transition:opacity .12s ease,transform .12s ease,visibility .12s}',

            '.ht-tip.ht-on{opacity:1;visibility:visible;transform:none}',
            '.ht-tip .ht-tip-l{font-size:11px;line-height:1.4;color:#80868b;margin:0 0 3px;letter-spacing:.02em}',
            '.ht-tip .ht-tip-t{white-space:normal;max-height:52vh;overflow:auto;overscroll-behavior:contain}',
            '.ht-tip .ht-mark{background:#fff1a8;color:inherit;padding:0 1px;border-radius:2px}',
            '.ht-tip .ht-arrow{position:absolute;width:9px;height:9px;background:#fff}',
            '.ht-tip[data-pos="below"] .ht-arrow{top:-5px;border-top:1px solid rgba(0,0,0,.14);border-left:1px solid rgba(0,0,0,.14);transform:rotate(45deg)}',
            '.ht-tip[data-pos="above"] .ht-arrow{bottom:-5px;border-right:1px solid rgba(0,0,0,.14);border-bottom:1px solid rgba(0,0,0,.14);transform:rotate(45deg)}',

            /* 语言切换器 */
            '.ht-sw{position:fixed;z-index:2147483000;font:400 13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",Arial,sans-serif;color:#3c4043}',
            '.ht-sw[data-pos="top-right"]{top:12px;right:12px}',
            '.ht-sw[data-pos="top-left"]{top:12px;left:12px}',
            '.ht-sw[data-pos="bottom-right"]{bottom:12px;right:12px}',
            '.ht-sw[data-pos="bottom-left"]{bottom:12px;left:12px}',
            '.ht-sw[data-pos$="right"] .ht-sw-menu{left:auto;right:0}',
            '.ht-sw[data-pos^="bottom"] .ht-sw-menu{top:auto;bottom:calc(100% + 6px)}',
            '.ht-sw.ht-static{position:static}',            '.ht-sw-cur{display:inline-flex;align-items:center;gap:7px;background:#fff;border:1px solid rgba(0,0,0,.13);',
            'border-radius:999px;padding:6px 13px;box-shadow:0 1px 4px rgba(0,0,0,.13);cursor:pointer;font:inherit;color:inherit}',
            '.ht-sw-cur:hover{box-shadow:0 2px 8px rgba(0,0,0,.18)}',
            '.ht-sw-arrow{width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid #5f6368}',
            '.ht-sw-menu{position:absolute;top:calc(100% + 6px);left:0;min-width:132px;max-height:60vh;overflow:auto;',
            'background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.18);padding:4px;display:none}',
            '.ht-sw.ht-open .ht-sw-menu{display:block}',
            '.ht-sw-menu button{display:block;width:100%;text-align:left;background:none;border:0;padding:7px 11px;border-radius:6px;',
            'cursor:pointer;font:inherit;color:inherit;white-space:nowrap}',
            '.ht-sw-menu button:hover{background:#f1f3f4}',
            '.ht-sw-menu button[aria-selected="true"]{color:#1a73e8;font-weight:600}'
        ].join('');
        var style = document.createElement('style');
        style.id = 'ht-style';
        style.appendChild(document.createTextNode(css));
        (document.head || document.documentElement).appendChild(style);
    }

    /* ------------------------------------------------------- 原文气泡 */
    var tip, tipLabel, tipText, tipArrow;

    function buildTip() {
        if (tip) return;
        tip = document.createElement('div');
        tip.className = 'ht-tip';
        tip.setAttribute('translate', 'no');
        tip.setAttribute('role', 'tooltip');
        tipLabel = document.createElement('div');
        tipLabel.className = 'ht-tip-l';
        tipText = document.createElement('div');
        tipText.className = 'ht-tip-t';
        tipArrow = document.createElement('div');
        tipArrow.className = 'ht-arrow';
        tip.appendChild(tipLabel);
        tip.appendChild(tipText);
        tip.appendChild(tipArrow);
        document.body.appendChild(tip);
    }

    function placeTip(span) {
        var r = span.getBoundingClientRect();
        var vw = window.innerWidth || document.documentElement.clientWidth;
        var vh = window.innerHeight || document.documentElement.clientHeight;

        var px = r.left + (state.dx || 0);
        var py = r.top + (state.dy || 0);

        tip.style.left = '0px';
        tip.style.top = '0px';
        var tw = tip.offsetWidth;
        var th = tip.offsetHeight;

        var below = (vh - py) > th + 26 || py < th + 26;
        var top = below ? py + 20 : py - th - 20;
        if (top + th > vh - 8) { top = Math.max(8, py - th - 20); below = false; }
        if (top < 8) { top = py + 20; below = true; }

        var left = Math.max(8, Math.min(px - tw / 2, vw - tw - 8));

        tip.style.left = Math.round(left) + 'px';
        tip.style.top = Math.round(top) + 'px';
        tip.setAttribute('data-pos', below ? 'below' : 'above');

        // 箭头对准鼠标所指的位置
        var ax = px - left - 6;
        ax = Math.max(11, Math.min(tw - 22, ax));
        tipArrow.style.left = Math.round(ax) + 'px';
    }

    /* 悬停时展示"整段原文"：段落不长就整段，长了就取包含该片段的那一句 */
    var SENT_END = /[.!?。！？…\n]/;

    function blockSlice(text, range) {
        if (!range) return { text: text, a: -1, b: -1 };
        var a = range[0], b = range[1];
        if (text.length <= 220) return { text: text, a: a, b: b };

        var start = Math.max(0, a - 200);
        var end = Math.min(text.length, b + 200);
        for (var i = a; i > start; i--) {
            if (SENT_END.test(text.charAt(i - 1))) { start = i; break; }
        }
        for (var j = b; j < end; j++) {
            if (SENT_END.test(text.charAt(j))) { end = j + 1; break; }
        }
        if (end - start > 700) {
            start = Math.max(start, a - 250);
            end = Math.min(end, b + 250);
        }
        return { text: text.slice(start, end), a: a - start, b: b - start };
    }

    function renderTipText(v) {
        tipText.textContent = '';
        var t = v.text || '';
        // 片段就是整段（或没定位到）时不做高亮，整段都变黄反而奇怪
        if (v.a < 0 || v.a >= v.b || (v.a === 0 && v.b >= t.length)) {
            tipText.textContent = t;
            return;
        }
        tipText.appendChild(document.createTextNode(t.slice(0, v.a)));
        var mk = document.createElement('mark');
        mk.className = 'ht-mark';
        mk.textContent = t.slice(v.a, v.b);
        tipText.appendChild(mk);
        tipText.appendChild(document.createTextNode(t.slice(v.b)));
    }

    function showTip(span, x, y) {
        if (!cfg.tooltip || !span || !span.__ht) return;
        clearTimeout(hideTimer);
        var g = span.__ht;
        var name = langName(g.src);
        tipLabel.textContent = cfg.source_label + (name ? ' · ' + name : '');
        // 直接给整段原文（不标黄：跨标签重排时高亮必然会指错，宁可不要）
        tipText.textContent = g.block || g.core;

        // 记住鼠标在片段内的相对位置，滚动时保持跟随
        var r = span.getBoundingClientRect();
        if (typeof x === 'number' && typeof y === 'number') {
            state.dx = Math.min(Math.max(x - r.left, 0), r.width || 0);
            state.dy = Math.min(Math.max(y - r.top, 0), r.height || 0);
        } else {
            state.dx = Math.min(r.width || 0, 240) / 2;
            state.dy = r.height || 0;
        }

        state.anchor = span;
        placeTip(span);
        tip.classList.add('ht-on');
    }

    function hideTip(now) {
        if (!tip) return;
        clearTimeout(hideTimer);
        if (now) {
            tip.classList.remove('ht-on');
            state.anchor = null;
        } else {
            hideTimer = setTimeout(function () {
                tip.classList.remove('ht-on');
                state.anchor = null;
            }, cfg.hide_delay);
        }
    }

    function segOf(node) {
        while (node && node.nodeType === 1) {
            if (node.classList && node.classList.contains('ht-s')) return node;
            node = node.parentNode;
        }
        return null;
    }

    function bindHover() {
        // 鼠标移进气泡就留住它，方便选中复制；移出去再走延迟隐藏
        if (tip) {
            tip.addEventListener('mouseenter', function () { clearTimeout(hideTimer); });
            tip.addEventListener('mouseleave', function () { hideTip(); });
        }

        document.addEventListener('mouseover', function (e) {
            if (tip && tip.contains(e.target)) { clearTimeout(hideTimer); return; }
            var s = segOf(e.target);
            if (s) {
                var a = state.anchor;
                if (a && a !== s) hideTip(true);
                if (!a || a !== s) {
                    var run = function () { showTip(s, e.clientX, e.clientY); };
                    if (cfg.hover_delay > 0) { clearTimeout(showTimer); showTimer = setTimeout(run, cfg.hover_delay); }
                    else run();
                }
            } else if (state.anchor && !segOf(e.relatedTarget)) {
                hideTip();
            }
        }, false);

        document.addEventListener('mouseout', function (e) {
            if (tip && tip.contains(e.target)) return;
            var s = segOf(e.target);
            if (!s) return;
            if (e.relatedTarget && s.contains(e.relatedTarget)) return;
            clearTimeout(showTimer);
            hideTip();
        }, false);

        // 触屏：轻点译文也能看到原文
        document.addEventListener('touchstart', function (e) {
            var s = segOf(e.target);
            if (s) {
                var t = e.touches && e.touches[0];
                showTip(s, t && t.clientX, t && t.clientY);
                clearTimeout(hideTimer);
                hideTimer = setTimeout(function () { hideTip(true); }, 5000);
            } else {
                hideTip(true);
            }
        }, false);

        window.addEventListener('scroll', function () {
            if (state.anchor && tip && tip.classList.contains('ht-on')) placeTip(state.anchor);
        }, true);

        window.addEventListener('resize', function () {
            if (state.anchor) placeTip(state.anchor);
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') hideTip(true);
        });
    }

    /* ------------------------------------------------------------ 扫描文本 */
    var SKIP_TAGS = {
        SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, IFRAME: 1, CANVAS: 1, SVG: 1, MATH: 1,
        TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1,
        CODE: 1, PRE: 1, KBD: 1, SAMP: 1, VAR: 1, HEAD: 1, TITLE: 1, TEMPLATE: 1,
        VIDEO: 1, AUDIO: 1, OBJECT: 1, EMBED: 1
    };

    function isExcluded(el) {
        var tag = el.tagName;
        if (SKIP_TAGS[tag]) return true;
        if (el.isContentEditable) return true;
        if (el.closest) {
            if (el.closest('.ht-tip,.ht-sw,.notranslate,[translate="no"],[contenteditable="true"]')) return true;
        } else {
            var p = el;
            while (p && p.nodeType === 1) {
                if (p.classList && (p.classList.contains('notranslate') || p.classList.contains('ht-tip') || p.classList.contains('ht-sw'))) return true;
                if (p.getAttribute && p.getAttribute('translate') === 'no') return true;
                p = p.parentNode;
            }
        }
        return false;
    }

    function makeSegment(node) {
        var raw = node.nodeValue;
        if (!raw) return null;
        var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(raw);
        // 折叠源码里的换行/多空格，避免译文出现奇怪的断行
        var core = m[2].replace(/\s+/g, ' ');
        if (!core || !HAS_LETTER.test(core)) return null;
        return { node: node, raw: raw, lead: m[1], core: core, trail: m[3] };
    }

    function scan(root, out) {
        var node = root.firstChild;
        while (node) {
            if (node.nodeType === 1) {
                if (!isExcluded(node)) scan(node, out);
            } else if (node.nodeType === 3) {                var seg = makeSegment(node);
                if (seg) out.push(seg);
            }
            node = node.nextSibling;
        }
    }

    /* ---------------------------------------------------- 按"块"合并成翻译单元 */
    var BLOCK_TAGS = {
        P: 1, DIV: 1, LI: 1, TD: 1, TH: 1, TR: 1, TABLE: 1, UL: 1, OL: 1, DL: 1,
        DD: 1, DT: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, BLOCKQUOTE: 1,
        FIGCAPTION: 1, FIGURE: 1, SECTION: 1, ARTICLE: 1, ASIDE: 1, HEADER: 1,
        FOOTER: 1, NAV: 1, MAIN: 1, FORM: 1, FIELDSET: 1, DETAILS: 1, SUMMARY: 1,
        ADDRESS: 1, BODY: 1
    };

    var MARK_A = '[[ht', MARK_B = ']]';
    var MARK_RE = /\[\[ht\d+\]\]/g;

    function blockOf(node) {
        var p = node.parentNode;
        while (p && p.nodeType === 1) {
            if (BLOCK_TAGS[p.tagName]) return p;
            p = p.parentNode;
        }
        return document.body;
    }

    /* 以"块"为单位（一个 p / li / td …）：整段送去翻译，回来再按标记切回各片段 */
    function collectUnits() {
        var segs = [];
        scan(document.body, segs);

        var units = [], cur = null, curBlock = null;
        for (var i = 0; i < segs.length; i++) {
            var seg = segs[i];
            var block = blockOf(seg.node);
            var enc = encodeURIComponent(seg.core).length;
            if (cur && block === curBlock && cur.bytes + enc <= cfg.unit_bytes) {
                cur.parts.push(seg);
                cur.bytes += enc;
            } else {
                cur = { parts: [seg], block: block, bytes: enc };
                units.push(cur);
                curBlock = block;
            }
        }

        for (var j = 0; j < units.length; j++) {
            var u = units[j];
            if (u.parts.length === 1) {
                u.text = u.parts[0].core;
            } else {
                var s = '';
                for (var k = 0; k < u.parts.length; k++) {
                    // 标记两侧留空格，避免译文把相邻词粘成一个词
                    if (k) s += ' ' + MARK_A + k + MARK_B + ' ';
                    s += u.parts[k].core;
                }
                u.text = s;
            }
        }
        return units;
    }

    /* 整块原文（含不含翻译的内联内容）+ 每个片段在其中的位置，供悬停时展示完整句子 */
    function blockInfo(block, parts) {
        var text = ((block && block.textContent) || '').replace(/\s+/g, ' ').trim();
        var ranges = [], pos = 0;
        for (var i = 0; i < parts.length; i++) {
            var core = parts[i].core;
            var idx = text.indexOf(core, pos);
            if (idx < 0) { ranges.push(null); continue; }
            ranges.push([idx, idx + core.length]);
            pos = idx + core.length;
        }
        return { text: text, ranges: ranges };
    }

    function applyUnit(unit, row) {
        var parts = unit.parts;
        var info = blockInfo(unit.block, parts);

        if (parts.length === 1) {
            applySeg(parts[0], row, undefined, undefined, { text: info.text, range: info.ranges[0] });
            return;
        }
        var pieces = row.text.split(MARK_RE);
        if (pieces.length !== parts.length) {
            // 标记没保住：整段塞进第一个片段，其余清空，至少不会中英混排
            applySeg(parts[0], { text: row.text.replace(MARK_RE, ' ').replace(/\s+/g, ' ').trim(), src: row.src },
                undefined, undefined, { text: info.text, range: info.ranges[0] });
            for (var m = 1; m < parts.length; m++) {
                applySeg(parts[m], { text: '', src: row.src }, undefined, undefined,
                    { text: info.text, range: info.ranges[m] }, true);
            }
            return;
        }
        for (var i = 0; i < parts.length; i++) {
            var text = pieces[i].replace(/^\s+|\s+$/g, '');
            var lead = parts[i].lead;
            var trail = parts[i].trail;
            var prev = i > 0 ? pieces[i - 1].replace(/\s+$/, '') : '';
            var next = i < parts.length - 1 ? pieces[i + 1].replace(/^\s+/, '') : '';

            // 中文原文片段之间本来没有空格，译成英文后需要补上；中英各自两端都不该有
            if (!lead && needsSpace(prev, text)) lead = ' ';
            if (!trail && needsSpace(text, next)) trail = ' ';
            if (i > 0 && cjkEdge(prev, true) && cjkEdge(text, false)) lead = '';
            if (i < parts.length - 1 && cjkEdge(text, true) && cjkEdge(next, false)) trail = '';

            applySeg(parts[i], { text: text, src: row.src }, lead, trail,
                { text: info.text, range: info.ranges[i] }, text === '');
        }
    }

    /* ------------------------------------------------------------ 译文应用 */
    function applySeg(seg, row, lead, trail, info, empty) {
        var node = seg.node;
        var parent = node.parentNode;
        if (!parent || node.nodeValue !== seg.raw) return false;

        var l = lead === undefined ? seg.lead : lead;
        var t = trail === undefined ? seg.trail : trail;

        // 译文把这一段的文字挪到相邻片段去了（引擎整句重排）：留个空文本节点，
        // 不生成 span，避免"空片段"在行首变成一个假的悬停热区
        if (empty) {
            node.nodeValue = l + t;
            state.empties.push({ node: node, orig: seg.raw });
            return true;
        }

        var span = document.createElement('span');
        span.className = 'ht-s' + ((cfg.hover_highlight && cfg.tooltip) ? ' ht-hl' : '');
        span.setAttribute('translate', 'no');
        var out = (row.text === undefined || row.text === null) ? seg.core : row.text;
        span.textContent = l + out + t;
        span.__ht = {
            orig: seg.raw,
            core: seg.core,
            src: row.src || '',
            block: info && info.text || seg.core,
            range: info && info.range || null
        };

        parent.replaceChild(span, node);
        state.spans.push(span);
        return true;
    }

    /* 译文是中日韩文字时，去掉片段之间多余的空格（"作为 共和党成员" → "作为共和党成员"） */
    var CJK_CHAR = /[\u3000-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/;
    function cjkEdge(s, atEnd) {
        if (!s) return false;
        s = s.replace(/^\s+|\s+$/g, '');
        if (!s) return false;
        return CJK_CHAR.test(atEnd ? s.charAt(s.length - 1) : s.charAt(0));
    }

    /* 反过来：中文原文片段拼成英文时，需要补一个空格 */
    function needsSpace(a, b) {
        if (!a || !b) return false;
        var x = a.charAt(a.length - 1), y = b.charAt(0);
        if (/[\s\u3000]/.test(x) || /[\s\u3000]/.test(y)) return false;
        return /[A-Za-z0-9,;:.!?%)\]]/.test(x) && /[A-Za-z0-9(\[]/.test(y);
    }

    function restoreSpans() {
        for (var i = 0; i < state.spans.length; i++) {
            var span = state.spans[i];
            if (span.parentNode && span.__ht) {
                span.parentNode.replaceChild(document.createTextNode(span.__ht.orig), span);
            }
        }
        state.spans.length = 0;

        for (var e = 0; e < state.empties.length; e++) {
            var it = state.empties[e];
            if (it.node) it.node.nodeValue = it.orig;
        }
        state.empties.length = 0;
    }

    /* ------------------------------------------------------------ 翻译请求 */
    function requestBatch(texts, from, to) {
        var url = cfg.endpoint + '?client=' + encodeURIComponent(cfg.client) +
            '&sl=' + encodeURIComponent(from || 'auto') +
            '&tl=' + encodeURIComponent(to);
        for (var i = 0; i < texts.length; i++) {
            url += '&q=' + encodeURIComponent(texts[i]);
        }

        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.timeout = 20000;
            xhr.onload = function () {
                if (xhr.status < 200 || xhr.status >= 300) {
                    reject(new Error('HTTP ' + xhr.status));
                    return;
                }
                var data;
                try { data = JSON.parse(xhr.responseText); } catch (e) { reject(e); return; }
                resolve(normalize(data, texts.length));
            };
            xhr.onerror = function () { reject(new Error('网络错误')); };
            xhr.ontimeout = function () { reject(new Error('请求超时')); };
            xhr.send(null);
        });
    }

    /* 返回 [{ text, src }] ── 与传入的 texts 一一对应 */
    function normalize(data, n) {
        var out = [];
        if (!data || !data.length) return out;

        // 三种返回形态：
        //   A 单个 q + sl=auto: ["译文", "en"]
        //   B 多个 q + sl=auto: [["译文","en"], ["译文","en"], ...]
        //   C 任意 q + 固定 sl: ["译文1", "译文2", ...]
        var rows;
        if (typeof data[0] === 'string') {
            rows = (n === 1) ? [[data[0], data[1] || '']]
                : data.map(function (t) { return [t, '']; });
        } else {
            rows = data;
        }

        for (var i = 0; i < n; i++) {
            var row = rows[i];
            if (!row) { out.push(null); continue; }
            if (typeof row === 'string') { out.push({ text: row, src: '' }); continue; }
            out.push({ text: row[0] || '', src: row[1] || '' });
        }
        return out;
    }

    /* --------------------------------------------------------------- 缓存 */
    function cacheKey(lang, text) { return lang + '\u0000' + text; }

    function cacheGet(lang, text) {
        var v = state.cache[cacheKey(lang, text)];
        return v || null;
    }

    function cacheSet(lang, text, row) {
        state.cache[cacheKey(lang, text)] = row;
        state.cacheDirty = true;
        scheduleCacheSave();
    }

    function loadCache() {
        try {
            var raw = localStorage.getItem(cfg.cache_key);
            if (raw) state.cache = JSON.parse(raw) || {};
        } catch (e) { state.cache = {}; }
    }

    var saveTimer = 0;
    function scheduleCacheSave() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveCache, 2000);
    }

    function saveCache() {
        if (!state.cacheDirty) return;
        state.cacheDirty = false;
        try {
            var keys = Object.keys(state.cache);
            var max = cfg.cache_max | 0 || 3000;
            if (keys.length > max) {
                var dropped = {};
                for (var i = keys.length - max; i < keys.length; i++) dropped[keys[i]] = state.cache[keys[i]];
                state.cache = dropped;
            }
            localStorage.setItem(cfg.cache_key, JSON.stringify(state.cache));
        } catch (e) { /* 隐私模式或超出配额，忽略 */ }
    }

    /* --------------------------------------------------------------- 状态存储 */
    function saveState() {
        try {
            localStorage.setItem(cfg.storage_key, JSON.stringify({ lang: state.lang }));
        } catch (e) { }
    }

    function loadState() {
        try {
            var raw = localStorage.getItem(cfg.storage_key);
            if (raw) return JSON.parse(raw);
        } catch (e) { }
        // 兼容旧版 gtranslate 留下的记录
        try {
            var old = localStorage.getItem('__GT_TRANSLATE_LANGS');
            if (old) {
                var o = JSON.parse(old);
                if (o && o.tgtLang) return { lang: o.tgtLang };
            }
        } catch (e) { }
        return null;
    }

    /* ------------------------------------------------------------ 主翻译流程 */
    function chunkUnits(list) {
        var batches = [], cur = [], bytes = 0;
        for (var i = 0; i < list.length; i++) {
            var u = list[i];
            // 按"编码后字节"控制 URL 长度：中文一字 3 字节，英文 1 字节
            var enc = encodeURIComponent(u.text).length + 8;
            if (cur.length && (bytes + enc > cfg.batch_bytes || cur.length >= cfg.batch_items)) {
                batches.push(cur); cur = []; bytes = 0;
            }
            cur.push(u);
            bytes += enc;
        }
        if (cur.length) batches.push(cur);
        return batches;
    }

    /* 固定并发数的任务池 */
    function pool(tasks, concurrency) {
        return new Promise(function (resolve) {
            var i = 0, active = 0;
            function next() {
                if (i >= tasks.length && active === 0) { resolve(); return; }
                while (active < concurrency && i < tasks.length) {
                    active++;
                    Promise.resolve().then(tasks[i++]).then(done, done);
                }
            }
            function done() { active--; next(); }
            next();
        });
    }

    /* -------------------------------------------- 整块 HTML 模式（官方组件路线） */
    function requestHtml(htmls, from, to) {
        var body = JSON.stringify([[htmls, from || 'auto', to], 'te_lib']);
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', cfg.html_endpoint, true);
            xhr.setRequestHeader('X-goog-api-key', cfg.api_key);
            xhr.setRequestHeader('Content-Type', 'application/json+protobuf');
            xhr.timeout = 30000;
            xhr.onload = function () {
                if (xhr.status < 200 || xhr.status >= 300) { reject(new Error('HTTP ' + xhr.status)); return; }
                var data;
                try { data = JSON.parse(xhr.responseText); } catch (e) { reject(e); return; }
                var list = data && data[0];
                if (!list || !list.length) { reject(new Error('响应为空')); return; }
                resolve(list);
            };
            xhr.onerror = function () { reject(new Error('网络错误')); };
            xhr.ontimeout = function () { reject(new Error('请求超时')); };
            xhr.send(body);
        });
    }

    function textNodesOf(root) {
        var out = [], w = document.createTreeWalker(root, 4, null, false), n;
        while ((n = w.nextNode())) {
            if (n.nodeValue && n.nodeValue.replace(/\s+/g, '').length) out.push(n);
        }
        return out;
    }

    function hasBlockChild(el) {
        for (var c = el.firstChild; c; c = c.nextSibling) {
            if (c.nodeType !== 1) continue;
            if (BLOCK_TAGS[c.tagName]) return true;
            if (hasBlockChild(c)) return true;
        }
        return false;
    }

    function hasExcluded(block) {
        return !!block.querySelector('code,pre,script,style,textarea,kbd,samp,var,[translate="no"],.notranslate');
    }

    function wrapNode(node, lead, text, trail, meta) {
        var parent = node.parentNode;
        if (!parent) return;
        var span = document.createElement('span');
        span.className = 'ht-s' + ((cfg.hover_highlight && cfg.tooltip) ? ' ht-hl' : '');
        span.setAttribute('translate', 'no');
        span.textContent = lead + text + trail;
        span.__ht = meta;
        parent.replaceChild(span, node);
        state.spans.push(span);
    }

    /* 按标签树严格配对文本节点；结构不一致返回 false */
    function mapTextNodes(a, b, out) {
        var x = a.firstChild, y = b.firstChild;
        while (x || y) {
            if (x && x.nodeType === 3 && !x.nodeValue.replace(/\s+/g, '')) { x = x.nextSibling; continue; }
            if (y && y.nodeType === 3 && !y.nodeValue.replace(/\s+/g, '')) { y = y.nextSibling; continue; }
            if (!x || !y) return false;
            if (x.nodeType === 3 && y.nodeType === 3) {
                out.push([x, y]);
                x = x.nextSibling; y = y.nextSibling; continue;
            }
            if (x.nodeType === 1 && y.nodeType === 1 && x.tagName === y.tagName) {
                if (!mapTextNodes(x, y, out)) return false;
                x = x.nextSibling; y = y.nextSibling; continue;
            }
            return false;
        }
        return true;
    }

    function flatPairs(a, b) {
        var xs = textNodesOf(a), ys = textNodesOf(b);
        if (!xs.length || xs.length !== ys.length) return null;
        var out = [];
        for (var i = 0; i < xs.length; i++) out.push([xs[i], ys[i]]);
        return out;
    }

    /* 原文块 → 译文 HTML → 写回各文本节点（标签结构由 Google 原样保留） */
    function applyBlockHtml(block, html, srcLang) {
        var holder = document.createElement('div');
        holder.innerHTML = html;

        var pairs = [];
        var exact = mapTextNodes(block, holder, pairs);
        if (!exact) {
            pairs = flatPairs(block, holder);
            if (!pairs) return false;   // 文本节点数量都对不上，交给文本模式
        }

        var blockText = (block.textContent || '').replace(/\s+/g, ' ').trim();
        var items = [], cursor = 0, i;

        for (i = 0; i < pairs.length; i++) {
            var node = pairs[i][0];
            var raw = node.nodeValue;
            var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(raw);
            var core = m[2].replace(/\s+/g, ' ');
            var text = (pairs[i][1].nodeValue || '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');

            var start = core ? blockText.indexOf(core, cursor) : -1;
            if (start >= 0) cursor = start + core.length;

            items.push({
                node: node, raw: raw, core: core, text: text,
                lead: m[1], trail: m[3],
                range: start >= 0 ? [start, start + core.length] : null
            });
        }

        // 片段之间补/去空格（中文原文拼英文要空格，中文译文之间不要）
        for (i = 0; i < items.length; i++) {
            var prev = i > 0 ? items[i - 1].text : '';
            var next = i < items.length - 1 ? items[i + 1].text : '';
            if (!items[i].lead && needsSpace(prev, items[i].text)) items[i].lead = ' ';
            if (!items[i].trail && needsSpace(items[i].text, next)) items[i].trail = ' ';
            if (prev && cjkEdge(prev, true) && cjkEdge(items[i].text, false)) items[i].lead = '';
            if (next && cjkEdge(items[i].text, true) && cjkEdge(next, false)) items[i].trail = '';
        }

        for (i = 0; i < items.length; i++) {
            var it = items[i];
            if (!it.text) {
                it.node.nodeValue = it.lead + it.trail;
                state.empties.push({ node: it.node, orig: it.raw });
                continue;
            }
            wrapNode(it.node, it.lead, it.text, it.trail, {
                orig: it.raw,
                core: it.core,
                src: srcLang || '',
                block: blockText,
                range: it.range,
                approx: !exact
            });
        }
        return true;
    }

    function collectBlocks() {
        var segs = [];
        scan(document.body, segs);
        var blocks = [], seen = [];
        for (var i = 0; i < segs.length; i++) {
            var b = blockOf(segs[i].node);
            if (seen.indexOf(b) >= 0) continue;
            seen.push(b);
            blocks.push(b);
        }
        return blocks;
    }

    function chunkBlocks(list) {
        var batches = [], cur = [], chars = 0;
        for (var i = 0; i < list.length; i++) {
            var b = list[i];
            var len = b.html.length;
            if (cur.length && (chars + len > cfg.html_batch_chars || cur.length >= cfg.html_batch_items)) {
                batches.push(cur); cur = []; chars = 0;
            }
            cur.push(b); chars += len;
        }
        if (cur.length) batches.push(cur);
        return batches;
    }

    function cachePut(key, val) {
        state.cache[key] = val;
        state.cacheDirty = true;
        scheduleCacheSave();
    }

    function runHtml(gen, lang) {
        var blocks = collectBlocks();
        var todo = [];

        for (var i = 0; i < blocks.length; i++) {
            var b = blocks[i];
            if (hasBlockChild(b) || hasExcluded(b)) continue;
            if (b.querySelector && b.querySelector('.ht-s')) continue;
            var html = b.innerHTML;
            if (!html || !html.replace(/<[^>]*>/g, '').trim()) continue;

            var key = 'h|' + lang + '|' + html;
            var hit = state.cache[key];
            if (hit && hit.html) { applyBlockHtml(b, hit.html, hit.src); continue; }
            todo.push({ el: b, html: html, key: key });
        }
        if (!todo.length) return Promise.resolve();

        var batches = chunkBlocks(todo);
        var fails = 0, stop = false;

        var tasks = batches.map(function (batch) {
            return function () {
                if (gen !== state.gen || stop) return Promise.resolve();
                var htmls = batch.map(function (x) { return x.html; });
                return requestHtml(htmls, cfg.default_language, lang).then(function (out) {
                    if (gen !== state.gen) return;
                    for (var k = 0; k < batch.length; k++) {
                        var item = batch[k], html = out[k];
                        if (!html) { fails++; continue; }
                        if (!applyBlockHtml(item.el, html, '')) { fails++; continue; }
                        cachePut(item.key, { html: html, src: '' });
                    }
                    updateUI();
                }, function (err) {
                    log('HTML 模式失败：', err && err.message);
                    fails++;
                    if (fails >= 3) stop = true;
                });
            };
        });

        return pool(tasks, 2);
    }

    function runTranslation(gen, lang) {
        if (cfg.mode === 'text') return runTranslationText(gen, lang);
        return runHtml(gen, lang).then(function () {
            if (gen !== state.gen) return;
            // 剩下的（结构对不上 / 含代码块 / 嵌套块）退回文本模式，能翻多少算多少
            return runTranslationText(gen, lang);
        });
    }

    function runTranslationText(gen, lang) {
        var units = collectUnits();
        if (gen !== state.gen) return Promise.resolve();

        var pending = [];
        for (var i = 0; i < units.length; i++) {
            var hit = cacheGet(lang, units[i].text);
            if (hit) applyUnit(units[i], hit);
            else pending.push(units[i]);
        }
        log('待翻译块：', pending.length, '并发：', cfg.concurrency);

        var batches = chunkUnits(pending);
        var fails = 0;
        var STOP_AFTER = 5;   // 连续失败这么多次就停手，避免把限流打成封禁

        function runBatch(batch, depth) {
            if (gen !== state.gen || fails >= STOP_AFTER) return Promise.resolve();

            var uniq = [], index = {};
            for (var k = 0; k < batch.length; k++) {
                var t = batch[k].text;
                if (!(t in index)) { index[t] = uniq.length; uniq.push(t); }
            }

            return requestBatch(uniq, cfg.default_language, lang).then(function (rows) {
                // 语言已经切换，这批结果作废（缓存仍保留，下次可用）
                if (gen !== state.gen) return;

                for (var k = 0; k < uniq.length; k++) {
                    var row = rows[k];
                    if (!row || !row.text) continue;
                    var val = { text: row.text, src: row.src || '' };
                    if (row.src) state.detected = row.src;
                    cacheSet(lang, uniq[k], val);
                }
                for (var j = 0; j < batch.length; j++) {
                    var row2 = rows[index[batch[j].text]];
                    if (row2 && row2.text) applyUnit(batch[j], row2);
                }
                fails = 0;
                updateUI();
                return sleep(cfg.request_gap);
            }, function (err) {
                if (gen !== state.gen) return;
                log('翻译失败：', err && err.message, '批次', batch.length, '深度', depth);

                // 先退避一下；还是不行就把批次劈成两半再试（多半是 URL 太长或临时限流）
                return sleep(250 + 350 * (depth + 1) + Math.random() * 250).then(function () {
                    if (batch.length > 1 && depth < 3) {
                        var mid = Math.ceil(batch.length / 2);
                        return runBatch(batch.slice(0, mid), depth + 1).then(function () {
                            return runBatch(batch.slice(mid), depth + 1);
                        });
                    }
                    fails++;
                });
            });
        }

        var tasks = batches.map(function (batch) {
            return function () { return runBatch(batch, 0); };
        });

        return pool(tasks, Math.max(1, cfg.concurrency | 0)).then(function () {
            if (gen === state.gen) updateUI();
        });
    }

    function translatePage() {
        if (!state.lang) return Promise.resolve();
        if (state.running) { state.again = true; return state.promise; }

        var gen = state.gen;
        var lang = state.lang;
        state.running = true;
        state.promise = runTranslation(gen, lang).then(function () {
            state.running = false;
            updateUI();
            if (gen === state.gen) fire('ht:done', { lang: lang, count: state.spans.length });
            if (state.again) { state.again = false; translatePage(); }
            return state.lang;
        }, function (err) {
            state.running = false;
            updateUI();
            fire('ht:error', { error: err });
        });
        return state.promise;
    }

    /* ------------------------------------------------------------------ API */
    function translate(lang) {
        if (!lang) return restore();
        if (state.lang !== lang) {
            state.gen++;
            restoreSpans();
            state.lang = lang;
        }
        saveState();
        updateUI();
        buildTip();
        return translatePage();
    }

    function restore() {
        state.gen++;
        state.lang = '';
        restoreSpans();
        hideTip(true);
        saveState();
        updateUI();
        fire('ht:restore', {});
        return Promise.resolve();
    }

    function fire(name, detail) {
        try {
            var ev;
            if (typeof CustomEvent === 'function') {
                ev = new CustomEvent(name, { detail: detail, bubbles: true });
            } else {
                ev = document.createEvent('CustomEvent');
                ev.initCustomEvent(name, true, true, detail);
            }
            document.dispatchEvent(ev);
        } catch (e) { }
    }

    /* ---------------------------------------------------------- 语言切换器 */
    function buildUI() {
        if (!cfg.ui || state.uiBuilt) return;
        state.uiBuilt = true;

        var langs = cfg.languages || [];
        var root = document.createElement('div');
        root.className = 'ht-sw';
        root.setAttribute('translate', 'no');
        root.setAttribute('data-pos', cfg.ui_position || 'top-right');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ht-sw-cur';
        btn.setAttribute('aria-haspopup', 'true');
        var nameEl = document.createElement('span');
        nameEl.className = 'ht-sw-name';
        var arrow = document.createElement('span');
        arrow.className = 'ht-sw-arrow';
        btn.appendChild(nameEl);
        btn.appendChild(arrow);

        var menu = document.createElement('div');
        menu.className = 'ht-sw-menu';
        menu.setAttribute('role', 'menu');

        var all = [{ code: '', name: '原文' }];
        for (var i = 0; i < langs.length; i++) {
            all.push({ code: langs[i], name: langName(langs[i]) });
        }

        all.forEach(function (item) {
            var b = document.createElement('button');
            b.type = 'button';
            b.setAttribute('role', 'menuitem');
            b.setAttribute('data-lang', item.code);
            b.textContent = item.name;
            b.addEventListener('click', function (e) {
                e.stopPropagation();
                root.classList.remove('ht-open');
                if (item.code) translate(item.code); else restore();
            });
            menu.appendChild(b);
        });

        root.appendChild(btn);
        root.appendChild(menu);

        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            root.classList.toggle('ht-open');
        });
        document.addEventListener('click', function () { root.classList.remove('ht-open'); });

        state.uiRoot = root;
        state.uiName = nameEl;
        applyUILayout();
        updateUI();
    }

    /* 位置 / 容器：初始化时和 config() 里都能生效 */
    function applyUILayout() {
        var root = state.uiRoot;
        if (!root) return;
        var host = cfg.ui_container ? document.querySelector(cfg.ui_container) : null;
        if (host) {
            root.classList.add('ht-static');
            if (root.parentNode !== host) host.appendChild(root);
        } else {
            root.classList.remove('ht-static');
            if (root.parentNode !== document.body) document.body.appendChild(root);
        }
        root.setAttribute('data-pos', cfg.ui_position || 'top-right');
    }

    function updateUI() {
        if (!state.uiRoot) return;
        var label = state.lang ? langName(state.lang) : '原文';
        if (state.running && state.lang) label += ' …';
        state.uiName.textContent = label;
        var buttons = state.uiRoot.querySelectorAll('[data-lang]');
        for (var i = 0; i < buttons.length; i++) {
            var code = buttons[i].getAttribute('data-lang');
            buttons[i].setAttribute('aria-selected', code === (state.lang || '') ? 'true' : 'false');
        }
    }

    /* ---------------------------------------------------------- 动态内容监听 */
    var mutationTimer = 0;

    function startObserver() {
        if (!cfg.observe || !window.MutationObserver || !document.body) return;

        var obs = new MutationObserver(function (muts) {
            if (!state.lang) return;
            var interesting = false;
            for (var i = 0; i < muts.length; i++) {
                var m = muts[i];
                if (m.type === 'characterData') {
                    if (!segOf(m.target.parentNode)) { interesting = true; break; }
                    continue;
                }
                if (m.target && m.target.nodeType === 1 && m.target.closest && m.target.closest('.ht-tip,.ht-sw')) continue;
                // 忽略我们自己替换文本节点产生的变动
                var ours = true;
                for (var a = 0; a < m.addedNodes.length; a++) {
                    var an = m.addedNodes[a];
                    if (!(an.nodeType === 1 && an.classList && an.classList.contains('ht-s'))) { ours = false; break; }
                }
                if (ours) {
                    for (var r = 0; r < m.removedNodes.length; r++) {
                        if (m.removedNodes[r].nodeType !== 3) { ours = false; break; }
                    }
                }
                if (!ours) { interesting = true; break; }
            }
            if (!interesting) return;
            clearTimeout(mutationTimer);
            mutationTimer = setTimeout(function () {
                if (state.lang) translatePage();
            }, 500);
        });

        obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    /* ------------------------------------------------------------ 初始化 */
    function ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    function init() {
        if (window.gthxSettings && !window.hoverTranslateSettings) {
            try {
                console.warn('[hover-translate] window.gthxSettings 是 1.0（gthx）的旧名字，现在请用 window.hoverTranslateSettings');
            } catch (e) { }
        }
        if (window.hoverTranslateSettings) extend(cfg, window.hoverTranslateSettings);
        normalizeCfg();
        injectCSS();
        buildTip();
        bindHover();
        loadCache();
        buildUI();

        var saved = loadState();
        // 明确指定了 auto_translate / initial_language 时，优先于上次选择
        var lang = cfg.initial_language || (saved && saved.lang) || '';

        if (!lang && cfg.detect_browser_language && cfg.languages && cfg.languages.length) {
            var cand = String(navigator.language || navigator.userLanguage || '').toLowerCase();
            for (var i = 0; i < cfg.languages.length; i++) {
                var l = String(cfg.languages[i]).toLowerCase();
                if (l === cand || l.split('-')[0] === cand.split('-')[0]) { lang = cfg.languages[i]; break; }
            }
        }

        if (lang) translate(lang);
        else updateUI();

        startObserver();
    }

    /* ------------------------------------------------------------ 导出 */
    var HoverTranslate = {
        version: VERSION,
        translate: translate,
        restore: restore,
        toggle: function () { return state.lang ? restore() : translate((cfg.languages || ['en'])[0]); },
        config: function (o) {
            extend(cfg, o);
            normalizeCfg();
            if (o && o.ui === false) {
                if (state.uiRoot && state.uiRoot.parentNode) state.uiRoot.parentNode.removeChild(state.uiRoot);
                state.uiRoot = null;
                state.uiName = null;
                state.uiBuilt = false;
            } else if (o && o.ui === true && !state.uiBuilt) {
                buildUI();
            }
            if (o && (o.ui_position !== undefined || o.ui_container !== undefined)) applyUILayout();
            if (o && (o.show_original !== undefined || o.tooltip !== undefined)) {
                for (var i = 0; i < state.spans.length; i++) {
                    var sp = state.spans[i];
                    if (!sp.parentNode) continue;
                    if (cfg.tooltip && cfg.hover_highlight) sp.classList.add('ht-hl');
                    else sp.classList.remove('ht-hl');
                }
                if (!cfg.tooltip) hideTip(true);
            }
            updateUI();
            return cfg;
        },
        get language() { return state.lang; },
        get detected() { return state.detected; },
        get settings() { return cfg; }
    };

    window.HoverTranslate = HoverTranslate;

    var run = function () { if (cfg.auto_init !== false) init(); };
    ready(run);

})(window, document);
