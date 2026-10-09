/**
 * Safari Magic Cursor & Trail - Popup Controller
 * Điều khiển giao diện popup, lưu cấu hình và kết nối Live Preview
 */

const DEFAULT_SETTINGS = {
  masterEnabled: true,
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
let previewEngine = null;

// Khởi chạy khi popup mở
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  initUI();
  initTabs();
  initLivePreview();
});

// Đọc cài đặt từ storage
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
      console.warn('Lỗi đọc storage trong popup:', e);
      resolve(DEFAULT_SETTINGS);
    }
  });
}

// Lưu cài đặt và đồng bộ
function saveSettings() {
  try {
    const storage = (typeof chrome !== 'undefined' && chrome.storage) ? chrome.storage.local :
                    (typeof browser !== 'undefined' && browser.storage) ? browser.storage.local : null;

    if (storage) {
      storage.set(currentSettings);
    }

    // Bắn tin nhắn cập nhật cho các tab
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'settingsUpdated',
            settings: currentSettings
          }).catch(() => {});
        }
      });
    }

    // Cập nhật ngay bộ máy Live Preview trong popup
    if (previewEngine) {
      previewEngine.updateSettings({
        trailEnabled: currentSettings.masterEnabled && currentSettings.trailEnabled,
        trailStyle: currentSettings.trailStyle,
        trailColor: currentSettings.trailColor,
        trailLength: currentSettings.trailLength,
        trailWidth: currentSettings.trailWidth,
        clickEffect: currentSettings.clickEffect,
        cursorStyle: currentSettings.cursorStyle
      });
    }
    updatePreviewCursor();
  } catch (e) {
    console.error('Lỗi lưu cài đặt:', e);
  }
}

// Thiết lập giao diện theo cài đặt hiện có
function initUI() {
  // Master switch
  const masterToggle = document.getElementById('masterToggle');
  masterToggle.checked = currentSettings.masterEnabled !== false;
  masterToggle.addEventListener('change', (e) => {
    currentSettings.masterEnabled = e.target.checked;
    currentSettings.cursorEnabled = e.target.checked;
    currentSettings.trailEnabled = e.target.checked;
    document.getElementById('cursorToggle').checked = e.target.checked;
    document.getElementById('trailToggle').checked = e.target.checked;
    saveSettings();
  });

  // Trail toggle
  const trailToggle = document.getElementById('trailToggle');
  trailToggle.checked = currentSettings.trailEnabled !== false;
  trailToggle.addEventListener('change', (e) => {
    currentSettings.trailEnabled = e.target.checked;
    saveSettings();
  });

  // Cursor toggle
  const cursorToggle = document.getElementById('cursorToggle');
  cursorToggle.checked = currentSettings.cursorEnabled !== false;
  cursorToggle.addEventListener('change', (e) => {
    currentSettings.cursorEnabled = e.target.checked;
    saveSettings();
  });

  // Trail cards
  const effectCards = document.querySelectorAll('.effect-card');
  effectCards.forEach(card => {
    if (card.dataset.style === currentSettings.trailStyle) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }

    card.addEventListener('click', () => {
      effectCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      currentSettings.trailStyle = card.dataset.style;
      currentSettings.trailEnabled = true;
      trailToggle.checked = true;
      saveSettings();
    });
  });

  // Cursor cards
  const cursorCards = document.querySelectorAll('.cursor-card');
  cursorCards.forEach(card => {
    if (card.dataset.cursor === currentSettings.cursorStyle) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }

    card.addEventListener('click', () => {
      cursorCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      currentSettings.cursorStyle = card.dataset.cursor;
      currentSettings.cursorEnabled = true;
      cursorToggle.checked = true;
      saveSettings();
    });
  });

  // Color dots
  const colorDots = document.querySelectorAll('.color-dot');
  const customColorPicker = document.getElementById('customColorPicker');

  function updateColorSelection(selectedColor) {
    colorDots.forEach(dot => {
      if (dot.dataset.color === selectedColor) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }
  updateColorSelection(currentSettings.trailColor);

  colorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const col = dot.dataset.color;
      currentSettings.trailColor = col;
      updateColorSelection(col);
      saveSettings();
    });
  });

  customColorPicker.addEventListener('input', (e) => {
    const col = e.target.value;
    currentSettings.trailColor = col;
    colorDots.forEach(d => d.classList.remove('active'));
    saveSettings();
  });

  // Trail Length Slider
  const trailLengthInput = document.getElementById('trailLengthInput');
  const trailLengthVal = document.getElementById('trailLengthVal');
  trailLengthInput.value = currentSettings.trailLength || 28;
  trailLengthVal.textContent = trailLengthInput.value;
  trailLengthInput.addEventListener('input', (e) => {
    trailLengthVal.textContent = e.target.value;
    currentSettings.trailLength = parseInt(e.target.value, 10);
    saveSettings();
  });

  // Trail Width Slider
  const trailWidthInput = document.getElementById('trailWidthInput');
  const trailWidthVal = document.getElementById('trailWidthVal');
  trailWidthInput.value = currentSettings.trailWidth || 6;
  trailWidthVal.textContent = `${trailWidthInput.value}px`;
  trailWidthInput.addEventListener('input', (e) => {
    trailWidthVal.textContent = `${e.target.value}px`;
    currentSettings.trailWidth = parseFloat(e.target.value);
    saveSettings();
  });

  // Click Effect Select
  const clickEffectSelect = document.getElementById('clickEffectSelect');
  clickEffectSelect.value = currentSettings.clickEffect || 'ripple-burst';
  clickEffectSelect.addEventListener('change', (e) => {
    currentSettings.clickEffect = e.target.value;
    saveSettings();
  });

  // Keep Text Input
  const keepTextInput = document.getElementById('keepTextInput');
  keepTextInput.checked = !currentSettings.enableInInputs;
  keepTextInput.addEventListener('change', (e) => {
    currentSettings.enableInInputs = !e.target.checked;
    saveSettings();
  });

  // Reset defaults
  document.getElementById('resetDefaultsBtn').addEventListener('click', () => {
    currentSettings = { ...DEFAULT_SETTINGS };
    saveSettings();
    location.reload();
  });
}

// Chuyển Tab
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });
}

// Khởi tạo Live Preview trong Popup
function initLivePreview() {
  const previewArea = document.getElementById('previewArea');
  const canvas = document.getElementById('previewCanvas');

  function resizePreviewCanvas() {
    const rect = previewArea.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  }
  resizePreviewCanvas();

  // Khởi tạo engine vệt sáng cho khung Preview
  previewEngine = new SafariTrailEngine({
    canvasId: 'previewCanvas',
    container: previewArea,
    trailEnabled: currentSettings.masterEnabled && currentSettings.trailEnabled,
    trailStyle: currentSettings.trailStyle,
    trailColor: currentSettings.trailColor,
    trailLength: currentSettings.trailLength,
    trailWidth: currentSettings.trailWidth,
    clickEffect: currentSettings.clickEffect,
    cursorStyle: currentSettings.cursorStyle
  });

  // Tùy biến con trỏ chuột trong khung Preview
  updatePreviewCursor();

  // Thêm tự động animation di chuột nhẹ nhàng demo ban đầu
  runPreviewIntro();
}

function updatePreviewCursor() {
  const previewArea = document.getElementById('previewArea');
  if (!currentSettings.masterEnabled || !currentSettings.cursorEnabled || currentSettings.cursorStyle === 'default') {
    previewArea.style.cursor = 'default';
    return;
  }
  const styleName = currentSettings.cursorStyle || 'neon-cyan';
  previewArea.style.cursor = `url("../assets/cursors/${styleName}.svg") 4 4, crosshair`;
}

// Chạy một vệt uốn lượn demo khi vừa mở popup để người dùng thấy tính năng ngay
function runPreviewIntro() {
  const previewArea = document.getElementById('previewArea');
  const rect = previewArea.getBoundingClientRect();
  let step = 0;
  const totalSteps = 40;

  const interval = setInterval(() => {
    if (step > totalSteps) {
      clearInterval(interval);
      return;
    }
    const t = step / totalSteps;
    const x = rect.left + rect.width * 0.15 + (rect.width * 0.7) * t;
    const y = rect.top + rect.height * 0.5 + Math.sin(t * Math.PI * 4) * (rect.height * 0.25);

    previewEngine.onPointerMove({
      clientX: x,
      clientY: y
    });

    step++;
  }, 22);
}
