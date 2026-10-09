package com.autoclicker.multiscript.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import android.widget.Toast
import androidx.core.app.NotificationCompat
import com.autoclicker.multiscript.R
import com.autoclicker.multiscript.engine.PriorityScheduler
import com.autoclicker.multiscript.model.ClickPoint
import com.autoclicker.multiscript.model.Script
import com.autoclicker.multiscript.storage.ScriptStorage

class FloatingOverlayService : Service() {

    private lateinit var windowManager: WindowManager
    private var floatingDockView: View? = null
    private val markerViews = mutableListOf<View>()

    private var scripts: MutableList<Script> = mutableListOf()
    private var activeScriptIndex = 0
    private var areMarkersVisible = true

    private var scheduler: PriorityScheduler? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        startForegroundNotification()

        scripts = ScriptStorage.loadScripts(this)
        val savedDisplayedId = ScriptStorage.getDisplayedScriptId(this)
        val idx = scripts.indexOfFirst { it.id == savedDisplayedId }
        activeScriptIndex = if (idx >= 0) idx else 0

        scheduler = PriorityScheduler(scripts) {
            updateDockUI()
            ScriptStorage.saveScripts(this, scripts)
        }

        initFloatingDock()
        renderMarkersForCurrentScript()
    }

    private fun startForegroundNotification() {
        val channelId = "autoclick_overlay_channel"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Auto Clicker Overlay Service",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }

        val notification: Notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Auto Click Đa Kịch Bản")
            .setContentText("Thanh điều khiển nổi đang hoạt động")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        startForeground(1001, notification)
    }

    // ========================================================================
    // 1. FLOATING CONTROL DOCK
    // ========================================================================
    private fun initFloatingDock() {
        val inflater = LayoutInflater.from(this)
        floatingDockView = inflater.inflate(R.layout.layout_floating_menu, null)

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 50
            y = 200
        }

        // Draggable dock logic
        val dragHeader = floatingDockView!!.findViewById<View>(R.id.llDragHeader)
        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f

        dragHeader.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    params.x = initialX + (event.rawX - initialTouchX).toInt()
                    params.y = initialY + (event.rawY - initialTouchY).toInt()
                    windowManager.updateViewLayout(floatingDockView, params)
                    true
                }
                else -> false
            }
        }

        // Buttons
        val btnPlayPause = floatingDockView!!.findViewById<TextView>(R.id.btnPlayPause)
        val btnAddPoint = floatingDockView!!.findViewById<TextView>(R.id.btnAddPoint)
        val btnRemovePoint = floatingDockView!!.findViewById<TextView>(R.id.btnRemovePoint)
        val btnToggleMarkers = floatingDockView!!.findViewById<TextView>(R.id.btnToggleMarkers)
        val btnSwitchScript = floatingDockView!!.findViewById<TextView>(R.id.btnSwitchScript)
        val btnCloseDock = floatingDockView!!.findViewById<TextView>(R.id.btnCloseDock)

        btnPlayPause.setOnClickListener {
            if (!AutoClickAccessibilityService.isRunning()) {
                Toast.makeText(this, "⚠️ Vui lòng bật Dịch vụ Hỗ trợ tiếp cận trước!", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }
            if (scheduler?.isSchedulerRunning() == true) {
                scheduler?.stop()
                btnPlayPause.text = "▶️"
                Toast.makeText(this, "⏹️ Đã dừng kịch bản", Toast.LENGTH_SHORT).show()
            } else {
                scheduler?.start()
                btnPlayPause.text = "⏸️"
                Toast.makeText(this, "🚀 Đang chạy kịch bản...", Toast.LENGTH_SHORT).show()
            }
        }

        btnAddPoint.setOnClickListener {
            val currentScript = getCurrentScript()
            val pointIndex = currentScript.points.size + 1
            val newPt = ClickPoint(
                x = 500f,
                y = 800f,
                delayMs = 500L,
                label = "Điểm $pointIndex"
            )
            currentScript.points.add(newPt)
            ScriptStorage.saveScripts(this, scripts)
            renderMarkersForCurrentScript()
            Toast.makeText(this, "➕ Đã thêm Điểm #$pointIndex", Toast.LENGTH_SHORT).show()
        }

        btnRemovePoint.setOnClickListener {
            val currentScript = getCurrentScript()
            if (currentScript.points.isNotEmpty()) {
                currentScript.points.removeAt(currentScript.points.size - 1)
                ScriptStorage.saveScripts(this, scripts)
                renderMarkersForCurrentScript()
                Toast.makeText(this, "➖ Đã xóa điểm cuối", Toast.LENGTH_SHORT).show()
            }
        }

        btnToggleMarkers.setOnClickListener {
            areMarkersVisible = !areMarkersVisible
            btnToggleMarkers.text = if (areMarkersVisible) "👁️" else "🕶️"
            markerViews.forEach { it.visibility = if (areMarkersVisible) View.VISIBLE else View.GONE }
            Toast.makeText(
                this,
                if (areMarkersVisible) "👁️ Đã hiện các điểm ghim" else "🕶️ Đã ẩn các điểm ghim",
                Toast.LENGTH_SHORT
            ).show()
        }

        btnSwitchScript.setOnClickListener {
            if (scripts.size > 1) {
                activeScriptIndex = (activeScriptIndex + 1) % scripts.size
                val current = getCurrentScript()
                ScriptStorage.setDisplayedScriptId(this, current.id)
                updateDockUI()
                renderMarkersForCurrentScript()
                Toast.makeText(this, "📑 Đã chuyển sang: ${current.name}", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, "Chỉ có 1 kịch bản. Vào app để tạo thêm!", Toast.LENGTH_SHORT).show()
            }
        }

        btnCloseDock.setOnClickListener {
            stopSelf()
        }

        windowManager.addView(floatingDockView, params)
        updateDockUI()
    }

    private fun getCurrentScript(): Script {
        if (activeScriptIndex >= scripts.size) activeScriptIndex = 0
        return scripts[activeScriptIndex]
    }

    private fun updateDockUI() {
        floatingDockView?.let { view ->
            val tvName = view.findViewById<TextView>(R.id.tvCurrentScriptName)
            val current = getCurrentScript()
            tvName.text = current.name
        }
    }

    // ========================================================================
    // 2. DRAGGABLE CLICK MARKERS (SINGLE SCRIPT POINT VISIBILITY)
    // ========================================================================
    private fun clearMarkers() {
        markerViews.forEach {
            try {
                windowManager.removeView(it)
            } catch (e: Exception) {}
        }
        markerViews.clear()
    }

    private fun renderMarkersForCurrentScript() {
        clearMarkers()
        if (!areMarkersVisible) return

        val currentScript = getCurrentScript()
        currentScript.points.forEachIndexed { index, point ->
            val markerView = LayoutInflater.from(this).inflate(R.layout.layout_floating_marker, null)
            val tvNum = markerView.findViewById<TextView>(R.id.tvMarkerNumber)
            tvNum.text = "${index + 1}"

            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                else
                    WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                x = (point.x - 44).toInt().coerceAtLeast(0)
                y = (point.y - 44).toInt().coerceAtLeast(0)
            }

            var initX = 0
            var initY = 0
            var touchX = 0f
            var touchY = 0f

            markerView.setOnTouchListener { _, event ->
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initX = params.x
                        initY = params.y
                        touchX = event.rawX
                        touchY = event.rawY
                        true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        params.x = initX + (event.rawX - touchX).toInt()
                        params.y = initY + (event.rawY - touchY).toInt()
                        point.x = params.x + 44f
                        point.y = params.y + 44f
                        windowManager.updateViewLayout(markerView, params)
                        true
                    }
                    MotionEvent.ACTION_UP -> {
                        ScriptStorage.saveScripts(this, scripts)
                        true
                    }
                    else -> false
                }
            }

            windowManager.addView(markerView, params)
            markerViews.add(markerView)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        scheduler?.stop()
        clearMarkers()
        floatingDockView?.let {
            try {
                windowManager.removeView(it)
            } catch (e: Exception) {}
        }
    }
}
