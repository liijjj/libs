/*!
 * gtwrap.js — 给 Google 官方翻译组件套一层壳
 *
 * 它自己加载 translate_a/element.js，把官方控件藏到屏幕外，
 * 左下角放一个原生 <select> 驱动它；翻译和"悬停看原文"都是官方的。
 *
 *   <script src="gtwrap.js"></script>
 *   GTWrap.setLanguage('zh-CN');
 *   GTWrap.restore();
 */
(function (window, document) {
    'use strict';

    var VERSION = '1.5.0';

    var NAMES = {
        'zh-CN': '简体中文', 'zh-TW': '繁體中文', en: '英语', ja: '日语', ko: '韩语',
        fr: '法语', de: '德语', es: '西班牙语', ru: '俄语', it: '意大利语',
        pt: '葡萄牙语', ar: '阿拉伯语', th: '泰语', vi: '越南语', id: '印尼语',
        hi: '印地语', tr: '土耳其语', nl: '荷兰语', pl: '波兰语', uk: '乌克兰语'
    };

    var FLAGS = {
        'zh-CN': '🇨🇳', 'zh-TW': '🇹🇼', en: '🇬🇧', ja: '🇯🇵', ko: '🇰🇷',
        fr: '🇫🇷', de: '🇩🇪', es: '🇪🇸', ru: '🇷🇺', it: '🇮🇹',
        pt: '🇵🇹', ar: '🇸🇦', th: '🇹🇭', vi: '🇻🇳', id: '🇮🇩',
        hi: '🇮🇳', tr: '🇹🇷', nl: '🇳🇱', pl: '🇵🇱', uk: '🇺🇦'
    };

    var DEFAULTS = {
        page_language: '',            // 原文语言；空 = 读 <html lang>
        languages: ['zh-CN', 'en', 'ja'],
        position: 'bottom-left',      // bottom-left / bottom-right / top-left / top-right
        auto_translate: '',           // 'zh-CN' = 打开就翻
        restore_label: '原文',
        storage_key: '__GTWRAP_LANG',

        hide_banner: true,            // 去掉顶部横幅
        show_original: true,          // false = 完全隐藏原文气泡
        tooltip_size: 'google',       // google = 官方原样；compact = 小号气泡（会覆盖字号/内边距）
        tooltip_position: 'above',    // above / below / corner
        hide_tooltip_parts: true,     // 去掉气泡的 logo 头 + 评分脚
        theme: 'auto',                // auto = 跟随页面深浅色；light / dark 强制

        debug: false
    };

    var cfg = extend({}, DEFAULTS);
    var state = { lang: '', combo: null, root: null, select: null, timer: 0, dressed: '' };

    function extend(t) {
        for (var i = 1; i < arguments.length; i++) {
            var s = arguments[i];
            if (!s) continue;
            for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k];
        }
        return t;
    }

    function log() {
        if (!cfg.debug) return;
        var a = Array.prototype.slice.call(arguments);
        a.unshift('[gtwrap]');
        try { console.log.apply(console, a); } catch (e) { }
    }

    function langLabel(code) {
        var flag = FLAGS[code] || '';
        var name = NAMES[code] || code;
        return (flag ? flag + ' ' : '') + name;
    }

    function pageLang() {
        var want = (cfg.page_language || '').trim();
        if (want && want !== 'auto') return want;
        var html = (document.documentElement.getAttribute('lang') || '').trim();
        if (html && html !== 'auto') return html;
        return 'auto';
    }

    /* ----------------------------------------------------------- 深浅色判断 */
    function parseColor(s) {
        var m = /rgba?\(([^)]+)\)/.exec(s || '');
        if (!m) return null;
        var p = m[1].split(',').map(function (x) { return parseFloat(x); });
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }

    function isDark() {
        if (cfg.theme === 'dark') return true;
        if (cfg.theme === 'light') return false;

        var nodes = [document.body, document.documentElement];
        for (var i = 0; i < nodes.length; i++) {
            if (!nodes[i]) continue;
            var c = parseColor(getComputedStyle(nodes[i]).backgroundColor);
            if (c && c.a > 0.3) {
                return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) < 128;
            }
        }
        try {
            return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        } catch (e) { }
        return false;
    }

    function applyTheme() {
        var dark = isDark();
        document.documentElement.classList.toggle('gtwrap-dark', dark);
    }

    /* --------------------------------------------------------------- 样式 */
    function injectCSS() {
        if (document.getElementById('gtwrap-style')) return;
        var hideBanner = cfg.hide_banner !== false;
        var bannerOff = 'height:0 !important;overflow:hidden !important;opacity:0 !important;pointer-events:none !important';

        var css = [
            /* 横幅：压扁而不是 display:none，别打断组件自己的框架 */
            hideBanner ? 'html body{top:0 !important}' : '',
            hideBanner ? 'body > .skiptranslate:has(> iframe.VIpgJd-ZVi9od-ORHb-OEVmcd){' + bannerOff + '}' : '',
            hideBanner ? 'body > .skiptranslate[style*="height:40px"],body > .skiptranslate[style*="height: 40px"]{' + bannerOff + '}' : '',
            hideBanner ? 'iframe.VIpgJd-ZVi9od-ORHb-OEVmcd{height:0 !important;min-height:0 !important}' : '',

            /* 隐藏原生控件容器（我们用 select 驱动它） */
            '#gtwrap-host{position:fixed !important;left:-9999px !important;top:-9999px !important;',
            'width:1px !important;height:1px !important;overflow:hidden !important;opacity:0 !important;pointer-events:none !important}',

            /* 原生 select */
            '.gtwrap{position:fixed;z-index:2147483000}',
            '.gtwrap[data-pos="bottom-left"]{left:12px;bottom:12px}',
            '.gtwrap[data-pos="bottom-right"]{right:12px;bottom:12px}',
            '.gtwrap[data-pos="top-left"]{left:12px;top:12px}',
            '.gtwrap[data-pos="top-right"]{right:12px;top:12px}',
            '.gtwrap-select{font:400 12.5px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",Arial,sans-serif;',
            'color:#3c4043;background:#fff;border:1px solid rgba(0,0,0,.18);border-radius:6px;padding:4px 6px;',
            'max-width:220px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.10)}',
            '.gtwrap-select:focus{outline:none;border-color:#1a73e8}',

            /* 原文气泡 */
            cfg.show_original === false ? '#goog-gt-tt{display:none !important}' : '',
            cfg.show_original !== false && cfg.tooltip_size !== 'google' ? [
                '#goog-gt-tt{max-width:320px !important;padding:6px 9px !important;border-radius:6px !important;',
                'box-shadow:0 2px 10px rgba(0,0,0,.16) !important;font-size:12.5px !important;line-height:1.5 !important}',
                '#goog-gt-tt *{font-size:12.5px !important}'
            ].join('') : '',

            /* 气泡只留正文：谷歌的结构是 #goog-gt-tt > #goog-gt-vt > [头, 正文, 脚] */
            cfg.hide_tooltip_parts ? '#goog-gt-vt:has(> :nth-child(3)) > *:not(:nth-child(2)){display:none !important}' : '',

            /* 深色模式：气泡和 select 都跟着页面走 */
            '.gtwrap-dark #goog-gt-tt{background:#202124 !important;color:#e8eaed !important;border-color:#3c4043 !important}',
            '.gtwrap-dark #goog-gt-tt *{color:#e8eaed !important}',
            '.gtwrap-dark #goog-gt-tt a{color:#8ab4f8 !important}',
            '.gtwrap-dark .gtwrap-select{background:#202124;color:#e8eaed;border-color:#5f6368}',
            '.gtwrap-dark .gtwrap-select option{background:#202124;color:#e8eaed}'
        ].join('');

        var s = document.createElement('style');
        s.id = 'gtwrap-style';
        s.appendChild(document.createTextNode(css));
        (document.head || document.documentElement).appendChild(s);
    }

    /* ------------------------------------------------------- 加载官方组件 */
    function loadWidget() {
        var host = document.createElement('div');
        host.id = 'gtwrap-host';
        host.setAttribute('translate', 'no');
        document.body.appendChild(host);

        window.__gtwrapInit = function () {
            try {
                new window.google.translate.TranslateElement({
                    pageLanguage: pageLang(),
                    includedLanguages: cfg.languages.join(','),
                    autoDisplay: false,
                    multilanguagePage: true
                }, 'gtwrap-host');
            } catch (e) {
                log('初始化失败', e);
            }
            waitForCombo();
        };

        var s = document.createElement('script');
        s.src = 'https://translate.google.com/translate_a/element.js?cb=__gtwrapInit';
        s.async = true;
        s.onerror = function () { log('element.js 加载失败'); };
        document.head.appendChild(s);
    }

    function waitForCombo() {
        clearTimeout(state.timer);
        var n = 0;
        (function poll() {
            var combo = document.querySelector('.goog-te-combo');
            if (combo) {
                state.combo = combo;
                combo.addEventListener('change', syncFromCombo);
                buildUI();
                applyInitialLanguage();
                return;
            }
            if (n++ < 100) state.timer = setTimeout(poll, 100);
            else log('等不到 .goog-te-combo');
        })();
    }

    /* ------------------------------------------------------------- 原生 select */
    function buildUI() {
        if (state.root) return;

        var root = document.createElement('div');
        root.className = 'gtwrap';
        root.setAttribute('data-pos', cfg.position || 'bottom-left');
        root.setAttribute('translate', 'no');

        var sel = document.createElement('select');
        sel.className = 'gtwrap-select';
        sel.setAttribute('aria-label', '翻译');

        var o0 = document.createElement('option');
        o0.value = '';
        o0.textContent = cfg.restore_label;
        sel.appendChild(o0);

        for (var i = 0; i < cfg.languages.length; i++) {
            var code = cfg.languages[i];
            var o = document.createElement('option');
            o.value = code;
            o.textContent = langLabel(code);
            sel.appendChild(o);
        }

        sel.addEventListener('change', function () {
            var v = sel.value;
            if (v) setLanguage(v); else restore();
        });

        root.appendChild(sel);
        document.body.appendChild(root);

        state.root = root;
        state.select = sel;
        applyTheme();
        updateUI();
    }

    function updateUI() {
        if (state.select) state.select.value = state.lang || '';
    }

    function syncFromCombo() {
        state.lang = (state.combo && state.combo.value) || '';
        saveLang(state.lang);
        updateUI();
    }

    function applyInitialLanguage() {
        var skip = false;
        try {
            skip = sessionStorage.getItem('__GTWRAP_SKIP_AUTO') === '1';
            if (skip) sessionStorage.removeItem('__GTWRAP_SKIP_AUTO');
        } catch (e) { }

        state.lang = (state.combo && state.combo.value) || '';
        var saved = null;
        try { saved = localStorage.getItem(cfg.storage_key); } catch (e) { }
        var want = skip ? '' : (cfg.auto_translate || saved || '');
        if (!want || state.lang === want || cfg.languages.indexOf(want) < 0) {
            updateUI();
            return;
        }
        setLanguage(want, true);
    }

    /* ------------------------------------------------------------------ API */
    function setLanguage(code, silent) {
        if (!state.combo) { log('还没就绪'); return false; }
        if (code === state.lang && !silent) return true;
        state.combo.value = code;
        state.combo.dispatchEvent(new Event('change', { bubbles: true }));
        state.lang = code;
        saveLang(code);
        updateUI();
        return true;
    }

    function restore() {
        return setLanguage('');
    }

    function restoreHard() {
        clearCookie();
        if (state.combo) {
            state.combo.value = '';
            state.combo.dispatchEvent(new Event('change', { bubbles: true }));
        }
        state.lang = '';
        saveLang('');
        updateUI();
        try { sessionStorage.setItem('__GTWRAP_SKIP_AUTO', '1'); } catch (e) { }
        setTimeout(function () {
            if (state.combo && state.combo.value) location.reload();
        }, 600);
        return true;
    }

    function clearCookie() {
        var hosts = ['', location.hostname, '.' + location.hostname];
        var paths = ['/', location.pathname];
        for (var h = 0; h < hosts.length; h++) {
            for (var p = 0; p < paths.length; p++) {
                document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=' + paths[p] +
                    (hosts[h] ? '; domain=' + hosts[h] : '');
            }
        }
    }

    function saveLang(code) {
        try {
            if (code) localStorage.setItem(cfg.storage_key, code);
            else localStorage.removeItem(cfg.storage_key);
        } catch (e) { }
    }

    /* ------------------------------------------------ 气泡：定位 + 去掉头尾 */
    function tipWrap() {
        var tt = document.querySelector('#goog-gt-tt');
        if (!tt) return null;
        var wrap = tt.parentNode;
        // 父节点如果就是 body/html，绝不能动它（否则整页变 fixed、不能滚动）
        if (!wrap || wrap === document.body || wrap === document.documentElement) return null;
        return wrap;
    }

    /* 固定层：把谷歌的气泡容器搬进来，它再怎么溢出也影响不到文档尺寸 */
    function tipLayer() {
        var l = document.getElementById('gtwrap-tip-layer');
        if (!l) {
            l = document.createElement('div');
            l.id = 'gtwrap-tip-layer';
            l.setAttribute('translate', 'no');
            l.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:2147483000';
            document.body.appendChild(l);
        }
        return l;
    }

    function dressTip() {
        if (!cfg.hide_tooltip_parts) return;
        var tt = document.querySelector('#goog-gt-tt');
        if (!tt) return;
        if (state.dressed === tt.innerHTML) return;
        state.dressed = tt.innerHTML;

        // 真实结构：#goog-gt-tt > #goog-gt-vt > [logo+原文, 正文, 评分脚]
        // 只保留第二个（正文），其余隐藏
        var vt = tt.querySelector('#goog-gt-vt');
        var box = vt || tt;
        var kids = box.children;
        if (kids.length < 2) return;

        for (var i = 0; i < kids.length; i++) {
            if (i === 1) continue;
            kids[i].style.display = 'none';
        }
    }

    function bindTooltipFix() {
        var timers = [], lastTarget = null;

        function insideTip(el) {
            var w = tipWrap();
            if (w && (w === el || w.contains(el))) return true;
            var tt = document.querySelector('#goog-gt-tt');
            return !!(tt && (tt === el || tt.contains(el)));
        }

        function place(el) {
            var tt = document.querySelector('#goog-gt-tt');
            if (!tt || !el.getBoundingClientRect) return;

            // 谷歌可能把气泡放在一个 wrapper 里，也可能直接挂 body 下。
            // 只搬"可以安全搬的"节点，body/html 一律不碰。
            var wrap = tt.parentNode;
            var layerEl = document.getElementById('gtwrap-tip-layer');
            var target = (wrap && wrap !== document.body && wrap !== document.documentElement && wrap !== layerEl) ? wrap : tt;

            var br = tt.getBoundingClientRect();          // 用气泡本体量尺寸
            if (!br.width || !br.height) return;          // 隐藏状态（没尺寸）就什么都不做

            var cs = getComputedStyle(tt);
            if (cs.display === 'none' || cs.visibility === 'hidden') return;

            var vw = window.innerWidth, vh = window.innerHeight;
            var nx, ny;

            if (cfg.tooltip_position === 'corner') {
                nx = Math.round(vw - br.width - 16);
                ny = Math.round(vh - br.height - 56);
            } else {
                var r = el.getBoundingClientRect();
                if (!r.width && !r.height) return;

                var left = r.left + Math.min(r.width, 240) / 2 - br.width / 2;
                left = Math.max(8, Math.min(left, vw - br.width - 8));

                var top;
                if (cfg.tooltip_position === 'below') {
                    top = r.bottom + 10;
                    if (top + br.height > vh - 8) top = r.top - br.height - 10;
                } else {
                    top = r.top - br.height - 10;
                    if (top < 8) top = r.bottom + 10;
                }
                if (top + br.height > vh - 8) top = Math.max(8, vh - br.height - 8);

                nx = Math.round(left);
                ny = Math.round(top);
            }

            var tr = target.getBoundingClientRect();
            if (Math.abs(tr.left - nx) < 4 && Math.abs(tr.top - ny) < 4) return;

            // 搬进固定层：它溢出多少都不会撑出滚动条，也不改页面任何布局
            var layer = tipLayer();
            if (target.parentNode !== layer) layer.appendChild(target);
            if (target === tt) target.style.position = 'absolute';
            target.style.left = nx + 'px';
            target.style.top = ny + 'px';
        }

        document.addEventListener('mouseover', function (e) {
            var el = e.target;
            if (!el || el.nodeType !== 1) return;
            if (insideTip(el)) return;
            if (el.closest && el.closest('.gtwrap,#gtwrap-host')) return;
            if (el === lastTarget) return;
            lastTarget = el;

            for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
            timers = [
                setTimeout(function () { place(el); dressTip(); }, 60),
                setTimeout(function () { place(el); dressTip(); }, 350)
            ];
        }, true);
    }

    /* ------------------------------------------------------------ 初始化 */
    function init() {
        if (window.gtwrapSettings) extend(cfg, window.gtwrapSettings);
        injectCSS();
        applyTheme();
        bindTooltipFix();
        loadWidget();

        // 页面在运行中切深浅色时跟上
        try {
            var mq = window.matchMedia('(prefers-color-scheme: dark)');
            if (mq.addEventListener) mq.addEventListener('change', applyTheme);
        } catch (e) { }
        var n = 0;
        var iv = setInterval(function () { applyTheme(); if (++n > 10) clearInterval(iv); }, 2000);
    }

    window.GTWrap = {
        version: VERSION,
        setLanguage: setLanguage,
        restore: restore,
        restoreHard: restoreHard,
        clearCookie: clearCookie,
        config: function (o) {
            extend(cfg, o);
            applyTheme();
            if (state.root) state.root.setAttribute('data-pos', cfg.position || 'bottom-left');
            updateUI();
            return cfg;
        },
        get language() { return (state.combo && state.combo.value) || state.lang || ''; },
        get ready() { return !!state.combo; }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(window, document);
