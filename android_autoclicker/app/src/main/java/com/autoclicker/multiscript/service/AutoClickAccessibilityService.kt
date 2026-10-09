package com.autoclicker.multiscript.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent

class AutoClickAccessibilityService : AccessibilityService() {

    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Not used for pure clicker automation
    }

    override fun onInterrupt() {
        // Handle interruption
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
    }

    /**
     * Dispatches an exact touch gesture (tap) on the Android screen.
     * holdDurationMs default is 70ms (matching the Android Cloud / TouchEmulator standard).
     */
    fun performClick(x: Float, y: Float, holdDurationMs: Long = 70L, onComplete: () -> Unit) {
        val path = Path().apply {
            moveTo(x, y)
        }
        val stroke = GestureDescription.StrokeDescription(path, 0L, holdDurationMs)
        val builder = GestureDescription.Builder().apply {
            addStroke(stroke)
        }

        dispatchGesture(builder.build(), object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                super.onCompleted(gestureDescription)
                onComplete()
            }

            override fun onCancelled(gestureDescription: GestureDescription?) {
                super.onCancelled(gestureDescription)
                onComplete()
            }
        }, null)
    }

    companion object {
        var instance: AutoClickAccessibilityService? = null

        fun isRunning(): Boolean {
            return instance != null
        }
    }
}
