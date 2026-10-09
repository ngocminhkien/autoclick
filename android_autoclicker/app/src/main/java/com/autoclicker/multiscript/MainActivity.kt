package com.autoclicker.multiscript

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.LayoutInflater
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.ImageButton
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SwitchCompat
import androidx.core.content.ContextCompat
import com.autoclicker.multiscript.databinding.ActivityMainBinding
import com.autoclicker.multiscript.model.Script
import com.autoclicker.multiscript.service.AutoClickAccessibilityService
import com.autoclicker.multiscript.service.FloatingOverlayService
import com.autoclicker.multiscript.storage.ScriptStorage

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private var scripts: MutableList<Script> = mutableListOf()
    private var isFloatingServiceRunning = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        scripts = ScriptStorage.loadScripts(this)

        setupListeners()
        renderScriptsList()
    }

    override fun onResume() {
        super.onResume()
        updatePermissionStatuses()
    }

    private fun setupListeners() {
        binding.btnEnableAccessibility.setOnClickListener {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            startActivity(intent)
            Toast.makeText(this, "Tìm 'Auto Click Đa Kịch Bản' và bật BẬT (ON)", Toast.LENGTH_LONG).show()
        }

        binding.btnEnableOverlay.setOnClickListener {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                )
                startActivity(intent)
            }
        }

        binding.btnToggleFloatingService.setOnClickListener {
            if (!checkOverlayPermission()) {
                Toast.makeText(this, "⚠️ Vui lòng cấp quyền Hiển thị trên ứng dụng khác trước!", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (!AutoClickAccessibilityService.isRunning()) {
                Toast.makeText(this, "⚠️ Vui lòng bật Dịch vụ Hỗ trợ tiếp cận (Accessibility) trước!", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }

            val serviceIntent = Intent(this, FloatingOverlayService::class.java)
            if (isFloatingServiceRunning) {
                stopService(serviceIntent)
                isFloatingServiceRunning = false
                binding.btnToggleFloatingService.text = getString(R.string.btn_start_service)
                binding.btnToggleFloatingService.setBackgroundColor(ContextCompat.getColor(this, R.color.success))
            } else {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent)
                } else {
                    startService(serviceIntent)
                }
                isFloatingServiceRunning = true
                binding.btnToggleFloatingService.text = getString(R.string.btn_stop_service)
                binding.btnToggleFloatingService.setBackgroundColor(ContextCompat.getColor(this, R.color.danger))
                // Minimize to home so user sees the floating dock on screen
                moveTaskToBack(true)
            }
        }

        binding.btnAddScript.setOnClickListener {
            val newScript = Script(
                name = "Kịch bản ${scripts.size + 1}",
                intervalValue = 10,
                intervalUnit = "s"
            )
            scripts.add(newScript)
            ScriptStorage.saveScripts(this, scripts)
            renderScriptsList()
            Toast.makeText(this, "Đã thêm ${newScript.name}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun checkOverlayPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(this)
        } else {
            true
        }
    }

    private fun updatePermissionStatuses() {
        val isA11y = AutoClickAccessibilityService.isRunning()
        val isOverlay = checkOverlayPermission()

        binding.tvAccessibilityStatus.text = if (isA11y) getString(R.string.status_enabled) else getString(R.string.status_disabled)
        binding.tvAccessibilityStatus.setTextColor(ContextCompat.getColor(this, if (isA11y) R.color.success else R.color.danger))

        binding.tvOverlayStatus.text = if (isOverlay) getString(R.string.status_enabled) else getString(R.string.status_disabled)
        binding.tvOverlayStatus.setTextColor(ContextCompat.getColor(this, if (isOverlay) R.color.success else R.color.danger))
    }

    private fun renderScriptsList() {
        binding.llScriptsContainer.removeAllViews()
        val inflater = LayoutInflater.from(this)

        scripts.forEachIndexed { index, script ->
            val card = inflater.inflate(R.layout.item_script, binding.llScriptsContainer, false)

            val sw = card.findViewById<SwitchCompat>(R.id.switchScriptEnabled)
            val etName = card.findViewById<EditText>(R.id.etScriptName)
            val tvRuns = card.findViewById<TextView>(R.id.tvRunCountBadge)
            val btnDel = card.findViewById<ImageButton>(R.id.btnDeleteScript)
            val etInterval = card.findViewById<EditText>(R.id.etIntervalVal)
            val spUnit = card.findViewById<Spinner>(R.id.spinnerIntervalUnit)
            val spPrio = card.findViewById<Spinner>(R.id.spinnerPriority)
            val spTiming = card.findViewById<Spinner>(R.id.spinnerTimingMode)
            val tvPoints = card.findViewById<TextView>(R.id.tvPointsSummary)

            sw.isChecked = script.enabled
            etName.setText(script.name)
            tvRuns.text = "🎯 ${script.runCount} lượt"
            etInterval.setText(script.intervalValue.toString())
            tvPoints.text = "📍 ${script.points.size} điểm"

            // Spinner Units
            val units = arrayOf("Giây", "Phút", "Giờ")
            val unitAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, units)
            spUnit.adapter = unitAdapter
            spUnit.setSelection(when (script.intervalUnit) { "h" -> 2; "m" -> 1; else -> 0 })

            // Spinner Priorities
            val priorities = arrayOf("⭐ Cao", "🔷 Trung bình", "⚪ Thấp")
            val prioAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, priorities)
            spPrio.adapter = prioAdapter
            spPrio.setSelection((script.priority - 1).coerceIn(0, 2))

            // Spinner Timing Mode
            val timingModes = arrayOf("⏱️ Sau khi xong", "⚡ Từ lúc bắt đầu")
            val timingAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, timingModes)
            spTiming.adapter = timingAdapter
            spTiming.setSelection(if (script.timingMode == "from_start") 1 else 0)

            sw.setOnCheckedChangeListener { _, isChecked ->
                script.enabled = isChecked
                ScriptStorage.saveScripts(this, scripts)
            }

            btnDel.setOnClickListener {
                if (scripts.size <= 1) {
                    Toast.makeText(this, "Phải giữ lại ít nhất 1 kịch bản!", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                scripts.removeAt(index)
                ScriptStorage.saveScripts(this, scripts)
                renderScriptsList()
            }

            spUnit.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(parent: AdapterView<*>?, view: View?, pos: Int, id: Long) {
                    script.intervalUnit = when (pos) { 2 -> "h"; 1 -> "m"; else -> "s" }
                    ScriptStorage.saveScripts(this@MainActivity, scripts)
                }
                override fun onNothingSelected(parent: AdapterView<*>?) {}
            }

            spPrio.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(parent: AdapterView<*>?, view: View?, pos: Int, id: Long) {
                    script.priority = pos + 1
                    ScriptStorage.saveScripts(this@MainActivity, scripts)
                }
                override fun onNothingSelected(parent: AdapterView<*>?) {}
            }

            spTiming.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(parent: AdapterView<*>?, view: View?, pos: Int, id: Long) {
                    script.timingMode = if (pos == 1) "from_start" else "after_finish"
                    ScriptStorage.saveScripts(this@MainActivity, scripts)
                }
                override fun onNothingSelected(parent: AdapterView<*>?) {}
            }

            binding.llScriptsContainer.addView(card)
        }
    }
}
