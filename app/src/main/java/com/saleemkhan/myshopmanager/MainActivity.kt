package com.saleemkhan.myshopmanager

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.view.WindowCompat
import com.saleemkhan.myshopmanager.ui.MyShopManagerApp

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Configure system status bar for clean modern light display
        WindowCompat.setDecorFitsSystemWindows(window, true)

        setContent {
            MyShopManagerApp()
        }
    }
}
