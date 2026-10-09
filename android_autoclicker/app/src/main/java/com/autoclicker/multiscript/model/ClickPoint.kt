package com.autoclicker.multiscript.model

import org.json.JSONObject

data class ClickPoint(
    val id: String = "pt_" + System.currentTimeMillis() + "_" + (100..999).random(),
    var x: Float,
    var y: Float,
    var delayMs: Long = 500L,
    var label: String = ""
) {
    fun toJson(): JSONObject {
        return JSONObject().apply {
            put("id", id)
            put("x", x.toDouble())
            put("y", y.toDouble())
            put("delayMs", delayMs)
            put("label", label)
        }
    }

    companion object {
        fun fromJson(json: JSONObject): ClickPoint {
            return ClickPoint(
                id = json.optString("id", "pt_" + System.currentTimeMillis()),
                x = json.optDouble("x", 500.0).toFloat(),
                y = json.optDouble("y", 500.0).toFloat(),
                delayMs = json.optLong("delayMs", 500L),
                label = json.optString("label", "")
            )
        }
    }
}
