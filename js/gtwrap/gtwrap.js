/*!
 * gtwrap.js — 给 Google 官方翻译组件套一层壳
 *
 * 它自己去加载 translate_a/element.js，然后把官方那坨 UI 藏进屏幕外，
 * 用一个小胶囊按钮（默认左下角）驱动它。翻译、悬停显示原文都是官方的。
 *
 *   <script src="gtwrap.js"></script>
 *   GTWrap.setLanguage('zh-CN');
 *   GTWrap.restore();
 */
(function (window, document) {
    'use strict';

    var VERSION = '1.2.0';

    var NAMES = {
        'zh-CN': '简体中文', 'zh-TW': '繁體中文', en: '英语', ja: '日语', ko: '韩语',
        fr: '法语', de: '德语', es: '西班牙语', ru: '俄语', it: '意大利语',
        pt: '葡萄牙语', ar: '阿拉伯语', th: '泰语', vi: '越南语', id: '印尼语'
    };

    // 菜单里的国旗（Windows 上系统字体会把国旗显示成 CN / JP 两个字母）
    var FLAGS = {
        'zh-CN': '🇨🇳', 'zh-TW': '🇹🇼', en: '🇬🇧', ja: '🇯🇵', ko: '🇰🇷',
        fr: '🇫🇷', de: '🇩🇪', es: '🇪🇸', ru: '🇷🇺', it: '🇮🇹',
        pt: '🇵🇹', ar: '🇸🇦', th: '🇹🇭', vi: '🇻🇳', id: '🇮🇩',
        hi: '🇮🇳', tr: '🇹🇷', nl: '🇳🇱', pl: '🇵🇱', uk: '🇺🇦',
        sv: '🇸🇪', da: '🇩🇰', fi: '🇫🇮', no: '🇳🇴', cs: '🇨🇿',
        el: '🇬🇷', he: '🇮🇱', fa: '🇮🇷', ms: '🇲🇾', tl: '🇵🇭'
    };

    var DEFAULTS = {
        page_language: '',            // 原文语言；空 = 读 <html lang>
        languages: ['zh-CN', 'en', 'ja'],
        position: 'bottom-left',      // bottom-left / bottom-right / top-left / top-right
        hide_banner: true,            // 去掉谷歌注入的顶部横幅（以及 body 的 40px 下移）
        show_original: true,          // false = 完全隐藏谷歌的原文气泡
        tooltip_size: 'compact',      // compact = 小号气泡；google = 保持谷歌原样
        tooltip_position: 'above',    // above / below / corner（corner = 钉在右下角，永不压住正文）
        auto_translate: '',           // 'zh-CN' = 打开就翻；空 = 不自动
        restore_label: '原文',
        storage_key: '__GTWRAP_LANG',
        debug: false
    };

    var cfg = extend({}, DEFAULTS);
    var state = { lang: '', combo: null, root: null, nameEl: null, timer: 0 };

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

    function langName(code) {
        return NAMES[code] || code;
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
        return 'auto';   // 页面没写 lang，交给谷歌自己判断
    }

    /* --------------------------------------------------------------- 样式 */
    function injectCSS() {
        if (document.getElementById('gtwrap-style')) return;
        var hideBanner = cfg.hide_banner !== false;
        var bannerOff = 'height:0 !important;overflow:hidden !important;opacity:0 !important;pointer-events:none !important';
        var css = [
            /* 横幅：不用 display:none（那个 iframe 是组件自己的框架，藏死可能连带气泡一起失灵），
               改成"高度 0 + 溢出隐藏 + 透明"，视觉上去掉、DOM 里还活着 */
            hideBanner ? 'html body{top:0 !important}' : '',
            hideBanner ? 'body > .skiptranslate:has(> iframe.VIpgJd-ZVi9od-ORHb-OEVmcd){' + bannerOff + '}' : '',
            hideBanner ? 'body > .skiptranslate[style*="height:40px"],body > .skiptranslate[style*="height: 40px"]{' + bannerOff + '}' : '',
            hideBanner ? 'iframe.VIpgJd-ZVi9od-ORHb-OEVmcd{height:0 !important;min-height:0 !important}' : '',

            /* 原文气泡：可隐藏 / 可缩小 */
            cfg.show_original === false ? '#goog-gt-tt{display:none !important}' : '',
            cfg.show_original !== false && cfg.tooltip_size !== 'google' ? [
                '#goog-gt-tt{max-width:320px !important;padding:6px 9px !important;border-radius:6px !important;',
                'box-shadow:0 2px 10px rgba(0,0,0,.16) !important;font-size:12.5px !important;line-height:1.5 !important}',
                '#goog-gt-tt *{font-size:12.5px !important}',
                '#goog-gt-tt div[dir="ltr"],#goog-gt-tt .goog-gt-tt-id{max-width:320px !important}'
            ].join('') : '',

            /* 官方控件本体挪到屏幕外，只留着给我们的 UI 驱动 */
            '#gtwrap-host{position:fixed !important;left:-9999px !important;top:-9999px !important;',
            'width:1px !important;height:1px !important;overflow:hidden !important;opacity:0 !important;pointer-events:none !important}',

            /* 我们的小胶囊 */
            '.gtwrap{position:fixed;z-index:2147483000;font:400 13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",Arial,sans-serif;color:#3c4043}',
            '.gtwrap[data-pos="bottom-left"]{left:12px;bottom:12px}',
            '.gtwrap[data-pos="bottom-right"]{right:12px;bottom:12px}',
            '.gtwrap[data-pos="top-left"]{left:12px;top:12px}',
            '.gtwrap[data-pos="top-right"]{right:12px;top:12px}',
            '.gtwrap-cur{display:inline-flex;align-items:center;gap:7px;background:#fff;border:1px solid rgba(0,0,0,.13);',
            'border-radius:999px;padding:6px 13px;box-shadow:0 1px 4px rgba(0,0,0,.13);cursor:pointer;font:inherit;color:inherit}',
            '.gtwrap-cur:hover{box-shadow:0 2px 8px rgba(0,0,0,.18)}',
            '.gtwrap-arrow{width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid #5f6368}',
            '.gtwrap-menu{position:absolute;bottom:calc(100% + 6px);left:0;min-width:132px;max-height:60vh;overflow:auto;',
            'background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.18);padding:4px;display:none}',
            '.gtwrap[data-pos^="top"] .gtwrap-menu{bottom:auto;top:calc(100% + 6px)}',
            '.gtwrap[data-pos$="right"] .gtwrap-menu{left:auto;right:0}',
            '.gtwrap.gtwrap-open .gtwrap-menu{display:block}',
            '.gtwrap-menu button{display:block;width:100%;text-align:left;background:none;border:0;padding:7px 11px;border-radius:6px;',
            'cursor:pointer;font:inherit;color:inherit;white-space:nowrap}',
            '.gtwrap-menu button:hover{background:#f1f3f4}',
            '.gtwrap-menu button[aria-selected="true"]{color:#1a73e8;font-weight:600}'
        ].join('');

        var s = document.createElement('style');
        s.id = 'gtwrap-style';
        s.appendChild(document.createTextNode(css));
        (document.head || document.documentElement).appendChild(s);
    }

    /* ----------------------------------------------------------- 加载官方组件 */
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
                log('combo ready');
                buildUI();
                applyInitialLanguage();
                return;
            }
            if (n++ < 100) state.timer = setTimeout(poll, 100);
            else log('等不到 .goog-te-combo');
        })();
    }

    /* --------------------------------------------------------------- 我们的 UI */
    function buildUI() {
        if (state.root) return;
        var root = document.createElement('div');
        root.className = 'gtwrap';
        root.setAttribute('data-pos', cfg.position || 'bottom-left');
        root.setAttribute('translate', 'no');

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'gtwrap-cur';
        btn.setAttribute('aria-haspopup', 'true');
        var name = document.createElement('span');
        name.className = 'gtwrap-name';
        var arrow = document.createElement('span');
        arrow.className = 'gtwrap-arrow';
        btn.appendChild(name);
        btn.appendChild(arrow);

        var menu = document.createElement('div');
        menu.className = 'gtwrap-menu';
        menu.setAttribute('role', 'menu');

        var items = [{ code: '', name: cfg.restore_label }];
        for (var i = 0; i < cfg.languages.length; i++) {
            items.push({ code: cfg.languages[i], name: langLabel(cfg.languages[i]) });
        }
        items.forEach(function (item) {
            var b = document.createElement('button');
            b.type = 'button';
            b.setAttribute('role', 'menuitem');
            b.setAttribute('data-lang', item.code);
            b.textContent = item.name;
            b.addEventListener('click', function (e) {
                e.stopPropagation();
                root.classList.remove('gtwrap-open');
                if (item.code) setLanguage(item.code); else restore();
            });
            menu.appendChild(b);
        });

        root.appendChild(btn);
        root.appendChild(menu);
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            root.classList.toggle('gtwrap-open');
        });
        document.addEventListener('click', function () { root.classList.remove('gtwrap-open'); });

        document.body.appendChild(root);
        state.root = root;
        state.nameEl = name;
        updateUI();
    }

    function updateUI() {
        if (!state.root) return;
        state.nameEl.textContent = state.lang ? langLabel(state.lang) : cfg.restore_label;
        var buttons = state.root.querySelectorAll('[data-lang]');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].setAttribute('aria-selected', buttons[i].getAttribute('data-lang') === state.lang ? 'true' : 'false');
        }
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

        // 官方组件可能已经按 cookie 恢复过语言，先同步过来
        state.lang = (state.combo && state.combo.value) || '';
        var saved = null;
        try { saved = localStorage.getItem(cfg.storage_key); } catch (e) { }
        var want = skip ? '' : (cfg.auto_translate || saved || '');
        if (!want || state.lang === want) { updateUI(); return; }
        if (cfg.languages.indexOf(want) < 0) { updateUI(); return; }
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
        // 回滚成简单版：只把下拉设回"选择语言"，不刷新、不碰 cookie
        return setLanguage('');
    }

    /* 想要"彻底回到原文"（清 cookie + 必要时刷新）时手动调这个 */
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

    function getLang() {
        if (state.combo) return state.combo.value || '';
        return state.lang || '';
    }

    /* 谷歌的原文气泡会飘到很远的地方（有时甩到右边），这里把它拉回鼠标下面 */
    function bindTooltipFix() {
        var timers = [], lastTarget = null;

        function tipWrap() {
            var tt = document.querySelector('#goog-gt-tt');
            return tt && tt.parentNode ? tt.parentNode : null;
        }

        function insideTip(el) {
            var w = tipWrap();
            return !!(w && (w === el || w.contains(el)));
        }

        function place(el) {
            var wrap = tipWrap();
            if (!wrap) return;
            var wr = wrap.getBoundingClientRect();
            if (!wr.width || !wr.height) return;                 // 还没显示
            if (getComputedStyle(wrap).display === 'none') return;
            if (!el.getBoundingClientRect) return;

            var vw = window.innerWidth, vh = window.innerHeight;
            var nx, ny;

            if (cfg.tooltip_position === 'corner') {
                // 钉在右下角（胶囊上方），永远不会压住正文
                nx = Math.round(vw - wr.width - 16 + window.pageXOffset);
                ny = Math.round(vh - wr.height - 56 + window.pageYOffset);
            } else {
                var r = el.getBoundingClientRect();
                if (!r.width && !r.height) return;

                var left = r.left + Math.min(r.width, 240) / 2 - wr.width / 2;
                left = Math.max(8, Math.min(left, vw - wr.width - 8));

                var top;
                if (cfg.tooltip_position === 'below') {
                    top = r.bottom + 10;
                    if (top + wr.height > vh - 8) top = r.top - wr.height - 10;
                } else {
                    top = r.top - wr.height - 10;
                    if (top < 8) top = r.bottom + 10;
                }
                if (top + wr.height > vh - 8) top = Math.max(8, vh - wr.height - 8);

                nx = Math.round(left + window.pageXOffset);
                ny = Math.round(top + window.pageYOffset);
            }

            // 已经在目标位置附近就别再动，避免"挪一下→鼠标下换元素→再挪"的抖动
            if (Math.abs(wr.left + window.pageXOffset - nx) < 4 && Math.abs(wr.top + window.pageYOffset - ny) < 4) return;

            wrap.style.left = nx + 'px';
            wrap.style.top = ny + 'px';
        }

        document.addEventListener('mouseover', function (e) {
            var el = e.target;
            if (!el || el.nodeType !== 1) return;
            // 鼠标落在气泡自己身上 / 我们自己的控件上：一律不要重新定位
            if (insideTip(el)) return;
            if (el.closest && el.closest('.gtwrap,#gtwrap-host')) return;
            if (el === lastTarget) return;
            lastTarget = el;

            for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
            timers = [
                setTimeout(function () { place(el); }, 60),
                setTimeout(function () { place(el); }, 350)
            ];
        }, true);
    }

    function init() {
        if (window.gtwrapSettings) extend(cfg, window.gtwrapSettings);
        injectCSS();
        bindTooltipFix();
        loadWidget();
    }

    window.GTWrap = {
        version: VERSION,
        setLanguage: setLanguage,
        restore: restore,
        restoreHard: restoreHard,
        config: function (o) {
            extend(cfg, o);
            if (state.root) state.root.setAttribute('data-pos', cfg.position || 'bottom-left');
            updateUI();
            return cfg;
        },
        get language() { return getLang(); },
        get ready() { return !!state.combo; }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(window, document);
