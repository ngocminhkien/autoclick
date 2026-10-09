package com.autoclicker.multiscript.engine

import android.os.Handler
import android.os.Looper
import com.autoclicker.multiscript.model.Script
import com.autoclicker.multiscript.service.AutoClickAccessibilityService

class PriorityScheduler(
    private val scripts: MutableList<Script>,
    private val onStateChanged: () -> Unit
) {
    private val handler = Handler(Looper.getMainLooper())
    private var isRunning = false
    private var isMouseLocked = false
    private val executionQueue = mutableListOf<String>()

    private val tickRunnable = object : Runnable {
        override fun run() {
            if (!isRunning) return
            tick()
            handler.postDelayed(this, 150L)
        }
    }

    fun start() {
        if (isRunning) return
        isRunning = true

        val enabledScripts = scripts.filter { it.enabled && it.points.isNotEmpty() }
        if (enabledScripts.isEmpty()) {
            isRunning = false
            onStateChanged()
            return
        }

        val now = System.currentTimeMillis()

        // 1. Identify starter scripts vs follower scripts
        val followerIds = enabledScripts
            .filter { it.nextScriptId != "self" && it.nextScriptId != "stop" && it.nextScriptId != it.id }
            .map { it.nextScriptId }
            .toSet()

        val starters = enabledScripts.filter { !followerIds.contains(it.id) }.map { it.id }.toMutableSet()
        if (starters.isEmpty()) {
            starters.add(enabledScripts[0].id)
        }

        enabledScripts.forEach { s ->
            if (starters.contains(s.id)) {
                s.nextRunAt = now
            } else {
                s.nextRunAt = Long.MAX_VALUE
            }
        }

        handler.post(tickRunnable)
        onStateChanged()
    }

    fun stop() {
        isRunning = false
        isMouseLocked = false
        executionQueue.clear()
        handler.removeCallbacks(tickRunnable)
        onStateChanged()
    }

    fun isSchedulerRunning(): Boolean = isRunning

    private fun tick() {
        if (!isRunning) return
        val now = System.currentTimeMillis()

        // Add scripts whose timer has arrived
        scripts.forEach { script ->
            if (script.enabled && script.points.isNotEmpty()) {
                if (now >= script.nextRunAt && !executionQueue.contains(script.id)) {
                    executionQueue.add(script.id)
                }
            }
        }

        // Priority sort (1: High > 2: Normal > 3: Low)
        executionQueue.sortWith { idA, idB ->
            val sA = scripts.find { it.id == idA }
            val sB = scripts.find { it.id == idB }
            if (sA == null || sB == null) 0
            else if (sA.priority != sB.priority) sA.priority.compareTo(sB.priority)
            else sA.nextRunAt.compareTo(sB.nextRunAt)
        }

        // Dispatch if mutex is available
        if (!isMouseLocked && executionQueue.isNotEmpty()) {
            val nextId = executionQueue.removeAt(0)
            val scriptToRun = scripts.find { it.id == nextId }
            if (scriptToRun != null && scriptToRun.enabled && scriptToRun.points.isNotEmpty()) {
                executeScript(scriptToRun)
            }
        }
    }

    private fun executeScript(script: Script) {
        val service = AutoClickAccessibilityService.instance ?: return
        isMouseLocked = true

        val startTime = System.currentTimeMillis()
        val intervalMs = script.getIntervalMs()
        val isFromStart = script.timingMode == "from_start"

        // If counting from start: set nextRunAt right now
        if (isFromStart) {
            val nextTargetId = script.nextScriptId
            if (nextTargetId != "stop") {
                if (nextTargetId != "self") {
                    val targetScript = scripts.find { it.id == nextTargetId }
                    if (targetScript != null) {
                        targetScript.enabled = true
                        targetScript.nextRunAt = startTime + intervalMs
                        script.nextRunAt = Long.MAX_VALUE
                    }
                } else {
                    script.nextRunAt = startTime + intervalMs
                }
            }
        }

        // Execute points sequentially
        executePointIndex(script, 0, service) {
            // Execution completed callback
            script.runCount++
            script.lastRunAt = System.currentTimeMillis()

            if (!isFromStart) {
                // If counting after finish:
                val finishTime = System.currentTimeMillis()
                val nextTargetId = script.nextScriptId
                if (nextTargetId != "stop") {
                    if (nextTargetId != "self") {
                        val targetScript = scripts.find { it.id == nextTargetId }
                        if (targetScript != null) {
                            targetScript.enabled = true
                            targetScript.nextRunAt = finishTime + intervalMs
                            script.nextRunAt = Long.MAX_VALUE
                        }
                    } else {
                        script.nextRunAt = finishTime + intervalMs
                    }
                } else {
                    script.nextRunAt = Long.MAX_VALUE
                }
            }

            isMouseLocked = false
            onStateChanged()
        }
    }

    private fun executePointIndex(
        script: Script,
        index: Int,
        service: AutoClickAccessibilityService,
        onFinished: () -> Unit
    ) {
        if (!isRunning || index >= script.points.size) {
            onFinished()
            return
        }

        val point = script.points[index]
        service.performClick(point.x, point.y, 70L) {
            handler.postDelayed({
                executePointIndex(script, index + 1, service, onFinished)
            }, point.delayMs)
        }
    }
}
