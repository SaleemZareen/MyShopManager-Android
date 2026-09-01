package com.saleemkhan.myshopmanager.data

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.saleemkhan.myshopmanager.model.*
import com.saleemkhan.myshopmanager.utils.FormatUtils
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AppStateRepository private constructor(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("myshopmanager_state_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val _appState = MutableStateFlow(loadState())
    val appState: StateFlow<AppState> = _appState.asStateFlow()

    companion object {
        private const val STORAGE_KEY = "my_shop_manager_app_state_v2"

        @Volatile
        private var INSTANCE: AppStateRepository? = null

        fun getInstance(context: Context): AppStateRepository {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: AppStateRepository(context.applicationContext).also { INSTANCE = it }
            }
        }
    }

    private fun loadState(): AppState {
        return try {
            val json = prefs.getString(STORAGE_KEY, null)
            if (!json.isNullOrBlank()) {
                val state = gson.fromJson(json, AppState::class.java)
                state ?: FormatUtils.DEFAULT_APP_STATE
            } else {
                FormatUtils.DEFAULT_APP_STATE
            }
        } catch (e: Exception) {
            e.printStackTrace()
            FormatUtils.DEFAULT_APP_STATE
        }
    }

    fun saveState(state: AppState) {
        _appState.value = state
        try {
            val json = gson.toJson(state)
            prefs.edit().putString(STORAGE_KEY, json).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun updateState(transform: (AppState) -> AppState) {
        val current = _appState.value
        val updated = transform(current)
        saveState(updated)
    }

    fun resetState() {
        saveState(FormatUtils.DEFAULT_APP_STATE)
    }
}
