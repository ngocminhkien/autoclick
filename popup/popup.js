document.addEventListener('DOMContentLoaded', () => {
  const summaryEl = document.getElementById('storage-summary');
  const keyRecordEl = document.getElementById('key-record');
  const keyRunEl = document.getElementById('key-run');
  const keyToggleEl = document.getElementById('key-toggle');
  const btnToggleHotkeyText = document.getElementById('btn-toggle-hotkey-text');
  const btnOpenTest = document.getElementById('btn-open-test');
  const btnToggleFloating = document.getElementById('btn-toggle-floating');

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['mac_multi_scripts_v2', 'mac_settings'], (res) => {
      const scripts = res.mac_multi_scripts_v2 || [];
      const settings = res.mac_settings || {};

      const toggleKey = settings.toggleHotkey || 'Alt+A';
      if (keyToggleEl) keyToggleEl.textContent = toggleKey;
      if (btnToggleHotkeyText) btnToggleHotkeyText.textContent = toggleKey;
      if (settings.recordHotkey && keyRecordEl) keyRecordEl.textContent = settings.recordHotkey;
      if (settings.runHotkey && keyRunEl) keyRunEl.textContent = settings.runHotkey;

      const enabledCount = scripts.filter(s => s.enabled).length;
      const totalPoints = scripts.reduce((sum, s) => sum + (s.points ? s.points.length : 0), 0);

      summaryEl.textContent = `🎛️ ${scripts.length} kịch bản (${enabledCount} đang bật) • 📍 ${totalPoints} điểm • 🚀 Khởi động: ${toggleKey}`;
    });
  } else {
    summaryEl.textContent = '📍 Sẵn sàng sử dụng trên tab hiện tại (Alt+A)';
  }

  if (btnToggleFloating) {
    btnToggleFloating.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { cmd: 'toggle_widget' }, (res) => {
              if (chrome.runtime.lastError) {
                alert('Không thể mở trên trang này (ví dụ trang chrome:// hoặc chưa tải xong). Vui lòng thử trên một trang web thông thường.');
              } else {
                window.close(); // Đóng popup để người dùng thấy widget trên trang web
              }
            });
          }
        });
      }
    });
  }

  btnOpenTest.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL('test/test-page.html') });
    } else {
      window.open('../test/test-page.html', '_blank');
    }
  });
});
