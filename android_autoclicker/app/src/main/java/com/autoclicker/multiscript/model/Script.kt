package com.autoclicker.multiscript.model

import org.json.JSONArray
import org.json.JSONObject

data class Script(
    val id: String = "script_" + System.currentTimeMillis() + "_" + (100..999).random(),
    var name: String,
    var enabled: Boolean = true,
    var priority: Int = 2, // 1: High, 2: Normal, 3: Low
    var intervalValue: Int = 10,
    var intervalUnit: String = "s", // "s", "m", "h"
    var timingMode: String = "after_finish", // "after_finish", "from_start"
    var nextScriptId: String = "self", // "self", "stop", or other script id
    val points: MutableList<ClickPoint> = mutableListOf(),
    var runCount: Int = 0,
    var lastRunAt: Long? = null,
    var nextRunAt: Long = 0L,
    var isPointsExpanded: Boolean = true
) {
    fun getIntervalMs(): Long {
        val mult = when (intervalUnit) {
            "h" -> 3600L
            "m" -> 60L
            else -> 1L
        }
        return (intervalValue.coerceAtLeast(1) * mult * 1000L)
    }

    fun toJson(): JSONObject {
        val json = JSONObject()
        json.put("id", id)
        json.put("name", name)
        json.put("enabled", enabled)
        json.put("priority", priority)
        json.put("intervalValue", intervalValue)
        json.put("intervalUnit", intervalUnit)
        json.put("timingMode", timingMode)
        json.put("nextScriptId", nextScriptId)
        json.put("runCount", runCount)
        json.put("lastRunAt", lastRunAt ?: 0L)
        
        val pointsArr = JSONArray()
        points.forEach { pointsArr.put(it.toJson()) }
        json.put("points", pointsArr)
        return json
    }

    companion object {
        fun fromJson(json: JSONObject): Script {
            val script = Script(
                id = json.optString("id", "script_" + System.currentTimeMillis()),
                name = json.optString("name", "Kịch bản"),
                enabled = json.optBoolean("enabled", true),
                priority = json.optInt("priority", 2),
                intervalValue = json.optInt("intervalValue", 10),
                intervalUnit = json.optString("intervalUnit", "s"),
                timingMode = json.optString("timingMode", "after_finish"),
                nextScriptId = json.optString("nextScriptId", "self"),
                runCount = json.optInt("runCount", 0),
                lastRunAt = if (json.has("lastRunAt") && json.getLong("lastRunAt") > 0) json.getLong("lastRunAt") else null
            )
            val pointsArr = json.optJSONArray("points")
            if (pointsArr != null) {
                for (i in 0 until pointsArr.length()) {
                    val pJson = pointsArr.getJSONObject(i)
                    script.points.add(ClickPoint.fromJson(pJson))
                }
            }
            return script
        }
    }
}
