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

    var VERSION = '1.0.0';

    var NAMES = {
        'zh-CN': '简体中文', 'zh-TW': '繁體中文', en: '英语', ja: '日语', ko: '韩语',
        fr: '法语', de: '德语', es: '西班牙语', ru: '俄语', it: '意大利语',
        pt: '葡萄牙语', ar: '阿拉伯语', th: '泰语', vi: '越南语', id: '印尼语'
    };

    var DEFAULTS = {
        page_language: '',            // 原文语言；空 = 读 <html lang>
        languages: ['zh-CN', 'en', 'ja'],
        position: 'bottom-left',      // bottom-left / bottom-right / top-left / top-right
        hide_banner: true,            // 去掉谷歌注入的顶部横幅（以及 body 的 40px 下移）
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
            items.push({ code: cfg.languages[i], name: langName(cfg.languages[i]) });
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
        state.nameEl.textContent = state.lang ? langName(state.lang) : cfg.restore_label;
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
        // 官方组件可能已经按 cookie 恢复过语言，先同步过来
        state.lang = (state.combo && state.combo.value) || '';
        var saved = null;
        try { saved = localStorage.getItem(cfg.storage_key); } catch (e) { }
        var want = cfg.auto_translate || saved || '';
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
        return setLanguage('');
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

    function init() {
        if (window.gtwrapSettings) extend(cfg, window.gtwrapSettings);
        injectCSS();
        loadWidget();
    }

    window.GTWrap = {
        version: VERSION,
        setLanguage: setLanguage,
        restore: restore,
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
