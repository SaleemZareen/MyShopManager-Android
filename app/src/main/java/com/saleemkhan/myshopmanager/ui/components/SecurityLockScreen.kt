package com.saleemkhan.myshopmanager.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.saleemkhan.myshopmanager.ui.theme.*

@Composable
fun SecurityLockScreen(
    expectedPin: String,
    isUrdu: Boolean,
    onUnlockSuccess: () -> Unit
) {
    var enteredPin by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    fun handleKeyPress(key: String) {
        if (enteredPin.length < 4) {
            val newPin = enteredPin + key
            enteredPin = newPin
            if (newPin.length == 4) {
                if (newPin == expectedPin) {
                    onUnlockSuccess()
                } else {
                    errorMessage = if (isUrdu) "غلط پن کوڈ درج کیا گیا ہے!" else "Incorrect PIN entered!"
                    enteredPin = ""
                }
            }
        }
    }

    fun handleDelete() {
        if (enteredPin.isNotEmpty()) {
            enteredPin = enteredPin.dropLast(1)
            errorMessage = null
        }
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Slate900
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Lock Icon
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .background(DukanGreenPrimary.copy(alpha = 0.15f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Lock,
                    contentDescription = "Lock",
                    tint = DukanGreenPrimary,
                    modifier = Modifier.size(36.dp)
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            Text(
                text = if (isUrdu) "دکان مینیجر مقفل ہے" else "Shop Manager Locked",
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = if (isUrdu) "براہ کرم اپنا 4 ہندسوں والا سیکیورٹی پن کوڈ درج کریں" else "Please enter your 4-digit security PIN",
                fontSize = 13.sp,
                color = Slate400,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(28.dp))

            // PIN Dots Indicator
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                for (i in 0 until 4) {
                    val isFilled = i < enteredPin.length
                    Box(
                        modifier = Modifier
                            .size(16.dp)
                            .clip(CircleShape)
                            .background(if (isFilled) DukanGreenPrimary else Slate700)
                    )
                }
            }

            if (errorMessage != null) {
                Spacer(modifier = Modifier.height(14.dp))
                Text(
                    text = errorMessage!!,
                    color = RedDanger,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Spacer(modifier = Modifier.height(36.dp))

            // Numeric Keypad (1 to 9, Clear, 0, Backspace)
            val keypad = listOf(
                listOf("1", "2", "3"),
                listOf("4", "5", "6"),
                listOf("7", "8", "9"),
                listOf("C", "0", "⌫")
            )

            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                keypad.forEach { row ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        row.forEach { key ->
                            Surface(
                                onClick = {
                                    when (key) {
                                        "C" -> {
                                            enteredPin = ""
                                            errorMessage = null
                                        }
                                        "⌫" -> handleDelete()
                                        else -> handleKeyPress(key)
                                    }
                                },
                                shape = CircleShape,
                                color = if (key == "C" || key == "⌫") Slate800 else Slate800.copy(alpha = 0.8f),
                                border = BorderStroke(1.dp, Slate700),
                                modifier = Modifier.size(64.dp)
                            ) {
                                Box(
                                    contentAlignment = Alignment.Center,
                                    modifier = Modifier.fillMaxSize()
                                ) {
                                    if (key == "⌫") {
                                        Icon(
                                            imageVector = Icons.Default.Backspace,
                                            contentDescription = "Backspace",
                                            tint = Slate300,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    } else {
                                        Text(
                                            text = key,
                                            fontSize = 20.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (key == "C") RedDanger else Color.White
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
