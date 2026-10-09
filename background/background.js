/**
 * Auto Click Đa Điểm - Service Worker
 */

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[AutoClicker] Extension installed/updated:', details.reason);
});

// Lắng nghe phím tắt toàn trình duyệt (Mặc định: Alt+A)
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-autoclicker') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { cmd: 'toggle_widget' }).catch(() => {
          // Bỏ qua nếu tab không hỗ trợ content script (chrome://, webstore...)
        });
      }
    });
  }
});
