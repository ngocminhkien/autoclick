package com.autoclicker.multiscript.storage

import android.content.Context
import com.autoclicker.multiscript.model.ClickPoint
import com.autoclicker.multiscript.model.Script
import org.json.JSONArray

object ScriptStorage {
    private const val PREFS_NAME = "autoclicker_prefs"
    private const val KEY_SCRIPTS = "scripts_json"
    private const val KEY_ACTIVE_SCRIPT_ID = "active_script_id"
    private const val KEY_DISPLAYED_SCRIPT_ID = "displayed_script_id"

    fun loadScripts(context: Context): MutableList<Script> {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val jsonStr = prefs.getString(KEY_SCRIPTS, null)
        val list = mutableListOf<Script>()

        if (!jsonStr.isNullOrEmpty()) {
            try {
                val array = JSONArray(jsonStr)
                for (i in 0 until array.length()) {
                    list.add(Script.fromJson(array.getJSONObject(i)))
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        if (list.isEmpty()) {
            val defaultScript = Script(
                name = "Kịch bản 1",
                intervalValue = 10,
                intervalUnit = "s"
            )
            // Add sample point in center of screen
            defaultScript.points.add(ClickPoint(x = 500f, y = 800f, delayMs = 500L, label = "Điểm 1"))
            list.add(defaultScript)
            saveScripts(context, list)
        }

        return list
    }

    fun saveScripts(context: Context, scripts: List<Script>) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val array = JSONArray()
        scripts.forEach { array.put(it.toJson()) }
        prefs.edit().putString(KEY_SCRIPTS, array.toString()).apply()
    }

    fun getActiveScriptId(context: Context): String? {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_ACTIVE_SCRIPT_ID, null)
    }

    fun setActiveScriptId(context: Context, id: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_ACTIVE_SCRIPT_ID, id).apply()
    }

    fun getDisplayedScriptId(context: Context): String? {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_DISPLAYED_SCRIPT_ID, null)
    }

    fun setDisplayedScriptId(context: Context, id: String?) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_DISPLAYED_SCRIPT_ID, id).apply()
    }
}
