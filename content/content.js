/**
 * Auto Click Đa Điểm - Multi-Point Auto Clicker V2.1
 * Optimized for Cloud Phones (CloudEmulator, Redfinger), WebRTC Streams & Canvas.
 * Features:
 * 1. Multi-script priority scheduler with Mutex Lock (No overlapping clicks).
 * 2. Interval repeat starts ONLY AFTER script finishes running.
 * 3. Interval unit support: Giây (s), Phút (m), Giờ (h).
 * 4. Intuitive direct UI: Add/Edit points in ANY script with editable X, Y, Delay.
 * 5. Touch hold duration (70ms) & PointerEvent/TouchEvent compatibility for Android Cloud Emulators.
 */

(function () {
  if (window.__MAC_V21_LOADED__) return;
  window.__MAC_V21_LOADED__ = true;

  const isTopWindow = window === window.top;

  const PRIORITY = {
    HIGH: 1,    // Ưu tiên Cao nhất
    NORMAL: 2,  // Ưu tiên Trung bình
    LOW: 3      // Ưu tiên Thấp
  };

  const DEFAULT_SETTINGS = {
    recordHotkey: 'F2',
    runHotkey: 'F4',
    toggleHotkey: 'Alt+A',
    autoOpenOnPageLoad: false, // Mặc định: KHÔNG tự mở cùng web, bấm Alt+A để khởi động
    showMarkers: true,
    touchHoldDuration: 70 // ms hold duration for Android touch / cloud emulators
  };

  let state = {
    isRecording: false,
    isSchedulerRunning: false,
    isMouseLocked: false,
    runningScriptId: null,
    executionQueue: [],
    activeScriptId: null,
    displayedScriptId: null, // ID của kịch bản duy nhất đang hiển thị các điểm click trên màn hình
    scripts: [],
    settings: { ...DEFAULT_SETTINGS },
    isMinimized: false,
    abortController: null,
    currentTab: 'scripts' // 'scripts', 'stats', hoặc 'settings'
  };

  let shadowRoot = null;
  let hostElement = null;
  let markersContainer = null;
  let schedulerIntervalId = null;
  let schedulerWorker = null;

  // ============================================================================
  // 1. STORAGE LAYER
  // ============================================================================
  const StorageManager = {
    async load() {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(['mac_multi_scripts_v2', 'mac_active_script_id', 'mac_displayed_script_id', 'mac_settings'], (result) => {
            if (result.mac_multi_scripts_v2 && Array.isArray(result.mac_multi_scripts_v2) && result.mac_multi_scripts_v2.length > 0) {
              state.scripts = result.mac_multi_scripts_v2;
            } else {
              initDefaultScript();
            }
            // Chuẩn hóa runCount, lastRunAt và timingMode
            state.scripts.forEach(s => {
              s.runCount = s.runCount || 0;
              s.lastRunAt = s.lastRunAt || null;
              s.timingMode = s.timingMode || 'after_finish';
            });
            if (result.mac_settings) state.settings = { ...DEFAULT_SETTINGS, ...result.mac_settings };
            if (!state.settings.toggleHotkey) state.settings.toggleHotkey = 'Alt+A';
            if (typeof state.settings.autoOpenOnPageLoad !== 'boolean') state.settings.autoOpenOnPageLoad = false;
            state.activeScriptId = result.mac_active_script_id || (state.scripts[0] ? state.scripts[0].id : null);
            state.displayedScriptId = result.mac_displayed_script_id !== undefined ? result.mac_displayed_script_id : state.activeScriptId;
            resolve();
          });
        } else {
          try {
            const rawScripts = localStorage.getItem('mac_multi_scripts_v2');
            const rawSettings = localStorage.getItem('mac_settings');
            if (rawScripts) state.scripts = JSON.parse(rawScripts);
            else initDefaultScript();
            state.scripts.forEach(s => {
              s.runCount = s.runCount || 0;
              s.lastRunAt = s.lastRunAt || null;
              s.timingMode = s.timingMode || 'after_finish';
            });
            if (rawSettings) state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) };
            if (!state.settings.toggleHotkey) state.settings.toggleHotkey = 'Alt+A';
            if (typeof state.settings.autoOpenOnPageLoad !== 'boolean') state.settings.autoOpenOnPageLoad = false;
            state.activeScriptId = state.scripts[0] ? state.scripts[0].id : null;
            const rawDisp = localStorage.getItem('mac_displayed_script_id');
            state.displayedScriptId = rawDisp !== null ? rawDisp : state.activeScriptId;
          } catch (e) {
            initDefaultScript();
          }
          resolve();
        }
      });
    },

    async save() {
      return new Promise((resolve) => {
        const payload = {
          mac_multi_scripts_v2: state.scripts,
          mac_active_script_id: state.activeScriptId,
          mac_displayed_script_id: state.displayedScriptId,
          mac_settings: state.settings
        };
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set(payload, () => resolve());
        } else {
          try {
            localStorage.setItem('mac_multi_scripts_v2', JSON.stringify(state.scripts));
            localStorage.setItem('mac_active_script_id', state.activeScriptId || '');
            localStorage.setItem('mac_displayed_script_id', state.displayedScriptId || '');
            localStorage.setItem('mac_settings', JSON.stringify(state.settings));
          } catch (e) {}
          resolve();
        }
      });
    }
  };

  function initDefaultScript() {
    state.scripts = [
      {
        id: 'script_' + Date.now() + '_1',
        name: 'Kịch bản 1',
        enabled: true,
        priority: PRIORITY.NORMAL,
        intervalValue: 10,
        intervalUnit: 's', // 's' = Giây, 'm' = Phút, 'h' = Giờ
        timingMode: 'after_finish', // 'after_finish' = Đếm sau khi kết thúc, 'from_start' = Đếm ngay khi bắt đầu
        clickDelay: 500,
        points: [],
        nextRunAt: 0,
        status: 'idle',
        isPointsExpanded: true,
        runCount: 0,
        lastRunAt: null
      }
    ];
  }

  function getActiveScript() {
    return state.scripts.find(s => s.id === state.activeScriptId) || state.scripts[0] || null;
  }

  function getDisplayedScript() {
    if (!state.displayedScriptId) return null;
    return state.scripts.find(s => s.id === state.displayedScriptId) || null;
  }

  function getIntervalMs(script) {
    const val = Math.max(1, script.intervalValue || 10);
    const unit = script.intervalUnit || 's';
    const mult = unit === 'h' ? 3600 : (unit === 'm' ? 60 : 1);
    return val * mult * 1000;
  }

  // ============================================================================
  // 2. UNTHROTTLED WEB WORKER TIMER (Bypasses background tab sleep)
  // ============================================================================
  function initSchedulerWorker() {
    try {
      const workerBlob = new Blob([`
        let timer = null;
        self.onmessage = function(e) {
          if (e.data.cmd === 'start') {
            if (timer) clearInterval(timer);
            timer = setInterval(() => {
              self.postMessage({ type: 'tick' });
            }, e.data.interval || 150);
          } else if (e.data.cmd === 'stop') {
            if (timer) clearInterval(timer);
            timer = null;
          }
        };
      `], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(workerBlob);
      schedulerWorker = new Worker(workerUrl);
      schedulerWorker.onmessage = (e) => {
        if (e.data && e.data.type === 'tick') {
          PriorityScheduler.tick();
        }
      };
    } catch (err) {
      schedulerWorker = null;
    }
  }

  // ============================================================================
  // 3. PRIORITY SCHEDULER (Only loops AFTER script finishes)
  // ============================================================================
  const PriorityScheduler = {
    start() {
      if (state.isSchedulerRunning) return;
      state.isSchedulerRunning = true;
      state.abortController = new AbortController();

      const enabledScripts = state.scripts.filter(s => s.enabled && s.points.length > 0);
      if (enabledScripts.length === 0) {
        showToast('⚠️ Hãy thêm điểm click và bật ít nhất 1 kịch bản để chạy!');
        state.isSchedulerRunning = false;
        updateUIStatus();
        return;
      }

      // First run: Phân biệt kịch bản độc lập (starters) và kịch bản chờ kích hoạt theo chuỗi (followers)
      const now = Date.now();

      // 1. Tìm các kịch bản là đích đến của một kịch bản khác đang bật (follower)
      const followerIds = new Set();
      enabledScripts.forEach(p => {
        if (p.nextScriptId && p.nextScriptId !== 'self' && p.nextScriptId !== 'stop' && p.nextScriptId !== p.id) {
          followerIds.add(p.nextScriptId);
        }
      });

      // 2. Kịch bản độc lập hoặc đứng đầu chuỗi (không có ai trỏ tới) sẽ chạy ngay
      const starters = new Set(enabledScripts.filter(s => !followerIds.has(s.id)).map(s => s.id));

      // 3. Với các kịch bản tạo thành vòng lặp kín tuần hoàn (ví dụ 1 -> 2 -> 1):
      // Chọn chính xác 1 kịch bản khởi động (ưu tiên kịch bản đang chọn active, hoặc kịch bản đầu tiên)
      const remaining = enabledScripts.filter(s => !starters.has(s.id));
      const visited = new Set();
      remaining.forEach(s => {
        if (!visited.has(s.id)) {
          let curr = s;
          const cycle = [];
          while (curr && !visited.has(curr.id) && remaining.some(r => r.id === curr.id)) {
            visited.add(curr.id);
            cycle.push(curr);
            const nextId = curr.nextScriptId;
            curr = remaining.find(r => r.id === nextId);
          }
          if (cycle.length > 0) {
            const chosen = cycle.find(c => c.id === state.activeScriptId) || cycle[0];
            starters.add(chosen.id);
          }
        }
      });

      // 4. Thiết lập lịch chạy: kịch bản mở đầu chạy ngay lúc now, kịch bản theo sau đợi lượt
      enabledScripts.forEach(s => {
        if (starters.has(s.id)) {
          s.nextRunAt = now;
          s.status = 'waiting';
        } else {
          s.nextRunAt = Infinity;
          s.status = 'waiting';
        }
      });

      showToast(`🚀 Đã khởi động hệ thống (${enabledScripts.length} kịch bản đang bật)!`);
      updateUIStatus();

      if (schedulerWorker) {
        schedulerWorker.postMessage({ cmd: 'start', interval: 150 });
      }
      schedulerIntervalId = setInterval(() => this.tick(), 150);
    },

    stop() {
      state.isSchedulerRunning = false;
      state.isMouseLocked = false;
      state.runningScriptId = null;
      state.executionQueue = [];

      if (schedulerWorker) {
        schedulerWorker.postMessage({ cmd: 'stop' });
      }
      if (schedulerIntervalId) {
        clearInterval(schedulerIntervalId);
        schedulerIntervalId = null;
      }
      if (state.abortController) {
        state.abortController.abort();
        state.abortController = null;
      }

      state.scripts.forEach(s => s.status = 'idle');
      highlightMarker(-1, false);
      updateUIStatus();
      renderScriptsList();
      showToast('⏹️ Đã dừng toàn bộ hệ thống kịch bản.');
    },

    tick() {
      if (!state.isSchedulerRunning) return;

      const now = Date.now();

      // Check scripts whose repeat timer has arrived
      state.scripts.forEach(script => {
        if (script.enabled && script.points && script.points.length > 0) {
          if (now >= script.nextRunAt && script.status !== 'running' && !state.executionQueue.includes(script.id)) {
            script.status = 'queued';
            state.executionQueue.push(script.id);
          }
        }
      });

      // Priority sort (High 1 > Normal 2 > Low 3)
      state.executionQueue.sort((idA, idB) => {
        const sA = state.scripts.find(s => s.id === idA);
        const sB = state.scripts.find(s => s.id === idB);
        if (!sA || !sB) return 0;
        if (sA.priority !== sB.priority) {
          return sA.priority - sB.priority;
        }
        return sA.nextRunAt - sB.nextRunAt;
      });

      updateQueueBanner();

      // Dispatch if mouse lock is available
      if (!state.isMouseLocked && state.executionQueue.length > 0) {
        const nextScriptId = state.executionQueue.shift();
        const targetScript = state.scripts.find(s => s.id === nextScriptId);
        if (targetScript && targetScript.enabled && targetScript.points.length > 0) {
          this.executeScript(targetScript);
        }
      }

      renderScriptCountdowns();
    },

    async executeScript(script) {
      // 1. ACQUIRE MUTEX LOCK
      state.isMouseLocked = true;
      state.runningScriptId = script.id;
      script.status = 'running';

      const executionStartTime = Date.now();
      const intervalMs = getIntervalMs(script);
      const isFromStart = script.timingMode === 'from_start';

      // NẾU CHẾ ĐỘ LÀ "ĐẾM NGAY KHI BẮT ĐẦU" (from_start) VÀ HỆ THỐNG ĐANG BẬT TỰ ĐỘNG CHẠY:
      if (state.isSchedulerRunning && isFromStart) {
        const nextTargetId = script.nextScriptId || 'self';
        if (nextTargetId !== 'stop') {
          if (nextTargetId !== 'self') {
            const targetNextScript = state.scripts.find(s => s.id === nextTargetId);
            if (targetNextScript) {
              targetNextScript.enabled = true;
              targetNextScript.nextRunAt = executionStartTime + intervalMs;
              targetNextScript.status = 'waiting';
              state.executionQueue = state.executionQueue.filter(id => id !== targetNextScript.id && id !== script.id);
              script.nextRunAt = Infinity;
            }
          } else {
            // Tự lặp lại: bắt đầu đếm ngược ngay từ lúc bắt đầu click
            script.nextRunAt = executionStartTime + intervalMs;
          }
        }
      }

      const widget = shadowRoot ? shadowRoot.getElementById('mac-floating-widget') : null;
      if (widget) widget.classList.add('is-running-mode');

      updateUIStatus();
      renderScriptsList();
      renderMarkers(script.points, script.priority);

      const prioText = script.priority === 1 ? '⭐ Ưu tiên Cao' : (script.priority === 2 ? '🔷 Ưu tiên TB' : '⚪ Ưu tiên Thấp');
      updateQueueBanner(`⚡ ĐANG THỰC THI: [${script.name}] (${prioText})`);

      let completedAll = false;
      let completedPointsCount = 0;

      try {
        const signal = state.abortController ? state.abortController.signal : null;

        for (let i = 0; i < script.points.length; i++) {
          if (signal && signal.aborted) break;

          const pt = script.points[i];
          highlightMarker(i, true);

          const clientX = pt.pageX - window.scrollX;
          const clientY = pt.pageY - window.scrollY;

          // DISPATCH EMULATOR-COMPATIBLE TOUCH & MOUSE CLICK
          await simulateCloudPhoneClick(clientX, clientY, pt.pageX, pt.pageY, pt.selector, state.settings.touchHoldDuration || 70);

          const delayTime = pt.delay || script.clickDelay || 500;
          await sleep(delayTime, signal);

          highlightMarker(i, false);
          completedPointsCount++;
        }

        if (completedPointsCount === script.points.length && (!signal || !signal.aborted)) {
          completedAll = true;
        }
      } catch (e) {
        // Aborted
      } finally {
        if (completedAll) {
          script.runCount = (script.runCount || 0) + 1;
          script.lastRunAt = Date.now();
          StorageManager.save();
          updateStatsBadges();
          if (state.currentTab === 'stats') {
            renderStatsList();
          }
        }

        // 2. RELEASE MUTEX LOCK
        state.isMouseLocked = false;
        state.runningScriptId = null;

        if (widget) widget.classList.remove('is-running-mode');

        // NẾU HỆ THỐNG ĐANG BẬT TỰ ĐỘNG CHẠY (SCHEDULER RUNNING):
        if (!state.isSchedulerRunning) {
          script.status = 'idle';
          script.nextRunAt = Infinity;
        } else {
          const nextTargetId = script.nextScriptId || 'self';

          if (nextTargetId === 'stop') {
            script.status = 'idle';
            script.nextRunAt = Infinity;
          } else if (isFromStart) {
            // CHẾ ĐỘ 1: ĐẾM NGAY KHI BẮT ĐẦU (from_start)
            if (nextTargetId !== 'self') {
              // Kịch bản này chuyển lượt cho target, dừng lại và đợi target gọi lại
              script.status = 'idle';
              script.nextRunAt = Infinity;
              const targetNextScript = state.scripts.find(s => s.id === nextTargetId);
              if (targetNextScript && (targetNextScript.nextRunAt === 0 || targetNextScript.nextRunAt === Infinity)) {
                targetNextScript.enabled = true;
                targetNextScript.nextRunAt = executionStartTime + intervalMs;
                targetNextScript.status = 'waiting';
              }
            } else {
              // Tự lặp lại: script chuyển sang 'waiting', nextRunAt đã được tính từ executionStartTime
              script.status = 'waiting';
            }
          } else {
            // CHẾ ĐỘ 2: CHẠY SAU KHI KẾT THÚC (after_finish)
            const finishTime = Date.now();
            if (nextTargetId !== 'self') {
              const targetNextScript = state.scripts.find(s => s.id === nextTargetId);
              if (targetNextScript) {
                targetNextScript.enabled = true;
                targetNextScript.nextRunAt = finishTime + intervalMs;
                targetNextScript.status = 'waiting';

                // Xóa cả 2 kịch bản khỏi hàng đợi nếu đang có
                state.executionQueue = state.executionQueue.filter(id => id !== targetNextScript.id && id !== script.id);

                // KỊCH BẢN NÀY PHẢI DỪNG LẠI HOÀN TOÀN VÀ ĐỢI KỊCH BẢN MỤC TIÊU KÍCH HOẠT LẠI
                script.status = 'idle';
                script.nextRunAt = Infinity;
              } else {
                script.nextRunAt = finishTime + intervalMs;
                script.status = 'waiting';
              }
            } else {
              script.nextRunAt = finishTime + intervalMs;
              script.status = 'waiting';
            }
          }
        }

        highlightMarker(-1, false);

        if (state.executionQueue.length === 0) {
          updateDisplayedMarkers();
        }

        updateUIStatus();
        renderScriptsList();
      }
    }
  };

  // ============================================================================
  // 3.1. RUN SINGLE SCRIPT INDEPENDENTLY (Chạy riêng biệt 1 kịch bản)
  // ============================================================================
  async function runSingleScript(scriptId) {
    const script = state.scripts.find(s => s.id === scriptId);
    if (!script) return;
    if (!script.points || script.points.length === 0) {
      showToast(`⚠️ Kịch bản "${script.name}" chưa có điểm click nào!`);
      return;
    }

    // Trường hợp 1: Hệ thống Chạy Tất Cả đang bật trong nền
    if (state.isSchedulerRunning) {
      if (state.isMouseLocked) {
        showToast(`⏳ Chuột đang bận! "${script.name}" được ưu tiên lên đầu hàng đợi.`);
        if (!state.executionQueue.includes(script.id)) {
          state.executionQueue.unshift(script.id);
        }
        updateQueueBanner();
      } else {
        showToast(`⚡ Chạy riêng: "${script.name}"...`);
        script.nextRunAt = Date.now();
        script.status = 'queued';
        if (!state.executionQueue.includes(script.id)) {
          state.executionQueue.unshift(script.id);
        }
        PriorityScheduler.tick();
      }
      return;
    }

    // Trường hợp 2: Hệ thống đang tắt - Chạy riêng kịch bản này 1 lần
    if (state.isMouseLocked) {
      showToast('⚠️ Chuột đang bận thực hiện tác vụ khác.');
      return;
    }

    showToast(`⚡ Đang chạy riêng: "${script.name}"...`);
    state.abortController = new AbortController();
    try {
      await PriorityScheduler.executeScript(script);
      showToast(`✅ Đã hoàn thành kịch bản "${script.name}"!`);
    } catch (e) {
      showToast(`⏹️ Đã dừng kịch bản "${script.name}".`);
    } finally {
      state.isMouseLocked = false;
      state.runningScriptId = null;
      script.status = 'idle';
      updateUIStatus();
      renderScriptsList();
    }
  }

  // ============================================================================
  // 4. CLOUD PHONE / WEBRTC CANVAS CLICK ENGINE
  // ============================================================================
  async function simulateCloudPhoneClick(clientX, clientY, pageX, pageY, selector, holdMs = 70) {
    createClickRipple(pageX, pageY);

    // CRITICAL: Find underlying target while IGNORING extension widget and markers!
    const target = getUnderlyingTarget(clientX, clientY, selector);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const offsetX = Math.max(0, clientX - rect.left);
    const offsetY = Math.max(0, clientY - rect.top);
    const screenX = clientX + (window.screenX || 0);
    const screenY = clientY + (window.screenY || 0);

    const baseEventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      detail: 1,
      clientX: clientX,
      clientY: clientY,
      screenX: screenX,
      screenY: screenY,
      pageX: pageX,
      pageY: pageY,
      button: 0,
      buttons: 1
    };

    // Helper to set read-only offsetX and offsetY
    function dispatchWithOffset(eventType, EventClass, extraProps = {}) {
      const evt = new EventClass(eventType, { ...baseEventInit, ...extraProps });
      try {
        Object.defineProperty(evt, 'offsetX', { value: offsetX, writable: false });
        Object.defineProperty(evt, 'offsetY', { value: offsetY, writable: false });
        Object.defineProperty(evt, 'layerX', { value: offsetX, writable: false });
        Object.defineProperty(evt, 'layerY', { value: offsetY, writable: false });
      } catch (e) {}
      target.dispatchEvent(evt);
    }

    const pointerProps = {
      pointerId: 1,
      pointerType: 'touch', // Android cloud phone gesture listeners check touch/mouse
      isPrimary: true,
      pressure: 0.5,
      width: 1,
      height: 1
    };

    // 1. Pointer Down
    dispatchWithOffset('pointerdown', PointerEvent, pointerProps);

    // 2. Touch Start (if TouchEvent available)
    try {
      if (window.TouchEvent && window.Touch) {
        const touch = new Touch({
          identifier: 1,
          target: target,
          clientX: clientX,
          clientY: clientY,
          screenX: screenX,
          screenY: screenY,
          pageX: pageX,
          pageY: pageY,
          radiusX: 2,
          radiusY: 2,
          force: 0.5
        });
        target.dispatchEvent(new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [touch],
          targetTouches: [touch],
          changedTouches: [touch]
        }));
      }
    } catch (e) {}

    // 3. Mouse Down
    dispatchWithOffset('mousedown', MouseEvent, { buttons: 1 });
    target.focus && target.focus();

    // 4. CRITICAL HOLD DURATION: Cloud Phones drop 0ms instant taps!
    await sleep(holdMs);

    // 5. Pointer Up
    dispatchWithOffset('pointerup', PointerEvent, { ...pointerProps, pressure: 0, buttons: 0 });

    // 6. Touch End
    try {
      if (window.TouchEvent && window.Touch) {
        const touch = new Touch({
          identifier: 1,
          target: target,
          clientX: clientX,
          clientY: clientY,
          screenX: screenX,
          screenY: screenY,
          pageX: pageX,
          pageY: pageY
        });
        target.dispatchEvent(new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          touches: [],
          targetTouches: [],
          changedTouches: [touch]
        }));
      }
    } catch (e) {}

    // 7. Mouse Up & Click
    dispatchWithOffset('mouseup', MouseEvent, { buttons: 0 });
    dispatchWithOffset('click', MouseEvent, { buttons: 0 });

    // 8. Direct .click() if standard DOM button
    if (typeof target.click === 'function' && target.tagName !== 'CANVAS' && target.tagName !== 'VIDEO' && target !== document.body) {
      try { target.click(); } catch (e) {}
    }
  }

  // Finds the actual webpage element under (x, y) ignoring extension markers
  function getUnderlyingTarget(clientX, clientY, selector) {
    if (document.elementsFromPoint) {
      const list = document.elementsFromPoint(clientX, clientY);
      for (const el of list) {
        if (!el) continue;
        // Ignore extension root and markers
        if (hostElement && (el === hostElement || hostElement.contains(el))) continue;
        if (el.classList && el.classList.contains('mac-marker')) continue;
        return el;
      }
    }

    // Fallback: selector
    if (selector) {
      try {
        const found = document.querySelector(selector);
        if (found) return found;
      } catch (e) {}
    }

    return document.elementFromPoint(clientX, clientY) || document.body;
  }

  function createClickRipple(pageX, pageY) {
    if (!markersContainer) return;
    const ripple = document.createElement('div');
    ripple.className = 'mac-click-ripple';
    ripple.style.left = pageX + 'px';
    ripple.style.top = pageY + 'px';
    markersContainer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 550);
  }

  function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }
    });
  }

  // ============================================================================
  // 5. DOM SELECTOR GENERATOR
  // ============================================================================
  function getDomSelector(el) {
    if (!el || el === document.body || el === document.documentElement) return null;
    if (el.id) return '#' + CSS.escape(el.id);

    const testId = el.getAttribute('data-testid');
    if (testId) return `[data-testid="${CSS.escape(testId)}"]`;

    if (el.tagName === 'CANVAS') return 'canvas';
    if (el.tagName === 'VIDEO') return 'video';

    const path = [];
    let curr = el;
    while (curr && curr.nodeType === Node.ELEMENT_NODE && curr !== document.body && curr !== document.documentElement) {
      let sel = curr.nodeName.toLowerCase();
      if (curr.id) {
        sel = '#' + CSS.escape(curr.id);
        path.unshift(sel);
        break;
      } else {
        let sib = curr;
        let nth = 1;
        while ((sib = sib.previousElementSibling)) {
          if (sib.nodeName.toLowerCase() === sel) nth++;
        }
        sel += `:nth-of-type(${nth})`;
      }
      path.unshift(sel);
      curr = curr.parentNode;
    }
    return path.join(' > ');
  }

  // ============================================================================
  // 5.1. STATS & RUN COUNTER HELPERS
  // ============================================================================
  function getTotalRunCount() {
    return state.scripts.reduce((acc, s) => acc + (s.runCount || 0), 0);
  }

  function updateStatsBadges() {
    if (!shadowRoot) return;
    const countEl = shadowRoot.getElementById('badge-scripts-count');
    const runsEl = shadowRoot.getElementById('badge-total-runs');
    if (countEl) countEl.textContent = state.scripts.length;
    if (runsEl) runsEl.textContent = `${getTotalRunCount()} lượt`;

    state.scripts.forEach(s => {
      const badge = shadowRoot.getElementById(`card-run-badge-${s.id}`);
      if (badge) {
        badge.textContent = `🎯 ${s.runCount || 0} lượt`;
      }
    });
  }

  function switchTab(tabName) {
    state.currentTab = tabName;
    if (!shadowRoot) return;

    const tabScripts = shadowRoot.getElementById('tab-btn-scripts');
    const tabStats = shadowRoot.getElementById('tab-btn-stats');
    const tabSettings = shadowRoot.getElementById('tab-btn-settings');
    const contentScripts = shadowRoot.getElementById('tab-content-scripts');
    const contentStats = shadowRoot.getElementById('tab-content-stats');
    const contentSettings = shadowRoot.getElementById('tab-content-settings');

    [tabScripts, tabStats, tabSettings].forEach(t => t && t.classList.remove('is-active'));
    [contentScripts, contentStats, contentSettings].forEach(c => c && (c.style.display = 'none'));

    if (tabName === 'stats') {
      if (tabStats) tabStats.classList.add('is-active');
      if (contentStats) contentStats.style.display = 'flex';
      renderStatsList();
    } else if (tabName === 'settings') {
      if (tabSettings) tabSettings.classList.add('is-active');
      if (contentSettings) contentSettings.style.display = 'flex';
      renderSettingsPanel();
    } else {
      if (tabScripts) tabScripts.classList.add('is-active');
      if (contentScripts) contentScripts.style.display = 'flex';
      renderScriptsList();
    }
    updateStatsBadges();
  }

  function updateMarkersVisibilityUI() {
    if (!shadowRoot) return;
    const isShown = (state.settings.showMarkers !== false) && !!state.displayedScriptId;
    if (markersContainer) {
      markersContainer.style.display = (state.settings.showMarkers !== false) ? 'block' : 'none';
    }
    const btnText = shadowRoot.getElementById('mac-marker-text');
    const btnIcon = shadowRoot.getElementById('mac-marker-icon');
    const headerBtn = shadowRoot.getElementById('mac-btn-toggle-markers-header');
    const toggleBtn = shadowRoot.getElementById('btn-toggle-markers');

    if (isShown) {
      if (btnText) btnText.textContent = 'Ẩn Ghim';
      if (btnIcon) btnIcon.textContent = '👁️';
      if (headerBtn) { headerBtn.textContent = '👁️'; headerBtn.title = 'Bấm để ẩn các điểm ghim trên màn hình'; }
      if (toggleBtn) toggleBtn.classList.remove('is-hidden-mode');
    } else {
      if (btnText) btnText.textContent = 'Hiện Ghim';
      if (btnIcon) btnIcon.textContent = '🕶️';
      if (headerBtn) { headerBtn.textContent = '🕶️'; headerBtn.title = 'Bấm để hiện lại các điểm ghim'; }
      if (toggleBtn) toggleBtn.classList.add('is-hidden-mode');
    }
  }

  function updateDisplayedMarkers() {
    if (!markersContainer) return;
    if (!state.settings.showMarkers || !state.displayedScriptId) {
      markersContainer.innerHTML = '';
      return;
    }
    const displayedScript = getDisplayedScript();
    if (displayedScript && displayedScript.points && displayedScript.points.length > 0) {
      renderMarkers(displayedScript.points, displayedScript.priority, displayedScript.id);
    } else {
      markersContainer.innerHTML = '';
    }
  }

  function toggleDisplayScriptPoints(scriptId) {
    const targetScript = state.scripts.find(s => s.id === scriptId);
    if (!targetScript) return;

    if (state.displayedScriptId === scriptId && state.settings.showMarkers) {
      // Đang hiển thị điểm của kịch bản này -> Tắt đi (ẩn các điểm click)
      state.displayedScriptId = null;
      updateDisplayedMarkers();
      StorageManager.save();
      renderScriptsList();
      updateMarkersVisibilityUI();
      showToast(`🕶️ Đã ẩn các điểm click của "${targetScript.name}"`);
    } else {
      // Đang hiển thị kịch bản khác (A) hoặc chưa hiển thị -> Ẩn điểm của A, chỉ hiển thị điểm của B
      const prevScript = getDisplayedScript();
      state.displayedScriptId = scriptId;
      state.activeScriptId = scriptId;
      state.settings.showMarkers = true;
      if (markersContainer) markersContainer.style.display = 'block';

      updateDisplayedMarkers();
      StorageManager.save();
      renderScriptsList();
      updateMarkersVisibilityUI();

      if (prevScript && prevScript.id !== scriptId) {
        showToast(`👁️ Đã ẩn điểm "${prevScript.name}" và hiển thị điểm "${targetScript.name}" (${targetScript.points.length} điểm)`);
      } else {
        showToast(`👁️ Đang hiển thị ${targetScript.points.length} điểm click của "${targetScript.name}"`);
      }
    }
  }

  function toggleWidgetVisibility() {
    if (!shadowRoot) return;
    const widget = shadowRoot.getElementById('mac-floating-widget');
    if (!widget) return;

    const isHidden = widget.style.display === 'none';

    if (isHidden) {
      widget.style.display = 'flex';
      if (markersContainer) {
        markersContainer.style.display = state.settings.showMarkers ? 'block' : 'none';
        updateDisplayedMarkers();
      }
      showToast(`⚡ Auto Clicker đã kích hoạt! (Bấm ${state.settings.toggleHotkey} để ẩn)`);
    } else {
      widget.style.display = 'none';
      if (markersContainer) markersContainer.style.display = 'none';
      showToast(`Đã ẩn Auto Clicker. Bấm ${state.settings.toggleHotkey} để mở lại!`);
    }
  }

  function isWidgetVisible() {
    if (!shadowRoot) return false;
    const widget = shadowRoot.getElementById('mac-floating-widget');
    return widget && widget.style.display !== 'none';
  }

  function renderSettingsPanel() {
    if (!shadowRoot) return;
    const container = shadowRoot.getElementById('mac-settings-container');
    if (!container) return;

    container.innerHTML = `
      <div class="mac-settings-group">
        <div class="mac-settings-group-title">
          <span>🚀 Khởi Động & Phím Tắt Tiện Ích</span>
        </div>

        <div class="mac-setting-row">
          <div class="mac-setting-info">
            <span class="mac-setting-label">Phím Khởi Động / Bật-Ẩn:</span>
            <span class="mac-setting-desc">Bấm phím này để hiện hoặc ẩn thanh công cụ Auto Clicker trên trang web.</span>
          </div>
          <div class="mac-setting-ctrl">
            <input type="text" class="mac-hotkey-input" id="setting-input-toggle-hotkey" value="${escapeHtml(state.settings.toggleHotkey || 'Alt+A')}" readonly title="Nhấp vào đây rồi bấm tổ hợp phím mong muốn">
            <button class="mac-btn-sub" id="btn-reset-toggle-hotkey" title="Đặt lại về Alt+A">Mặc định</button>
          </div>
        </div>

        <div class="mac-setting-row">
          <div class="mac-setting-info">
            <span class="mac-setting-label">Tự động mở cùng trang web:</span>
            <span class="mac-setting-desc">Mặc định TẮT. Khi tắt: Trang web tải sạch sẽ, tiện ích chỉ hiện khi bạn bấm phím tắt (<b>${escapeHtml(state.settings.toggleHotkey || 'Alt+A')}</b>).</span>
          </div>
          <div class="mac-setting-ctrl">
            <label class="mac-switch">
              <input type="checkbox" id="setting-toggle-auto-open" ${state.settings.autoOpenOnPageLoad ? 'checked' : ''}>
              <span class="mac-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="mac-settings-group">
        <div class="mac-settings-group-title">
          <span>🎮 Phím Tắt Thao Tác Kịch Bản</span>
        </div>

        <div class="mac-setting-row">
          <div class="mac-setting-info">
            <span class="mac-setting-label">Phím Ghi Điểm Click:</span>
            <span class="mac-setting-desc">Bật / Tắt chế độ ghi nhớ tọa độ click trên màn hình.</span>
          </div>
          <div class="mac-setting-ctrl">
            <input type="text" class="mac-hotkey-input" id="setting-input-record-hotkey" value="${escapeHtml(state.settings.recordHotkey || 'F2')}" readonly title="Nhấp vào đây rồi bấm phím mong muốn">
            <button class="mac-btn-sub" id="btn-reset-record-hotkey" title="Đặt lại về F2">F2</button>
          </div>
        </div>

        <div class="mac-setting-row">
          <div class="mac-setting-info">
            <span class="mac-setting-label">Phím Bắt Đầu / Dừng:</span>
            <span class="mac-setting-desc">Kích hoạt chạy hoặc dừng tất cả kịch bản đang bật.</span>
          </div>
          <div class="mac-setting-ctrl">
            <input type="text" class="mac-hotkey-input" id="setting-input-run-hotkey" value="${escapeHtml(state.settings.runHotkey || 'F4')}" readonly title="Nhấp vào đây rồi bấm phím mong muốn">
            <button class="mac-btn-sub" id="btn-reset-run-hotkey" title="Đặt lại về F4">F4</button>
          </div>
        </div>

        <div class="mac-setting-row">
          <div class="mac-setting-info">
            <span class="mac-setting-label">Phím Dừng Khẩn Cấp:</span>
            <span class="mac-setting-desc">Dừng toàn bộ mọi kịch bản và lượt click ngay tức khắc.</span>
          </div>
          <div class="mac-setting-ctrl">
            <span class="mac-badge-fixed">Esc (Cố định)</span>
          </div>
        </div>
      </div>

      <div class="mac-settings-group">
        <div class="mac-settings-group-title">
          <span>📱 Tối Ưu Android & Giả Lập Cloud Phone</span>
        </div>

        <div class="mac-setting-row">
          <div class="mac-setting-info">
            <span class="mac-setting-label">Thời gian giữ chạm (Touch Hold):</span>
            <span class="mac-setting-desc">Độ trễ giữ điểm click (mili-giây) tương thích màn hình cảm ứng CloudEmulator/Redfinger.</span>
          </div>
          <div class="mac-setting-ctrl">
            <input type="number" class="mac-input-number" id="setting-input-touch-hold" min="20" max="500" step="10" value="${state.settings.touchHoldDuration || 70}">
            <span style="font-size:11px; color:#94a3b8;">ms</span>
          </div>
        </div>
      </div>

      <div class="mac-settings-footer">
        <button class="mac-btn-restore-defaults" id="btn-restore-all-defaults" title="Khôi phục toàn bộ cài đặt về ban đầu">
          🔄 Khôi phục mặc định
        </button>
        <button class="mac-btn-save-settings" id="btn-save-settings-now">
          💾 Lưu Cài Đặt
        </button>
      </div>
    `;

    bindSettingsControls(container);
  }

  function bindSettingsControls(container) {
    const inputToggle = container.querySelector('#setting-input-toggle-hotkey');
    const btnResetToggle = container.querySelector('#btn-reset-toggle-hotkey');
    const chkAutoOpen = container.querySelector('#setting-toggle-auto-open');
    const inputRecord = container.querySelector('#setting-input-record-hotkey');
    const btnResetRecord = container.querySelector('#btn-reset-record-hotkey');
    const inputRun = container.querySelector('#setting-input-run-hotkey');
    const btnResetRun = container.querySelector('#btn-reset-run-hotkey');
    const inputTouch = container.querySelector('#setting-input-touch-hold');
    const btnSave = container.querySelector('#btn-save-settings-now');
    const btnResetAll = container.querySelector('#btn-restore-all-defaults');

    function attachHotkeyCapture(inputEl, onCapture) {
      inputEl.addEventListener('focus', () => {
        inputEl.setAttribute('data-prev', inputEl.value);
        inputEl.value = '👉 Bấm phím bất kỳ...';
        inputEl.classList.add('is-capturing');
      });
      inputEl.addEventListener('blur', () => {
        inputEl.classList.remove('is-capturing');
        if (inputEl.value === '👉 Bấm phím bất kỳ...') {
          inputEl.value = inputEl.getAttribute('data-prev') || 'Alt+A';
        }
      });
      inputEl.addEventListener('keydown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
        const keyName = formatHotkeyName(e);
        if (keyName) {
          inputEl.value = keyName;
          inputEl.classList.remove('is-capturing');
          inputEl.blur();
          onCapture(keyName);
        }
      });
    }

    if (inputToggle) {
      attachHotkeyCapture(inputToggle, (key) => {
        state.settings.toggleHotkey = key;
        StorageManager.save();
        showToast(`✅ Phím tắt khởi động đã đổi thành: ${key}`);
      });
    }

    if (btnResetToggle && inputToggle) {
      btnResetToggle.addEventListener('click', () => {
        state.settings.toggleHotkey = 'Alt+A';
        inputToggle.value = 'Alt+A';
        StorageManager.save();
        showToast('✅ Đã đặt lại phím tắt khởi động về Alt+A');
      });
    }

    if (chkAutoOpen) {
      chkAutoOpen.addEventListener('change', () => {
        state.settings.autoOpenOnPageLoad = chkAutoOpen.checked;
        StorageManager.save();
        if (state.settings.autoOpenOnPageLoad) {
          showToast('✅ Đã BẬT: Auto Clicker sẽ tự động hiển thị khi vào web');
        } else {
          showToast(`✅ Đã TẮT: Web sẽ tải bình thường, bấm ${state.settings.toggleHotkey} để mở Auto Clicker`);
        }
      });
    }

    if (inputRecord) {
      attachHotkeyCapture(inputRecord, (key) => {
        state.settings.recordHotkey = key;
        StorageManager.save();
        updateUIStatus();
        showToast(`✅ Phím tắt ghi điểm đã đổi thành: ${key}`);
      });
    }

    if (btnResetRecord && inputRecord) {
      btnResetRecord.addEventListener('click', () => {
        state.settings.recordHotkey = 'F2';
        inputRecord.value = 'F2';
        StorageManager.save();
        updateUIStatus();
        showToast('✅ Đã đặt lại phím ghi điểm về F2');
      });
    }

    if (inputRun) {
      attachHotkeyCapture(inputRun, (key) => {
        state.settings.runHotkey = key;
        StorageManager.save();
        updateUIStatus();
        showToast(`✅ Phím tắt chạy/dừng đã đổi thành: ${key}`);
      });
    }

    if (btnResetRun && inputRun) {
      btnResetRun.addEventListener('click', () => {
        state.settings.runHotkey = 'F4';
        inputRun.value = 'F4';
        StorageManager.save();
        updateUIStatus();
        showToast('✅ Đã đặt lại phím chạy/dừng về F4');
      });
    }

    if (inputTouch) {
      inputTouch.addEventListener('change', () => {
        const val = parseInt(inputTouch.value, 10);
        state.settings.touchHoldDuration = isNaN(val) ? 70 : Math.max(20, Math.min(1000, val));
        inputTouch.value = state.settings.touchHoldDuration;
        StorageManager.save();
      });
    }

    if (btnSave) {
      btnSave.addEventListener('click', () => {
        if (inputTouch) {
          const val = parseInt(inputTouch.value, 10);
          state.settings.touchHoldDuration = isNaN(val) ? 70 : Math.max(20, Math.min(1000, val));
        }
        StorageManager.save();
        updateUIStatus();
        showToast('💾 Đã lưu toàn bộ cài đặt thành công!');
      });
    }

    if (btnResetAll) {
      btnResetAll.addEventListener('click', () => {
        state.settings = { ...DEFAULT_SETTINGS };
        StorageManager.save();
        updateUIStatus();
        renderSettingsPanel();
        showToast('🔄 Đã khôi phục toàn bộ cài đặt về mặc định ban đầu!');
      });
    }
  }

  function renderStatsList() {
    if (!shadowRoot) return;
    const totalRunsEl = shadowRoot.getElementById('stats-total-run-count');
    const totalScriptsEl = shadowRoot.getElementById('stats-total-scripts-count');
    const listItemsEl = shadowRoot.getElementById('stats-list-items');

    const totalRuns = getTotalRunCount();
    if (totalRunsEl) totalRunsEl.textContent = totalRuns;
    if (totalScriptsEl) totalScriptsEl.textContent = state.scripts.length;

    if (!listItemsEl) return;
    listItemsEl.innerHTML = '';

    if (state.scripts.length === 0) {
      listItemsEl.innerHTML = '<div style="text-align:center; padding: 20px; color:#64748b; font-size:11px;">Chưa có kịch bản nào.</div>';
      return;
    }

    // Sắp xếp các kịch bản theo thứ tự lượt chạy nhiều nhất lên đầu
    const sorted = [...state.scripts].sort((a, b) => (b.runCount || 0) - (a.runCount || 0));

    sorted.forEach((script, idx) => {
      const card = document.createElement('div');
      card.className = 'mac-stat-card';

      let lastRunStr = 'Chưa chạy';
      if (script.lastRunAt) {
        const d = new Date(script.lastRunAt);
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        const s = String(d.getSeconds()).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        lastRunStr = `Lần cuối: ${h}:${m}:${s} (${day}/${month})`;
      }

      const isRunning = state.runningScriptId === script.id;
      const prioName = script.priority === 1 ? '⭐ Cao' : (script.priority === 2 ? '🔷 TB' : '⚪ Thấp');

      card.innerHTML = `
        <div class="mac-stat-card-left">
          <div class="mac-stat-rank">${idx + 1}</div>
          <div class="mac-stat-info">
            <div class="mac-stat-title-line">
              <span class="mac-stat-name" title="${escapeHtml(script.name)}">${escapeHtml(script.name)}</span>
              ${script.enabled ? '<span class="mac-badge-on">BẬT</span>' : '<span class="mac-badge-off">TẮT</span>'}
              ${isRunning ? '<span style="color:#4ade80; font-size:10px; font-weight:700;">⚡ Đang chạy</span>' : ''}
            </div>
            <div class="mac-stat-sub-line">
              <span>${script.points.length} điểm</span>
              <span>•</span>
              <span>${prioName}</span>
              <span>•</span>
              <span style="color:#94a3b8;">${lastRunStr}</span>
            </div>
          </div>
        </div>

        <div class="mac-stat-card-right">
          <div class="mac-stat-counter-box" title="Tổng số lần kịch bản này đã hoàn thành">
            <span class="mac-stat-number">${script.runCount || 0}</span>
            <span class="mac-stat-unit">lượt</span>
          </div>
          <button class="mac-btn-stat-action btn-reset-single-counter" data-id="${script.id}" title="Đặt lại bộ đếm của kịch bản này về 0">
            🔄 Reset
          </button>
        </div>
      `;

      const resetBtn = card.querySelector('.btn-reset-single-counter');
      if (resetBtn) {
        resetBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          script.runCount = 0;
          script.lastRunAt = null;
          StorageManager.save();
          updateStatsBadges();
          renderStatsList();
          renderScriptsList();
          showToast(`🔄 Đã đặt lại bộ đếm của "${script.name}" về 0!`);
        });
      }

      listItemsEl.appendChild(card);
    });
  }

  // ============================================================================
  // 6. UI CREATION (Only in top frame)
  // ============================================================================
  function initUI() {
    if (!isTopWindow) return; // Only top window renders floating dock

    hostElement = document.createElement('div');
    hostElement.id = 'mac-v21-root';
    document.documentElement.appendChild(hostElement);

    shadowRoot = hostElement.attachShadow({ mode: 'open' });

    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = chrome.runtime.getURL('content/content.css');
    shadowRoot.appendChild(styleLink);

    markersContainer = document.createElement('div');
    markersContainer.id = 'mac-markers-overlay';
    shadowRoot.appendChild(markersContainer);

    const widget = document.createElement('div');
    widget.className = 'mac-widget';
    widget.id = 'mac-floating-widget';
    widget.innerHTML = `
      <div class="mac-header" id="mac-header">
        <div class="mac-title-group">
          <div class="mac-logo-badge">⚡</div>
          <span class="mac-title">Auto Click Đa Kịch Bản</span>
          <span class="mac-status-pill status-idle" id="mac-status-badge">Sẵn Sàng</span>
        </div>
        <div class="mac-header-actions">
          <button class="mac-icon-btn" id="mac-btn-toggle-settings" title="Cài đặt phím tắt khởi động & hệ thống">⚙️</button>
          <button class="mac-icon-btn" id="mac-btn-toggle-stats" title="Xem Bộ đếm số lượt đã chạy">📊</button>
          <button class="mac-icon-btn" id="mac-btn-toggle-markers-header" title="Ẩn / Hiện các điểm ghim trên màn hình">👁️</button>
          <button class="mac-icon-btn" id="mac-btn-min" title="Thu nhỏ / Mở rộng">_</button>
          <button class="mac-icon-btn" id="mac-btn-hide" title="Ẩn thanh công cụ">×</button>
        </div>
      </div>

      <!-- Live Queue Banner -->
      <div class="mac-queue-banner" id="mac-queue-banner">
        <div class="mac-queue-left">
          <span>🛡️</span>
          <span class="mac-queue-text" id="mac-queue-status-text">Điều phối ưu tiên: Sẵn sàng</span>
        </div>
        <span class="mac-queue-count-badge" id="mac-queue-badge">0 chờ</span>
      </div>

      <!-- Navigation Tabs: Kịch Bản vs Thống Kê / Bộ Đếm vs Cài Đặt -->
      <div class="mac-nav-tabs" id="mac-nav-tabs">
        <button class="mac-nav-tab is-active" id="tab-btn-scripts" title="Quản lý và thiết lập danh sách kịch bản">
          <span>📑 Kịch Bản</span>
          <span class="mac-badge-count" id="badge-scripts-count">${state.scripts.length}</span>
        </button>
        <button class="mac-nav-tab" id="tab-btn-stats" title="Xem thống kê số lượt đã chạy của từng kịch bản">
          <span>📊 Bộ Đếm</span>
          <span class="mac-badge-count mac-badge-runs" id="badge-total-runs">${getTotalRunCount()} lượt</span>
        </button>
        <button class="mac-nav-tab" id="tab-btn-settings" title="Cài đặt phím tắt khởi động và tùy chọn chung">
          <span>⚙️ Cài Đặt</span>
        </button>
      </div>

      <!-- TAB 1: KỊCH BẢN -->
      <div class="mac-tab-content" id="tab-content-scripts">
        <!-- Quick Action Buttons -->
        <div class="mac-quick-actions">
          <button class="mac-btn mac-btn-record" id="mac-btn-record">
            <span>🔴</span>
            <span id="mac-record-text">Ghi Điểm (${state.settings.recordHotkey})</span>
          </button>
          <button class="mac-btn mac-btn-run" id="mac-btn-run">
            <span>▶️</span>
            <span id="mac-run-text">Chạy Tất Cả (${state.settings.runHotkey})</span>
          </button>
        </div>

        <!-- Body: Direct Card-based Script Manager -->
        <div class="mac-body">
          <div class="mac-top-bar">
            <button class="mac-btn-add-main" id="btn-add-new-script">
              ➕ Thêm Kịch Bản Mới
            </button>
            <button class="mac-btn-toggle-markers" id="btn-toggle-markers" title="Ẩn hoặc Hiện tất cả các điểm ghim trên màn hình">
              <span id="mac-marker-icon">👁️</span>
              <span id="mac-marker-text">Ẩn Ghim</span>
            </button>
          </div>

          <div id="mac-scripts-container">
            <!-- Rendered Script Cards -->
          </div>
        </div>
      </div>

      <!-- TAB 2: THỐNG KÊ & BỘ ĐẾM SỐ LƯỢT CHẠY -->
      <div class="mac-tab-content" id="tab-content-stats" style="display:none;">
        <div class="mac-stats-container">
          <!-- Summary Header -->
          <div class="mac-stats-header-summary">
            <div class="mac-stat-summary-box">
              <span class="mac-stat-summary-val" id="stats-total-run-count">0</span>
              <span class="mac-stat-summary-label">Tổng lượt click hoàn tất</span>
            </div>
            <div class="mac-stat-summary-box">
              <span class="mac-stat-summary-val" id="stats-total-scripts-count">0</span>
              <span class="mac-stat-summary-label">Kịch bản đã thiết lập</span>
            </div>
            <button class="mac-btn-reset-all" id="btn-reset-all-counters" title="Đặt lại bộ đếm của tất cả kịch bản về 0">
              🔄 Đặt lại tất cả về 0
            </button>
          </div>

          <!-- Scripts Stats List -->
          <div class="mac-stats-list-box">
            <div class="mac-stats-list-title">
              <span>📋 Chi tiết từng kịch bản:</span>
              <span style="font-size:10px; color:#94a3b8; font-weight:normal;">(Tự động lưu trữ vĩnh viễn)</span>
            </div>
            <div class="mac-stats-list-items" id="stats-list-items">
              <!-- Rendered Stat Cards -->
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: CÀI ĐẶT PHÍM TẮT & HỆ THỐNG -->
      <div class="mac-tab-content" id="tab-content-settings" style="display:none;">
        <div class="mac-settings-container" id="mac-settings-container">
          <!-- Rendered in renderSettingsPanel() -->
        </div>
      </div>

      <div class="mac-footer">
        <div id="mac-footer-info">
          📍 ${state.scripts.length} kịch bản • Android/Cloud Phone: Tối ưu
        </div>
        <div style="display:flex; gap: 8px;">
          <button class="mac-btn-sm" id="btn-export-backup" title="Sao lưu JSON">📤 Sao lưu</button>
          <button class="mac-btn-sm" id="btn-import-backup" title="Khôi phục JSON">📥 Nạp lại</button>
          <input type="file" id="input-import-file" accept=".json" style="display:none;">
        </div>
      </div>
    `;

    shadowRoot.appendChild(widget);

    setupDraggableWidget(widget);
    bindUIEvents();
    renderScriptsList();

    if (state.settings.autoOpenOnPageLoad && state.settings.showMarkers) {
      updateDisplayedMarkers();
    }

    // Check autoOpenOnPageLoad: if false, keep widget & markers hidden initially!
    if (!state.settings.autoOpenOnPageLoad) {
      widget.style.display = 'none';
      if (markersContainer) markersContainer.style.display = 'none';
    }
  }

  // ============================================================================
  // 7. DRAGGABLE WIDGET
  // ============================================================================
  function setupDraggableWidget(widget) {
    const header = shadowRoot.getElementById('mac-header');
    let isDragging = false;
    let startX = 0, startY = 0;
    let initLeft = 0, initTop = 0;

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = widget.getBoundingClientRect();
      initLeft = rect.left;
      initTop = rect.top;

      widget.style.right = 'auto';
      widget.style.bottom = 'auto';
      widget.style.left = initLeft + 'px';
      widget.style.top = initTop + 'px';

      function onMouseMove(moveEvent) {
        if (!isDragging) return;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        const newLeft = Math.max(10, Math.min(window.innerWidth - widget.offsetWidth - 10, initLeft + dx));
        const newTop = Math.max(10, Math.min(window.innerHeight - widget.offsetHeight - 10, initTop + dy));
        widget.style.left = newLeft + 'px';
        widget.style.top = newTop + 'px';
      }

      function onMouseUp() {
        isDragging = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  // ============================================================================
  // 8. UI BINDINGS & SCRIPT CARDS
  // ============================================================================
  function bindUIEvents() {
    const btnRecord = shadowRoot.getElementById('mac-btn-record');
    const btnRun = shadowRoot.getElementById('mac-btn-run');
    const btnMin = shadowRoot.getElementById('mac-btn-min');
    const btnHide = shadowRoot.getElementById('mac-btn-hide');
    const btnAddScript = shadowRoot.getElementById('btn-add-new-script');
    const widget = shadowRoot.getElementById('mac-floating-widget');

    btnRecord.addEventListener('click', toggleRecording);

    btnRun.addEventListener('click', () => {
      if (state.isSchedulerRunning) {
        PriorityScheduler.stop();
      } else {
        PriorityScheduler.start();
      }
    });

    btnMin.addEventListener('click', () => {
      state.isMinimized = !state.isMinimized;
      widget.classList.toggle('is-minimized', state.isMinimized);
      btnMin.textContent = state.isMinimized ? '+' : '_';
    });

    btnHide.addEventListener('click', () => {
      widget.style.display = 'none';
      if (markersContainer) markersContainer.style.display = 'none';
      showToast(`Đã ẩn Auto Clicker. Bấm ${state.settings.toggleHotkey} hoặc icon để mở lại!`);
    });

    // Navigation Tabs & Header Actions Events
    const tabBtnScripts = shadowRoot.getElementById('tab-btn-scripts');
    const tabBtnStats = shadowRoot.getElementById('tab-btn-stats');
    const tabBtnSettings = shadowRoot.getElementById('tab-btn-settings');
    const btnToggleStatsHeader = shadowRoot.getElementById('mac-btn-toggle-stats');
    const btnToggleSettingsHeader = shadowRoot.getElementById('mac-btn-toggle-settings');
    const btnResetAll = shadowRoot.getElementById('btn-reset-all-counters');

    if (tabBtnScripts) {
      tabBtnScripts.addEventListener('click', () => switchTab('scripts'));
    }
    if (tabBtnStats) {
      tabBtnStats.addEventListener('click', () => switchTab('stats'));
    }
    if (tabBtnSettings) {
      tabBtnSettings.addEventListener('click', () => switchTab('settings'));
    }
    if (btnToggleStatsHeader) {
      btnToggleStatsHeader.addEventListener('click', () => {
        if (state.currentTab === 'stats') {
          switchTab('scripts');
        } else {
          switchTab('stats');
        }
      });
    }
    if (btnToggleSettingsHeader) {
      btnToggleSettingsHeader.addEventListener('click', () => {
        if (state.currentTab === 'settings') {
          switchTab('scripts');
        } else {
          switchTab('settings');
        }
      });
    }
    if (btnResetAll) {
      btnResetAll.addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn đặt lại bộ đếm số lượt của TẤT CẢ kịch bản về 0 không?')) {
          state.scripts.forEach(s => {
            s.runCount = 0;
            s.lastRunAt = null;
          });
          StorageManager.save();
          updateStatsBadges();
          renderStatsList();
          renderScriptsList();
          showToast('🔄 Đã đặt lại bộ đếm của tất cả kịch bản về 0!');
        }
      });
    }

    // Toggle Markers visibility
    function toggleMarkers() {
      state.settings.showMarkers = !(state.settings.showMarkers !== false);
      if (state.settings.showMarkers) {
        if (!state.displayedScriptId && state.scripts.length > 0) {
          state.displayedScriptId = state.activeScriptId || state.scripts[0].id;
        }
      }
      updateMarkersVisibilityUI();
      updateDisplayedMarkers();
      StorageManager.save();
      renderScriptsList();
      showToast(state.settings.showMarkers && state.displayedScriptId ? '👁️ Đã hiện lại các điểm ghim trên màn hình!' : '🕶️ Đã ẩn tất cả các điểm ghim trên màn hình!');
    }

    const btnToggleMarkers = shadowRoot.getElementById('btn-toggle-markers');
    const btnToggleHeader = shadowRoot.getElementById('mac-btn-toggle-markers-header');
    if (btnToggleMarkers) btnToggleMarkers.addEventListener('click', toggleMarkers);
    if (btnToggleHeader) btnToggleHeader.addEventListener('click', toggleMarkers);

    updateMarkersVisibilityUI();

    // Add New Script
    btnAddScript.addEventListener('click', () => {
      const count = state.scripts.length + 1;
      const newScript = {
        id: 'script_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: `Kịch bản ${count}`,
        enabled: true,
        priority: PRIORITY.NORMAL,
        intervalValue: 10,
        intervalUnit: 's', // 's', 'm', 'h'
        clickDelay: 500,
        points: [],
        nextRunAt: 0,
        status: 'idle',
        isPointsExpanded: true,
        runCount: 0,
        lastRunAt: null,
        timingMode: 'after_finish'
      };
      state.scripts.push(newScript);
      state.activeScriptId = newScript.id;
      state.displayedScriptId = newScript.id;
      state.settings.showMarkers = true;
      StorageManager.save();
      updateStatsBadges();
      renderScriptsList();
      updateDisplayedMarkers();
      showToast(`Đã thêm "${newScript.name}". Bấm "Ghi điểm (F2)" để thêm điểm!`);
    });

    // Export / Import
    const btnExport = shadowRoot.getElementById('btn-export-backup');
    const btnImport = shadowRoot.getElementById('btn-import-backup');
    const inputFile = shadowRoot.getElementById('input-import-file');

    btnExport.addEventListener('click', () => {
      const data = {
        app: 'AutoClickDaDiem_V21',
        exportedAt: new Date().toISOString(),
        scripts: state.scripts,
        settings: state.settings
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `autoclick-scripts-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Đã xuất file sao lưu kịch bản JSON!');
    });

    btnImport.addEventListener('click', () => inputFile.click());
    inputFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const imported = JSON.parse(evt.target.result);
          if (Array.isArray(imported.scripts) && imported.scripts.length > 0) {
            state.scripts = imported.scripts;
            state.scripts.forEach(s => {
              s.runCount = s.runCount || 0;
              s.lastRunAt = s.lastRunAt || null;
              s.timingMode = s.timingMode || 'after_finish';
            });
            state.activeScriptId = state.scripts[0].id;
            state.displayedScriptId = state.scripts[0].id;
          }
          StorageManager.save();
          updateStatsBadges();
          renderScriptsList();
          updateDisplayedMarkers();
          updateUIStatus();
          showToast('Đã nạp toàn bộ kịch bản từ file JSON!');
        } catch (err) {
          alert('File JSON không hợp lệ!');
        }
      };
      reader.readAsText(file);
      inputFile.value = '';
    });
  }

  // ============================================================================
  // 9. RENDERING SCRIPT CARDS (With in-place point editing)
  // ============================================================================
  function renderScriptsList() {
    const container = shadowRoot ? shadowRoot.getElementById('mac-scripts-container') : null;
    if (!container) return;

    container.innerHTML = '';

    state.scripts.forEach((script) => {
      const isTarget = state.activeScriptId === script.id;
      const isRunningNow = state.runningScriptId === script.id;
      const isQueued = state.executionQueue.includes(script.id);
      const isCurrentlyDisplayed = state.displayedScriptId === script.id && state.settings.showMarkers !== false;

      const card = document.createElement('div');
      card.className = `mac-script-card ${isTarget ? 'is-active-target' : ''} ${isRunningNow ? 'is-currently-running' : ''} ${isQueued ? 'is-in-queue' : ''} ${isCurrentlyDisplayed ? 'is-displaying-markers' : ''} ${script.isCollapsed ? 'is-collapsed' : ''}`;
      card.id = `card-${script.id}`;

      let prioClass = 'prio-normal';
      if (script.priority === PRIORITY.HIGH) prioClass = 'prio-high';
      if (script.priority === PRIORITY.LOW) prioClass = 'prio-low';

      // Build other scripts options for chaining workflow
      const otherScriptOptions = state.scripts
        .filter(s => s.id !== script.id)
        .map(s => `<option value="${s.id}" ${script.nextScriptId === s.id ? 'selected' : ''}>➔ ${escapeHtml(s.name)}</option>`)
        .join('');

      let targetChainName = 'Tự lặp lại';
      if (script.nextScriptId === 'stop') targetChainName = 'Dừng';
      else if (script.nextScriptId && script.nextScriptId !== 'self') {
        const nS = state.scripts.find(s => s.id === script.nextScriptId);
        if (nS) targetChainName = `➔ ${nS.name}`;
      }
      const unitLabel = script.intervalUnit === 'h' ? 'giờ' : (script.intervalUnit === 'm' ? 'phút' : 's');
      const timingShort = (script.timingMode === 'from_start') ? 'tính từ đầu' : 'sau khi xong';
      const summaryText = `${script.points.length} điểm • Đã chạy ${script.runCount || 0} lượt • Chờ ${script.intervalValue || 10}${unitLabel} (${timingShort}) (${targetChainName})`;

      // Kiểm tra xem kịch bản này có đang liên kết với kịch bản khác hay không
      const isChainedToOther = script.nextScriptId && script.nextScriptId !== 'self' && script.nextScriptId !== 'stop';
      const targetScript = isChainedToOther ? state.scripts.find(s => s.id === script.nextScriptId) : null;

      let intervalSectionHtml = '';
      if (targetScript) {
        const unitA = script.intervalUnit === 'h' ? 'giờ' : (script.intervalUnit === 'm' ? 'phút' : 'giây');
        const unitB = targetScript.intervalUnit === 'h' ? 'giờ' : (targetScript.intervalUnit === 'm' ? 'phút' : 'giây');
        const noteA = script.timingMode === 'from_start' ? 'tính từ lúc bắt đầu' : 'sau khi kết thúc';
        const noteB = targetScript.timingMode === 'from_start' ? 'tính từ lúc bắt đầu' : 'sau khi kết thúc';

        intervalSectionHtml = `
          <!-- Khung Cài Đặt Chuỗi Lặp Tuần Hoàn 2 Chiều -->
          <div class="mac-chain-loop-box">
            <div class="mac-chain-header">
              <span style="font-weight: 700; color: #a5b4fc;">🔗 Chuỗi lặp tuần hoàn 2 chiều giữa [${escapeHtml(script.name)}] & [${escapeHtml(targetScript.name)}]:</span>
            </div>

            <!-- Chiều 1: A -> B -->
            <div class="mac-chain-delay-row">
              <span class="mac-chain-tag tag-a-to-b">1️⃣ [${escapeHtml(script.name)}] ➔ [${escapeHtml(targetScript.name)}]</span>
              <span class="mac-chain-desc">Chờ:</span>
              <input type="number" class="mac-num-input chain-delay-a" min="1" max="9999" value="${script.intervalValue || 10}">
              <select class="mac-unit-select chain-unit-a">
                <option value="s" ${(script.intervalUnit || 's') === 's' ? 'selected' : ''}>Giây</option>
                <option value="m" ${script.intervalUnit === 'm' ? 'selected' : ''}>Phút</option>
                <option value="h" ${script.intervalUnit === 'h' ? 'selected' : ''}>Giờ</option>
              </select>
              <span class="mac-chain-desc">Tính giờ:</span>
              <select class="mac-timing-select chain-timing-a" title="Thời điểm bắt đầu tính giờ chờ cho [${escapeHtml(targetScript.name)}]">
                <option value="after_finish" ${(!script.timingMode || script.timingMode === 'after_finish') ? 'selected' : ''}>⏱️ Sau khi kết thúc</option>
                <option value="from_start" ${script.timingMode === 'from_start' ? 'selected' : ''}>⚡ Ngay khi bắt đầu</option>
              </select>
              <span class="mac-chain-desc">➔ rồi chạy [${escapeHtml(targetScript.name)}]</span>
            </div>

            <!-- Chiều 2: B -> A -->
            <div class="mac-chain-delay-row">
              <span class="mac-chain-tag tag-b-to-a">2️⃣ [${escapeHtml(targetScript.name)}] ➔ [${escapeHtml(script.name)}]</span>
              <span class="mac-chain-desc">Chờ:</span>
              <input type="number" class="mac-num-input chain-delay-b" min="1" max="9999" value="${targetScript.intervalValue || 5}">
              <select class="mac-unit-select chain-unit-b">
                <option value="s" ${(targetScript.intervalUnit || 's') === 's' ? 'selected' : ''}>Giây</option>
                <option value="m" ${targetScript.intervalUnit === 'm' ? 'selected' : ''}>Phút</option>
                <option value="h" ${targetScript.intervalUnit === 'h' ? 'selected' : ''}>Giờ</option>
              </select>
              <span class="mac-chain-desc">Tính giờ:</span>
              <select class="mac-timing-select chain-timing-b" title="Thời điểm bắt đầu tính giờ chờ cho [${escapeHtml(script.name)}]">
                <option value="after_finish" ${(!targetScript.timingMode || targetScript.timingMode === 'after_finish') ? 'selected' : ''}>⏱️ Sau khi kết thúc</option>
                <option value="from_start" ${targetScript.timingMode === 'from_start' ? 'selected' : ''}>⚡ Ngay khi bắt đầu</option>
              </select>
              <span class="mac-chain-desc">➔ rồi lặp lại [${escapeHtml(script.name)}]</span>
            </div>

            <!-- Dòng xem trước chu trình -->
            <div class="mac-chain-flow-preview" id="flow-preview-${script.id}">
              <span>⚡ <b>Chu trình:</b> [${escapeHtml(script.name)}] ➔ chờ <b>${script.intervalValue || 10} ${unitA}</b> <span style="color:#94a3b8; font-size:10px;">(${noteA})</span> ➔ [${escapeHtml(targetScript.name)}] ➔ chờ <b>${targetScript.intervalValue || 5} ${unitB}</b> <span style="color:#94a3b8; font-size:10px;">(${noteB})</span> ➔ lặp lại [${escapeHtml(script.name)}]...</span>
            </div>
          </div>
        `;
      } else if (script.nextScriptId === 'stop') {
        intervalSectionHtml = `
          <div style="font-size: 11px; color: #94a3b8; padding: 4px 2px;">
            <span>⏹️ Kịch bản này chỉ chạy 1 lần rồi dừng lại (không tự động lặp lại).</span>
          </div>
        `;
      } else {
        intervalSectionHtml = `
          <div class="mac-self-loop-row" style="display:flex; align-items:center; gap: 6px; font-size: 11px; color: #cbd5e1; flex-wrap: wrap;">
            <span>⏱️ Chờ:</span>
            <input type="number" class="mac-num-input interval-val" min="1" max="9999" value="${script.intervalValue || 10}">
            <select class="mac-unit-select interval-unit">
              <option value="s" ${(script.intervalUnit || 's') === 's' ? 'selected' : ''}>Giây</option>
              <option value="m" ${script.intervalUnit === 'm' ? 'selected' : ''}>Phút</option>
              <option value="h" ${script.intervalUnit === 'h' ? 'selected' : ''}>Giờ</option>
            </select>
            <span>Tính giờ:</span>
            <select class="mac-timing-select timing-mode-self" title="Chọn thời điểm bắt đầu đếm thời gian lặp lại">
              <option value="after_finish" ${(!script.timingMode || script.timingMode === 'after_finish') ? 'selected' : ''}>⏱️ Sau khi kết thúc</option>
              <option value="from_start" ${script.timingMode === 'from_start' ? 'selected' : ''}>⚡ Ngay khi bắt đầu</option>
            </select>
            <span style="color: #94a3b8;">rồi tự động lặp lại chính nó</span>
          </div>
        `;
      }

      card.innerHTML = `
        <!-- Card Top Bar: Switch, Name, Priority, Delete -->
        <div class="mac-card-header">
          <div class="mac-card-title-box">
            <button class="mac-collapse-btn" title="Thu gọn / Mở rộng kịch bản này">▼</button>
            <label class="mac-switch" title="Bật/Tắt kịch bản này">
              <input type="checkbox" class="script-toggle" ${script.enabled ? 'checked' : ''}>
              <span class="mac-slider"></span>
            </label>
            <input type="text" class="mac-script-name-input" value="${escapeHtml(script.name)}" title="Bấm để sửa tên kịch bản">
            <span class="mac-card-run-badge" id="card-run-badge-${script.id}" title="Số lượt kịch bản này đã chạy hoàn thành">🎯 ${script.runCount || 0} lượt</span>
            <span class="mac-collapsed-summary" title="${escapeHtml(summaryText)}">(${summaryText})</span>
          </div>

          <div style="display:flex; align-items:center; gap: 6px;">
            <button class="mac-btn-toggle-points btn-toggle-points ${isCurrentlyDisplayed ? 'is-displaying' : ''}" title="${isCurrentlyDisplayed ? 'Bấm để ẩn các điểm click của kịch bản này' : 'Bấm để chỉ hiển thị các điểm click của kịch bản này trên màn hình'}">
              ${isCurrentlyDisplayed ? '🕶️ Ẩn điểm' : '👁️ Hiện điểm'}
            </button>
            <button class="mac-btn-run-single btn-run-single" title="Bấm để chạy riêng kịch bản này ngay lập tức">▶️ Chạy riêng</button>
            <select class="mac-priority-select ${prioClass}" title="Độ ưu tiên khi trùng giờ">
              <option value="1" ${script.priority === 1 ? 'selected' : ''}>⭐ Ưu tiên Cao</option>
              <option value="2" ${script.priority === 2 ? 'selected' : ''}>🔷 Ưu tiên TB</option>
              <option value="3" ${script.priority === 3 ? 'selected' : ''}>⚪ Ưu tiên Thấp</option>
            </select>
            <button class="mac-icon-btn btn-del-script" title="Xóa kịch bản này" style="color:#f87171;">🗑️</button>
          </div>
        </div>

        <!-- Loop Mode & Interval Section -->
        <div class="mac-interval-row">
          <div style="display:flex; flex-direction:column; gap: 6px; width: 100%;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap: 6px;">
              <div style="display:flex; align-items:center; gap: 6px; font-size: 11px; color: #e2e8f0;">
                <span style="font-weight:600;">🔄 Chế độ lặp:</span>
                <select class="mac-chain-select next-script-select" title="Chọn tự lặp lại hoặc chuyển tiếp sang kịch bản khác">
                  <option value="self" ${(!script.nextScriptId || script.nextScriptId === 'self') ? 'selected' : ''}>🔁 Tự lặp lại chính nó</option>
                  ${otherScriptOptions}
                  <option value="stop" ${script.nextScriptId === 'stop' ? 'selected' : ''}>⏹️ Dừng lại (Không lặp)</option>
                </select>
              </div>
              <div class="mac-card-status" id="status-card-${script.id}">
                ${getScriptStatusHtml(script)}
              </div>
            </div>

            ${intervalSectionHtml}
          </div>
        </div>

        <!-- Points Management Box inside Card -->
        <div class="mac-points-section">
          <div class="mac-points-bar">
            <span>📍 Điểm click (${script.points.length}):</span>
            <div class="mac-points-actions">
              <button class="mac-btn-sm btn-toggle-points-sub ${isCurrentlyDisplayed ? 'is-displaying' : ''}" title="${isCurrentlyDisplayed ? 'Ẩn các điểm click trên màn hình' : 'Chỉ hiển thị các điểm của kịch bản này trên màn hình'}">
                ${isCurrentlyDisplayed ? '🕶️ Đang hiện' : '👁️ Hiện điểm'}
              </button>
              <button class="mac-btn-sm mac-btn-run-sm btn-run-single-sub" title="Chạy riêng kịch bản này ngay">
                ▶️ Chạy ngay
              </button>
              <button class="mac-btn-sm mac-btn-record-sm btn-record-this" title="Bấm để click thêm điểm trên trang">
                🔴 Ghi điểm (F2)
              </button>
              <button class="mac-btn-sm btn-add-manual" title="Nhập tọa độ thủ công">
                ➕ Thêm điểm
              </button>
            </div>
          </div>

          <div class="mac-points-list" id="points-list-${script.id}">
            <!-- Rendered points for this script -->
          </div>
        </div>
      `;

      // 0. Toggle Collapse
      const collapseBtn = card.querySelector('.mac-collapse-btn');
      collapseBtn.addEventListener('click', () => {
        script.isCollapsed = !script.isCollapsed;
        card.classList.toggle('is-collapsed', script.isCollapsed);
        StorageManager.save();
      });

      // 0.1. Toggle Display Markers for this specific script
      const btnTogglePoints = card.querySelector('.btn-toggle-points');
      if (btnTogglePoints) {
        btnTogglePoints.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleDisplayScriptPoints(script.id);
        });
      }

      const btnTogglePointsSub = card.querySelector('.btn-toggle-points-sub');
      if (btnTogglePointsSub) {
        btnTogglePointsSub.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleDisplayScriptPoints(script.id);
        });
      }

      // 1. Toggle Enabled
      card.querySelector('.script-toggle').addEventListener('change', (e) => {
        script.enabled = e.target.checked;
        StorageManager.save();
        renderScriptsList();
      });

      // 2. Edit Script Name
      const nameInput = card.querySelector('.mac-script-name-input');
      nameInput.addEventListener('change', (e) => {
        script.name = e.target.value.trim() || 'Kịch bản';
        StorageManager.save();
        renderScriptsList();
      });

      // 3. Change Priority
      const prioSelect = card.querySelector('.mac-priority-select');
      prioSelect.addEventListener('change', (e) => {
        script.priority = parseInt(e.target.value);
        StorageManager.save();
        renderScriptsList();
        if (state.displayedScriptId === script.id) {
          updateDisplayedMarkers();
        }
      });

      // 4. Thay đổi chế độ lặp / chuỗi kịch bản
      const chainSelect = card.querySelector('.next-script-select');
      if (chainSelect) {
        chainSelect.addEventListener('change', (e) => {
          const newTargetId = e.target.value;
          script.nextScriptId = newTargetId;

          if (newTargetId && newTargetId !== 'self' && newTargetId !== 'stop') {
            const newTarget = state.scripts.find(s => s.id === newTargetId);
            if (newTarget) {
              // Tự động liên kết 2 chiều tuần hoàn giữa A và B
              newTarget.nextScriptId = script.id;
              newTarget.enabled = true;
              script.enabled = true;
              showToast(`🔗 Đã liên kết chuỗi tuần hoàn giữa "${script.name}" và "${newTarget.name}"!`);
            }
          }
          StorageManager.save();
          renderScriptsList();
        });
      }

      // 4.1. Sự kiện chỉnh Delay cho Chuỗi Tuần Hoàn (A -> B và B -> A)
      const inputDelayA = card.querySelector('.chain-delay-a');
      const selectUnitA = card.querySelector('.chain-unit-a');
      const inputDelayB = card.querySelector('.chain-delay-b');
      const selectUnitB = card.querySelector('.chain-unit-b');

      if (inputDelayA) {
        inputDelayA.addEventListener('change', (e) => {
          script.intervalValue = Math.max(1, parseInt(e.target.value) || 1);
          StorageManager.save();
          renderScriptsList();
        });
      }
      if (selectUnitA) {
        selectUnitA.addEventListener('change', (e) => {
          script.intervalUnit = e.target.value;
          StorageManager.save();
          renderScriptsList();
        });
      }
      const selectTimingA = card.querySelector('.chain-timing-a');
      if (selectTimingA) {
        selectTimingA.addEventListener('change', (e) => {
          script.timingMode = e.target.value;
          StorageManager.save();
          renderScriptsList();
        });
      }
      if (inputDelayB && targetScript) {
        inputDelayB.addEventListener('change', (e) => {
          targetScript.intervalValue = Math.max(1, parseInt(e.target.value) || 1);
          targetScript.nextScriptId = script.id;
          targetScript.enabled = true;
          StorageManager.save();
          renderScriptsList();
        });
      }
      if (selectUnitB && targetScript) {
        selectUnitB.addEventListener('change', (e) => {
          targetScript.intervalUnit = e.target.value;
          targetScript.nextScriptId = script.id;
          targetScript.enabled = true;
          StorageManager.save();
          renderScriptsList();
        });
      }
      const selectTimingB = card.querySelector('.chain-timing-b');
      if (selectTimingB && targetScript) {
        selectTimingB.addEventListener('change', (e) => {
          targetScript.timingMode = e.target.value;
          StorageManager.save();
          renderScriptsList();
        });
      }

      // 4.2. Sự kiện khi ở chế độ Tự lặp lại chính nó
      const inputVal = card.querySelector('.interval-val');
      const selectUnit = card.querySelector('.interval-unit');
      const selectTimingSelf = card.querySelector('.timing-mode-self');

      if (inputVal) {
        inputVal.addEventListener('change', (e) => {
          script.intervalValue = Math.max(1, parseInt(e.target.value) || 1);
          StorageManager.save();
        });
      }

      if (selectUnit) {
        selectUnit.addEventListener('change', (e) => {
          script.intervalUnit = e.target.value;
          StorageManager.save();
        });
      }

      if (selectTimingSelf) {
        selectTimingSelf.addEventListener('change', (e) => {
          script.timingMode = e.target.value;
          StorageManager.save();
          renderScriptsList();
        });
      }

      // 5. Delete Script
      card.querySelector('.btn-del-script').addEventListener('click', () => {
        if (state.scripts.length <= 1) {
          alert('Bạn phải giữ lại ít nhất 1 kịch bản!');
          return;
        }
        if (confirm(`Bạn có chắc muốn xóa "${script.name}"?`)) {
          state.scripts = state.scripts.filter(s => s.id !== script.id);
          if (state.displayedScriptId === script.id) {
            state.displayedScriptId = state.scripts.length > 0 ? state.scripts[0].id : null;
          }
          if (state.activeScriptId === script.id) {
            state.activeScriptId = state.scripts.length > 0 ? state.scripts[0].id : null;
          }
          StorageManager.save();
          updateStatsBadges();
          renderScriptsList();
          updateDisplayedMarkers();
          updateMarkersVisibilityUI();
          showToast('Đã xóa kịch bản.');
        }
      });

      // 6. Record Points for this specific script
      card.querySelector('.btn-record-this').addEventListener('click', () => {
        state.activeScriptId = script.id;
        state.displayedScriptId = script.id;
        state.settings.showMarkers = true;
        StorageManager.save();
        renderScriptsList();
        updateDisplayedMarkers();
        updateMarkersVisibilityUI();
        toggleRecording();
      });

      // 7. Add Point Manually
      card.querySelector('.btn-add-manual').addEventListener('click', () => {
        state.activeScriptId = script.id;
        state.displayedScriptId = script.id;
        state.settings.showMarkers = true;
        const newPt = {
          id: 'pt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          x: Math.round(window.innerWidth / 2),
          y: Math.round(window.innerHeight / 2),
          pageX: Math.round(window.innerWidth / 2) + window.scrollX,
          pageY: Math.round(window.innerHeight / 2) + window.scrollY,
          selector: null,
          delay: 500,
          label: `Điểm ${script.points.length + 1}`
        };
        script.points.push(newPt);
        StorageManager.save();
        renderScriptsList();
        updateDisplayedMarkers();
        updateMarkersVisibilityUI();
        showToast(`Đã thêm Điểm #${script.points.length}. Bạn có thể chỉnh tọa độ X, Y ngay bên dưới!`);
      });

      // 8. Chạy riêng kịch bản này
      const runSingleBtn = card.querySelector('.btn-run-single');
      if (runSingleBtn) {
        runSingleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          runSingleScript(script.id);
        });
      }
      const subRunBtn = card.querySelector('.btn-run-single-sub');
      if (subRunBtn) {
        subRunBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          runSingleScript(script.id);
        });
      }

      // Render points of this card
      renderScriptPoints(script, card.querySelector(`#points-list-${script.id}`));

      container.appendChild(card);
    });

    const footerInfo = shadowRoot ? shadowRoot.getElementById('mac-footer-info') : null;
    if (footerInfo) {
      const enabled = state.scripts.filter(s => s.enabled).length;
      footerInfo.textContent = `📍 ${state.scripts.length} kịch bản (${enabled} đang bật) • Lặp lại sau khi chạy xong`;
    }
  }

  // Renders editable points inside each script card
  function renderScriptPoints(script, pointsListEl) {
    if (!pointsListEl) return;
    pointsListEl.innerHTML = '';

    if (script.points.length === 0) {
      pointsListEl.innerHTML = `
        <div style="text-align:center; padding: 10px; color: #64748b; font-size: 11px;">
          Chưa có điểm nào. Bấm <strong>"🔴 Ghi điểm"</strong> hoặc <strong>"➕ Thêm điểm"</strong> để thêm!
        </div>
      `;
      return;
    }

    script.points.forEach((pt, idx) => {
      const row = document.createElement('div');
      row.className = 'mac-point-row';
      row.innerHTML = `
        <div style="display:flex; align-items:center; gap: 6px;">
          <span class="mac-point-badge">${idx + 1}</span>
          <div class="mac-point-inputs">
            <span>X:</span>
            <input type="number" class="mac-coord-input input-x" value="${Math.round(pt.x)}" title="Tọa độ X">
            <span>Y:</span>
            <input type="number" class="mac-coord-input input-y" value="${Math.round(pt.y)}" title="Tọa độ Y">
          </div>
        </div>

        <div style="display:flex; align-items:center; gap: 4px;">
          <input type="number" class="mac-delay-input input-delay" min="10" step="50" value="${pt.delay || 500}" title="Độ trễ (ms)">
          <span style="font-size:10px; color:#94a3b8;">ms</span>
          <button class="mac-icon-btn btn-del-point" title="Xóa điểm này" style="color:#ef4444; width:20px; height:20px;">×</button>
        </div>
      `;

      // Update X coordinate
      row.querySelector('.input-x').addEventListener('change', (e) => {
        pt.x = parseInt(e.target.value) || 0;
        pt.pageX = pt.x + window.scrollX;
        StorageManager.save();
        if (state.displayedScriptId === script.id) updateDisplayedMarkers();
      });

      // Update Y coordinate
      row.querySelector('.input-y').addEventListener('change', (e) => {
        pt.y = parseInt(e.target.value) || 0;
        pt.pageY = pt.y + window.scrollY;
        StorageManager.save();
        if (state.displayedScriptId === script.id) updateDisplayedMarkers();
      });

      // Update Delay
      row.querySelector('.input-delay').addEventListener('change', (e) => {
        pt.delay = Math.max(10, parseInt(e.target.value) || 500);
        StorageManager.save();
      });

      // Delete point
      row.querySelector('.btn-del-point').addEventListener('click', () => {
        script.points.splice(idx, 1);
        StorageManager.save();
        renderScriptPoints(script, pointsListEl);
        if (state.displayedScriptId === script.id) updateDisplayedMarkers();
      });

      pointsListEl.appendChild(row);
    });
  }

  function formatRemainingSec(sec) {
    const totalSec = Math.max(0, Math.ceil(sec));
    if (totalSec >= 3600) {
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      return `${h}h${m.toString().padStart(2, '0')}m${s.toString().padStart(2, '0')}s`;
    } else if (totalSec >= 60) {
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return `${m}m${s.toString().padStart(2, '0')}s`;
    } else {
      return `${totalSec}s`;
    }
  }

  function getScriptStatusHtml(script) {
    if (!script.enabled) return '<span style="color:#64748b;">Đã tắt</span>';
    if (state.runningScriptId === script.id) {
      return '<span style="color:#4ade80; font-weight:bold;">⚡ Đang click...</span>';
    }
    const qIndex = state.executionQueue.indexOf(script.id);
    if (qIndex >= 0) {
      return `<span style="color:#f59e0b; font-weight:bold;">⏳ Hàng đợi (#${qIndex + 1})</span>`;
    }
    if (state.isSchedulerRunning) {
      // 1. Nếu kịch bản này đang có hẹn giờ chạy tiếp theo (đang đếm ngược)
      if (script.nextRunAt > 0 && script.nextRunAt !== Infinity) {
        const remainingSec = Math.max(0, ((script.nextRunAt - Date.now()) / 1000));
        return `<span style="color:#38bdf8; font-weight:bold;">⏳ Chờ chạy: ${formatRemainingSec(remainingSec)}</span>`;
      }

      // 2. Nếu kịch bản này đã chạy xong và đang chờ kịch bản đối ứng chạy
      if (script.nextScriptId && script.nextScriptId !== 'self' && script.nextScriptId !== 'stop') {
        const target = state.scripts.find(s => s.id === script.nextScriptId);
        if (target && target.nextRunAt > 0 && target.nextRunAt !== Infinity) {
          const remainingSec = Math.max(0, ((target.nextRunAt - Date.now()) / 1000));
          return `<span style="color:#a5b4fc; font-weight:bold;">⏳ Chờ ${escapeHtml(target.name)}: ${formatRemainingSec(remainingSec)}</span>`;
        }
      }

      if (script.nextRunAt === Infinity) {
        return '<span style="color:#60a5fa; font-weight:500;">⏳ Đợi chuỗi...</span>';
      }
    }
    return '<span style="color:#94a3b8;">Chờ kích hoạt</span>';
  }

  function renderScriptCountdowns() {
    state.scripts.forEach(script => {
      // 1. Cập nhật nhãn trạng thái góc trên bên phải thẻ
      const el = shadowRoot ? shadowRoot.getElementById(`status-card-${script.id}`) : null;
      if (el) {
        el.innerHTML = getScriptStatusHtml(script);
      }

      // 2. Cập nhật dòng xem trước chu trình trực quan với đồng hồ đếm ngược sống
      const previewEl = shadowRoot ? shadowRoot.getElementById(`flow-preview-${script.id}`) : null;
      if (previewEl && script.nextScriptId && script.nextScriptId !== 'self' && script.nextScriptId !== 'stop') {
        const target = state.scripts.find(s => s.id === script.nextScriptId);
        if (target) {
          const unitA = script.intervalUnit === 'h' ? 'giờ' : (script.intervalUnit === 'm' ? 'phút' : 'giây');
          const unitB = target.intervalUnit === 'h' ? 'giờ' : (target.intervalUnit === 'm' ? 'phút' : 'giây');

          let liveTimerA = `${script.intervalValue || 10} ${unitA}`;
          let liveTimerB = `${target.intervalValue || 5} ${unitB}`;

          if (state.isSchedulerRunning) {
            // Khi target đang đếm ngược chờ kích hoạt (sau khi script này hoàn tất)
            if (target.nextRunAt > 0 && target.nextRunAt !== Infinity) {
              const rem = Math.max(0, ((target.nextRunAt - Date.now()) / 1000));
              liveTimerA = `<span style="color:#38bdf8; font-weight:bold; background:rgba(56,189,248,0.25); padding:1px 6px; border-radius:4px; border:1px solid rgba(56,189,248,0.4);">⏳ ĐANG ĐẾM: ${formatRemainingSec(rem)}</span>`;
            } else if (script.nextRunAt > 0 && script.nextRunAt !== Infinity) {
              // Khi script này đang đếm ngược chờ chạy lại (sau khi target hoàn tất)
              const rem = Math.max(0, ((script.nextRunAt - Date.now()) / 1000));
              liveTimerB = `<span style="color:#34d399; font-weight:bold; background:rgba(52,211,153,0.25); padding:1px 6px; border-radius:4px; border:1px solid rgba(52,211,153,0.4);">⏳ ĐANG ĐẾM: ${formatRemainingSec(rem)}</span>`;
            }
          }

          const noteA = script.timingMode === 'from_start' ? 'tính từ lúc bắt đầu' : 'sau khi kết thúc';
          const noteB = target.timingMode === 'from_start' ? 'tính từ lúc bắt đầu' : 'sau khi kết thúc';

          previewEl.innerHTML = `<span>⚡ <b>Chu trình:</b> [${escapeHtml(script.name)}] ➔ chờ <b>${liveTimerA}</b> <span style="color:#94a3b8; font-size:10px;">(${noteA})</span> ➔ [${escapeHtml(target.name)}] ➔ chờ <b>${liveTimerB}</b> <span style="color:#94a3b8; font-size:10px;">(${noteB})</span> ➔ lặp lại [${escapeHtml(script.name)}]...</span>`;
        }
      }
    });
  }

  // ============================================================================
  // 10. RECORDING ENGINE
  // ============================================================================
  function toggleRecording() {
    if (state.isSchedulerRunning) PriorityScheduler.stop();

    const activeScript = getActiveScript();
    if (!activeScript) {
      showToast('⚠️ Vui lòng chọn hoặc thêm 1 kịch bản trước!');
      return;
    }

    state.isRecording = !state.isRecording;
    const widget = shadowRoot ? shadowRoot.getElementById('mac-floating-widget') : null;
    if (widget) {
      widget.style.display = 'flex';
      if (markersContainer) markersContainer.style.display = 'block';
    }

    if (state.isRecording) {
      state.displayedScriptId = activeScript.id;
      state.settings.showMarkers = true;
      if (markersContainer) markersContainer.style.display = 'block';
      updateDisplayedMarkers();
      updateMarkersVisibilityUI();
      showToast(`🔴 ĐANG GHI ĐIỂM CHO "${activeScript.name}". Click vào các vị trí trên màn hình. Bấm ${state.settings.recordHotkey} khi xong.`);
      window.addEventListener('click', handlePageClickCapture, true);
    } else {
      window.removeEventListener('click', handlePageClickCapture, true);
      StorageManager.save();
      updateDisplayedMarkers();
      updateMarkersVisibilityUI();
      showToast(`✅ Đã lưu ${activeScript.points.length} điểm cho "${activeScript.name}".`);
    }

    updateUIStatus();
    renderScriptsList();
  }

  function handlePageClickCapture(e) {
    if (!state.isRecording) return;

    const path = e.composedPath ? e.composedPath() : [];
    if (path.includes(hostElement) || (shadowRoot && path.includes(shadowRoot))) return;

    e.preventDefault();
    e.stopPropagation();

    const activeScript = getActiveScript();
    if (!activeScript) return;

    const targetSelector = getDomSelector(e.target);

    const point = {
      id: 'pt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      x: Math.round(e.clientX),
      y: Math.round(e.clientY),
      pageX: Math.round(e.pageX),
      pageY: Math.round(e.pageY),
      selector: targetSelector,
      delay: activeScript.clickDelay || 500,
      label: `Điểm ${activeScript.points.length + 1}`
    };

    activeScript.points.push(point);
    state.displayedScriptId = activeScript.id;
    state.settings.showMarkers = true;
    StorageManager.save();

    renderScriptsList();
    updateDisplayedMarkers();
    createClickRipple(e.pageX, e.pageY);
  }

  // ============================================================================
  // 11. RENDERING MARKERS & DRAG TO EDIT
  // ============================================================================
  function renderMarkers(points, priority, scriptId) {
    if (!markersContainer) return;
    markersContainer.innerHTML = '';
    if (!state.settings.showMarkers || !points) return;

    const targetScript = (scriptId ? state.scripts.find(s => s.id === scriptId) : null) || getDisplayedScript() || getActiveScript();
    const scriptPrefix = targetScript ? `[${targetScript.name}] ` : '';

    points.forEach((pt, idx) => {
      const marker = document.createElement('div');
      marker.className = `mac-marker priority-${priority || (targetScript ? targetScript.priority : 2)}`;
      marker.id = `mac-marker-${idx}`;
      marker.style.left = pt.pageX + 'px';
      marker.style.top = pt.pageY + 'px';
      marker.textContent = (idx + 1);
      marker.title = `${scriptPrefix}Điểm #${idx + 1} (${Math.round(pt.x)}, ${Math.round(pt.y)}) - Kéo để đổi vị trí`;

      let isDraggingMarker = false;
      let startX = 0, startY = 0;
      let initPageX = pt.pageX, initPageY = pt.pageY;

      marker.addEventListener('mousedown', (e) => {
        if (state.isSchedulerRunning) return;
        e.stopPropagation();
        isDraggingMarker = true;
        startX = e.clientX;
        startY = e.clientY;
        initPageX = pt.pageX;
        initPageY = pt.pageY;

        function onMarkerMove(moveEvent) {
          if (!isDraggingMarker) return;
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          pt.pageX = initPageX + dx;
          pt.pageY = initPageY + dy;
          pt.x = pt.pageX - window.scrollX;
          pt.y = pt.pageY - window.scrollY;
          marker.style.left = pt.pageX + 'px';
          marker.style.top = pt.pageY + 'px';
        }

        function onMarkerUp() {
          if (isDraggingMarker) {
            isDraggingMarker = false;
            window.removeEventListener('mousemove', onMarkerMove);
            window.removeEventListener('mouseup', onMarkerUp);
            StorageManager.save();
            renderScriptsList(); // Updates input values in card
          }
        }

        window.addEventListener('mousemove', onMarkerMove);
        window.addEventListener('mouseup', onMarkerUp);
      });

      markersContainer.appendChild(marker);
    });
  }

  function highlightMarker(index, isActive) {
    if (!markersContainer) return;
    const allMarkers = markersContainer.querySelectorAll('.mac-marker');
    allMarkers.forEach((m, i) => {
      if (i === index && isActive) {
        m.classList.add('is-clicking');
      } else {
        m.classList.remove('is-clicking');
      }
    });
  }

  // ============================================================================
  // 12. SHORTCUTS & HELPERS
  // ============================================================================
  window.addEventListener('keydown', (e) => {
    // If user is currently focused on an input capturing a hotkey in the settings panel
    if (shadowRoot && shadowRoot.activeElement && shadowRoot.activeElement.classList.contains('mac-hotkey-input')) {
      return;
    }

    if (e.key === 'Escape') {
      if (state.isSchedulerRunning || state.isRecording) {
        e.preventDefault();
        if (state.isRecording) toggleRecording();
        if (state.isSchedulerRunning) PriorityScheduler.stop();
        showToast('⏹️ ĐÃ DỪNG KHẨN CẤP TOÀN BỘ!');
        return;
      }
    }

    const pressedKey = formatHotkeyName(e);

    // 1. Phím tắt khởi động / Bật-Ẩn Auto Clicker (Mặc định: Alt+A)
    if (pressedKey === state.settings.toggleHotkey) {
      if (isUserTypingText(e)) return;
      e.preventDefault();
      e.stopPropagation();
      if (!isTopWindow) {
        try {
          window.top.postMessage({ type: 'MAC_TOGGLE_WIDGET' }, '*');
        } catch (err) {}
      } else {
        toggleWidgetVisibility();
      }
      return;
    }

    // 2. Phím tắt Ghi điểm (F2)
    if (pressedKey === state.settings.recordHotkey) {
      if (isUserTypingText(e)) return;
      e.preventDefault();
      toggleRecording();
      return;
    }

    // 3. Phím tắt Chạy / Dừng (F4)
    if (pressedKey === state.settings.runHotkey) {
      if (isUserTypingText(e)) return;
      e.preventDefault();
      const widget = shadowRoot ? shadowRoot.getElementById('mac-floating-widget') : null;
      if (widget && widget.style.display === 'none') {
        widget.style.display = 'flex';
        if (markersContainer && state.settings.showMarkers) markersContainer.style.display = 'block';
      }
      if (state.isSchedulerRunning) {
        PriorityScheduler.stop();
      } else {
        PriorityScheduler.start();
      }
      return;
    }
  }, true);

  function isUserTypingText(e) {
    if (shadowRoot && shadowRoot.activeElement) {
      const tag = shadowRoot.activeElement.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return true;
    }
    const active = document.activeElement;
    if (active) {
      const tag = active.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || active.isContentEditable) {
        if (e.altKey || e.ctrlKey || (e.key && e.key.startsWith('F'))) return false;
        return true;
      }
    }
    return false;
  }

  // Lắng nghe thông điệp từ iframe khi bấm phím tắt bên trong iframe
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'MAC_TOGGLE_WIDGET' && isTopWindow) {
      toggleWidgetVisibility();
    }
  });

  // Lắng nghe lệnh từ Service Worker hoặc Popup
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.cmd === 'toggle_widget') {
        if (isTopWindow) {
          toggleWidgetVisibility();
          sendResponse({ ok: true, isVisible: isWidgetVisible() });
        }
        return true;
      }
      if (request.cmd === 'show_widget') {
        if (isTopWindow) {
          const widget = shadowRoot ? shadowRoot.getElementById('mac-floating-widget') : null;
          if (widget) {
            widget.style.display = 'flex';
            if (markersContainer && state.settings.showMarkers) markersContainer.style.display = 'block';
          }
          sendResponse({ ok: true });
        }
        return true;
      }
      if (request.cmd === 'hide_widget') {
        if (isTopWindow) {
          const widget = shadowRoot ? shadowRoot.getElementById('mac-floating-widget') : null;
          if (widget) {
            widget.style.display = 'none';
            if (markersContainer) markersContainer.style.display = 'none';
          }
          sendResponse({ ok: true });
        }
        return true;
      }
    });
  }

  function formatHotkeyName(e) {
    if (e.key.startsWith('F') && !isNaN(e.key.slice(1))) return e.key;
    if (['Escape', 'Enter', 'Space'].includes(e.key)) return e.key;
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    if (!['Control', 'Shift', 'Alt'].includes(e.key)) parts.push(e.key.toUpperCase());
    return parts.join('+') || e.key;
  }

  function updateUIStatus() {
    if (!shadowRoot) return;
    const badge = shadowRoot.getElementById('mac-status-badge');
    const btnRecord = shadowRoot.getElementById('mac-btn-record');
    const btnRun = shadowRoot.getElementById('mac-btn-run');
    const recordText = shadowRoot.getElementById('mac-record-text');
    const runText = shadowRoot.getElementById('mac-run-text');

    if (state.isRecording) {
      if (badge) { badge.className = 'mac-status-pill status-recording'; badge.textContent = 'Đang Ghi'; }
      if (btnRecord) { btnRecord.className = 'mac-btn mac-btn-record is-recording'; }
      if (recordText) recordText.textContent = `Dừng Ghi (${state.settings.recordHotkey})`;
    } else if (state.isSchedulerRunning) {
      if (badge) { badge.className = 'mac-status-pill status-running'; badge.textContent = 'Đang Chạy'; }
      if (btnRun) { btnRun.className = 'mac-btn mac-btn-run is-running'; }
      if (runText) runText.textContent = `Dừng (${state.settings.runHotkey})`;
    } else {
      if (badge) { badge.className = 'mac-status-pill status-idle'; badge.textContent = 'Sẵn Sàng'; }
      if (btnRecord) { btnRecord.className = 'mac-btn mac-btn-record'; }
      if (recordText) recordText.textContent = `Ghi Điểm (${state.settings.recordHotkey})`;
      if (btnRun) { btnRun.className = 'mac-btn mac-btn-run'; }
      if (runText) runText.textContent = `Chạy Tất Cả (${state.settings.runHotkey})`;
    }
  }

  function updateQueueBanner(customText) {
    if (!shadowRoot) return;
    const textEl = shadowRoot.getElementById('mac-queue-status-text');
    const badgeEl = shadowRoot.getElementById('mac-queue-badge');
    if (!textEl || !badgeEl) return;

    badgeEl.textContent = `${state.executionQueue.length} chờ`;

    if (customText) {
      textEl.textContent = customText;
      return;
    }

    if (state.runningScriptId) {
      const runningScript = state.scripts.find(s => s.id === state.runningScriptId);
      if (runningScript) {
        const pName = runningScript.priority === 1 ? '⭐ Cao' : (runningScript.priority === 2 ? '🔷 TB' : '⚪ Thấp');
        textEl.textContent = `⚡ Đang click: [${runningScript.name}] (${pName})`;
        return;
      }
    }

    if (state.executionQueue.length > 0) {
      const nextId = state.executionQueue[0];
      const nextScript = state.scripts.find(s => s.id === nextId);
      if (nextScript) {
        textEl.textContent = `⏳ Kế tiếp trong hàng đợi: [${nextScript.name}]`;
        return;
      }
    }

    if (state.isSchedulerRunning) {
      textEl.textContent = '🛡️ Đang canh thời gian lặp...';
    } else {
      textEl.textContent = '🛡️ Điều phối ưu tiên: Sẵn sàng';
    }
  }

  function showToast(message) {
    if (!shadowRoot) return;
    const existing = shadowRoot.querySelector('.mac-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'mac-toast';
    toast.textContent = message;
    shadowRoot.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ============================================================================
  // 13. BOOTSTRAP
  // ============================================================================
  async function start() {
    initSchedulerWorker();
    await StorageManager.load();
    if (document.body) {
      initUI();
    } else {
      window.addEventListener('DOMContentLoaded', initUI);
    }
  }

  start();
})();
