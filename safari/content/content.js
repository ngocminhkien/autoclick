/**
 * Safari Magic Cursor & Trail - Content Script
 * Quản lý con trỏ chuột tùy biến và hiệu ứng vệt trên mọi trang web
 */

(function () {
  // Tránh inject trùng lặp
  if (window.__safariMagicCursorLoaded) return;
  window.__safariMagicCursorLoaded = true;

  const DEFAULT_SETTINGS = {
    cursorEnabled: true,
    cursorStyle: 'neon-cyan',
    cursorSize: 32,
    trailEnabled: true,
    trailStyle: 'neon-ribbon',
    trailColor: '#00f3ff',
    trailLength: 28,
    trailWidth: 6,
    clickEffect: 'ripple-burst',
    enableInInputs: false
  };

  let currentSettings = { ...DEFAULT_SETTINGS };
  let trailEngine = null;

  // Bản đồ hotspot cho từng loại con trỏ (tọa độ điểm chạm chính xác)
  const HOTSPOTS = {
    'neon-cyan': { x: 4, y: 3 },
    'cyber-blade': { x: 3, y: 3 },
    'magic-wand': { x: 6, y: 6 },
    'gaming-crosshair': { x: 16, y: 16 },
    'minimal-dot': { x: 16, y: 16 },
    'gradient-arrow': { x: 4, y: 2 },
    'star-burst': { x: 16, y: 16 },
    'cat-paw': { x: 16, y: 10 },
    'retro-sword': { x: 2, y: 2 }
  };

  // Khởi động khi DOM sẵn sàng
  function init() {
    loadSettings().then(() => {
      applyCursor(currentSettings);
      initTrailEngine(currentSettings);
    });

    listenForUpdates();
  }

  // Đọc cài đặt từ storage (hỗ trợ cả Safari browser API và chrome API)
  function loadSettings() {
    return new Promise((resolve) => {
      try {
        const storage = (typeof chrome !== 'undefined' && chrome.storage) ? chrome.storage.local :
                        (typeof browser !== 'undefined' && browser.storage) ? browser.storage.local : null;

        if (storage) {
          storage.get(DEFAULT_SETTINGS, (items) => {
            currentSettings = { ...DEFAULT_SETTINGS, ...(items || {}) };
            resolve(currentSettings);
          });
        } else {
          resolve(DEFAULT_SETTINGS);
        }
      } catch (e) {
        console.warn('[Safari Cursor] Không thể đọc storage, dùng mặc định:', e);
        resolve(DEFAULT_SETTINGS);
      }
    });
  }

  // Lắng nghe cập nhật từ Popup hoặc Background
  function listenForUpdates() {
    // 1. Qua storage.onChanged
    try {
      const storage = (typeof chrome !== 'undefined' && chrome.storage) ? chrome.storage :
                      (typeof browser !== 'undefined' && browser.storage) ? browser.storage : null;
      if (storage && storage.onChanged) {
        storage.onChanged.addListener((changes, area) => {
          if (area === 'local') {
            for (const key in changes) {
              currentSettings[key] = changes[key].newValue;
            }
            applyCursor(currentSettings);
            if (trailEngine) {
              trailEngine.updateSettings(currentSettings);
            }
          }
        });
      }
    } catch (e) {}

    // 2. Qua runtime.onMessage
    try {
      const runtime = (typeof chrome !== 'undefined' && chrome.runtime) ? chrome.runtime :
                      (typeof browser !== 'undefined' && browser.runtime) ? browser.runtime : null;
      if (runtime && runtime.onMessage) {
        runtime.onMessage.addListener((msg) => {
          if (msg.action === 'settingsUpdated' && msg.settings) {
            currentSettings = { ...currentSettings, ...msg.settings };
            applyCursor(currentSettings);
            if (trailEngine) {
              trailEngine.updateSettings(currentSettings);
            }
          }
        });
      }
    } catch (e) {}
  }

  // Áp dụng con trỏ chuột lên trang web
  function applyCursor(settings) {
    let styleTag = document.getElementById('safari-magic-cursor-style');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'safari-magic-cursor-style';
      (document.head || document.documentElement).appendChild(styleTag);
    }

    if (!settings.cursorEnabled || settings.cursorStyle === 'default') {
      styleTag.textContent = '';
      document.documentElement.classList.remove('safari-cursor-active');
      return;
    }

    document.documentElement.classList.add('safari-cursor-active');

    const styleName = settings.cursorStyle || 'neon-cyan';
    const cursorUrl = getAssetUrl(`assets/cursors/${styleName}.svg`);
    const hoverUrl = getAssetUrl(`assets/cursors/neon-pointer.svg`);
    const spot = HOTSPOTS[styleName] || { x: 4, y: 4 };

    // CSS rule ghi đè mọi phần tử để hiển thị con trỏ đẹp mắt
    styleTag.textContent = `
      html, body, *, [role="article"], div, span, p, section, header, main, footer {
        cursor: url("${cursorUrl}") ${spot.x} ${spot.y}, auto !important;
      }
      a, button, [role="button"], input[type="submit"], input[type="button"], select, summary, [tabindex] {
        cursor: url("${hoverUrl}") 8 2, pointer !important;
      }
      ${!settings.enableInInputs ? `
      input[type="text"], input[type="search"], input[type="password"], input[type="email"], textarea, [contenteditable="true"] {
        cursor: text !important;
      }
      ` : ''}
    `;
  }

  // Khởi tạo Engine vẽ vệt Canvas
  function initTrailEngine(settings) {
    if (typeof SafariTrailEngine === 'undefined') {
      console.warn('[Safari Cursor] SafariTrailEngine chưa sẵn sàng');
      return;
    }

    if (!trailEngine) {
      trailEngine = new SafariTrailEngine({
        canvasId: 'safari-cursor-trail-canvas',
        trailEnabled: settings.trailEnabled,
        trailStyle: settings.trailStyle,
        trailColor: settings.trailColor,
        trailLength: settings.trailLength,
        trailWidth: settings.trailWidth,
        clickEffect: settings.clickEffect,
        cursorStyle: settings.cursorStyle
      });
    } else {
      trailEngine.updateSettings(settings);
    }
  }

  // Lấy đường dẫn URL của asset an toàn cho Safari
  function getAssetUrl(path) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        return chrome.runtime.getURL(path);
      }
      if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL) {
        return browser.runtime.getURL(path);
      }
    } catch (e) {}
    return path;
  }

  // Khởi chạy khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
