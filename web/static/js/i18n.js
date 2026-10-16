/* ObjDock i18n — 5 languages: zh-CN, en, ja, ko, es */
'use strict';

const LANGS = {
  'zh-CN': '简体中文',
  'en': 'English',
  'ja': '日本語',
  'ko': '한국어',
  'es': 'Español',
};

// 当前语言：localStorage > 浏览器检测 > 默认 zh-CN（保护现有版本）
function detectLang() {
  try {
    const saved = localStorage.getItem('objdock-lang');
    if (saved && LANGS[saved]) return saved;
  } catch (e) {}
  try {
    const nav = (navigator.language || 'en').toLowerCase();
    if (nav.startsWith('zh')) return 'zh-CN';
    if (nav.startsWith('ja')) return 'ja';
    if (nav.startsWith('ko')) return 'ko';
    if (nav.startsWith('es')) return 'es';
    if (nav.startsWith('en')) return 'en';
  } catch (e) {}
  return 'zh-CN';
}

let currentLang = detectLang();

// 翻译表（由构建脚本生成）
const I18N = {};

function t(key, params) {
  const lang = currentLang;
  let s = (I18N[lang] && I18N[lang][key]) || (I18N['zh-CN'] && I18N['zh-CN'][key]) || key;
  if (params) {
    Object.keys(params).forEach(k => {
      s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
    });
  }
  return s;
}

function setLang(lang) {
  if (!LANGS[lang]) return;
  currentLang = lang;
  try { localStorage.setItem('objdock-lang', lang); } catch (e) {}
  document.documentElement.lang = lang;
  // 保存到后端用户配置（如果已登录）
  try {
    if (typeof state !== 'undefined' && state.user) {
      fetch('/api/user/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
      }).catch(() => {});
    }
  } catch (e) {}
}

function getLang() { return currentLang; }
