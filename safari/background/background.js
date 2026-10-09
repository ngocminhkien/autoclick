/**
 * Safari Magic Cursor & Trail - Background Service Worker
 * Hỗ trợ Safari Web Extension (Manifest V3)
 */

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

// Khởi tạo cài đặt mặc định khi cài đặt hoặc cập nhật
chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    const current = await chrome.storage.local.get(null);
    const updated = { ...DEFAULT_SETTINGS, ...current };
    await chrome.storage.local.set(updated);
    console.log('[Safari Cursor] Khởi tạo cấu hình thành công:', updated);
  } catch (err) {
    console.error('[Safari Cursor] Lỗi khởi tạo cấu hình:', err);
  }
});

// Lắng nghe thông điệp từ popup hoặc content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.local.get(DEFAULT_SETTINGS).then(sendResponse);
    return true; // async response
  }
  
  if (request.action === 'saveSettings') {
    chrome.storage.local.set(request.settings).then(() => {
      // Bắn thông báo cập nhật tới tất cả tab đang mở
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'settingsUpdated',
              settings: request.settings
            }).catch(() => {});
          }
        });
      });
      sendResponse({ success: true });
    });
    return true;
  }
});
