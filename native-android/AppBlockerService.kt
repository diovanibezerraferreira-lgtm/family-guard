package com.familyguard.app

import android.app.Service
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView

class AppBlockerService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private var windowManager: WindowManager? = null
    private var overlayView: LinearLayout? = null

    companion object {
        var blockedPackages: Set<String> = emptySet()
    }

    private val checkRunnable = object : Runnable {
        override fun run() {
            val foregroundApp = getForegroundPackageName()
            if (foregroundApp != null && blockedPackages.contains(foregroundApp)) {
                showBlockOverlay()
            } else {
                hideBlockOverlay()
            }
            handler.postDelayed(this, 1000)
        }
    }

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        handler.post(checkRunnable)
    }

    private fun getForegroundPackageName(): String? {
        val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val time = System.currentTimeMillis()
        val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, time - 10000, time)
        return stats?.maxByOrNull { it.lastTimeUsed }?.packageName
    }

    private fun showBlockOverlay() {
        if (overlayView != null) return
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#101D38"))
            val title = TextView(context).apply {
                text = "FAMILY GUARD\nAplicativo Bloqueado pelos Pais"
                setTextColor(Color.parseColor("#D6AD53"))
                textSize = 22f
                gravity = Gravity.CENTER
            }
            addView(title)
        }

        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else WindowManager.LayoutParams.TYPE_PHONE

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        )
        windowManager?.addView(layout, params)
        overlayView = layout
    }

    private fun hideBlockOverlay() {
        overlayView?.let {
            windowManager?.removeView(it)
            overlayView = null
        }
    }

    override fun onDestroy() {
        handler.removeCallbacks(checkRunnable)
        hideBlockOverlay()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}