package com.saleemkhan.myshopmanager.ui.components

import android.app.Activity
import android.content.Intent
import android.speech.RecognizerIntent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.saleemkhan.myshopmanager.model.*
import com.saleemkhan.myshopmanager.ui.theme.*
import com.saleemkhan.myshopmanager.utils.FormatUtils
import java.util.Locale

@Composable
fun VoiceEntryDialog(
    isOpen: Boolean,
    onClose: () -> Unit,
    onSubmit: (Transaction) -> Unit,
    isUrdu: Boolean
) {
    if (!isOpen) return

    var spokenText by remember { mutableStateOf("") }
    var parsedType by remember { mutableStateOf(TransactionType.SALE) }
    var parsedAmount by remember { mutableStateOf<Double?>(null) }
    var parsedParty by remember { mutableStateOf<String?>(null) }

    fun parseSpokenInput(text: String) {
        spokenText = text
        val lower = text.lowercase(Locale.ROOT)

        // Type Detection
        when {
            lower.contains("sale") || lower.contains("فروخت") || lower.contains("بیچا") || lower.contains("sale ki") -> {
                parsedType = TransactionType.SALE
            }
            lower.contains("purchase") || lower.contains("خرید") || lower.contains("لایا") || lower.contains("maal") -> {
                parsedType = TransactionType.PURCHASE
            }
            lower.contains("expense") || lower.contains("خرچہ") || lower.contains("بل") || lower.contains("kiraya") -> {
                parsedType = TransactionType.EXPENSE
            }
            lower.contains("wasooli") || lower.contains("وصولی") || lower.contains("udhaar mila") -> {
                parsedType = TransactionType.RECEIPT
            }
            lower.contains("adaigi") || lower.contains("ادائیگی") || lower.contains("supplier") -> {
                parsedType = TransactionType.PAYMENT
            }
        }

        // Amount Number Extraction
        val numberRegex = "\\b\\d+(\\.\\d+)?\\b".toRegex()
        val match = numberRegex.find(lower)
        parsedAmount = match?.value?.toDoubleOrNull()

        // Name heuristics (words before/after rupee or sale)
        val cleanWords = text.split(" ").filter { it.length > 2 && !it.matches("\\d+".toRegex()) }
        parsedParty = cleanWords.firstOrNull { 
            it.lowercase() !in listOf("rupay", "hazaar", "sale", "purchase", "expense", "roopay", "rs", "ka", "ki", "ko")
        }
    }

    val speechRecognizerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val spokenResults = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            val recognized = spokenResults?.firstOrNull() ?: ""
            if (recognized.isNotBlank()) {
                parseSpokenInput(recognized)
            }
        }
    }

    fun startListening() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, if (isUrdu) "ur-PK" else "en-US")
            putExtra(RecognizerIntent.EXTRA_PROMPT, if (isUrdu) "بولیں: مثال 'علی کو 500 کا سامان بیچا'" else "Speak: e.g. 'Sold items worth 500 to Ali'")
        }
        try {
            speechRecognizerLauncher.launch(intent)
        } catch (e: Exception) {
            spokenText = if (isUrdu) "وائس ریکگنیشن کی سہولت دستیاب نہیں" else "Speech recognition not available on device"
        }
    }

    Dialog(onDismissRequest = onClose) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (isUrdu) "وائس اسمارٹ اینٹری" else "Voice Smart Entry",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = Slate900
                    )
                    IconButton(onClick = onClose, modifier = Modifier.size(28.dp)) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = Slate500)
                    }
                }

                Text(
                    text = if (isUrdu) 
                        "مائیک دبائیں اور بولیں، جیسے:\n\"احمد کو 1200 روپے کا مال بیچا\" یا \"بجلی کا بل 4500 دیا\""
                    else 
                        "Press mic and speak naturally, e.g.:\n'Sold 1200 items to Ahmed' or 'Paid 4500 electricity bill'",
                    fontSize = 12.sp,
                    color = Slate600,
                    textAlign = TextAlign.Center
                )

                // Big Mic Button
                Surface(
                    onClick = { startListening() },
                    shape = CircleShape,
                    color = DukanGreenPrimary,
                    shadowElevation = 6.dp,
                    modifier = Modifier.size(72.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.Mic,
                            contentDescription = "Mic",
                            tint = Color.White,
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }

                // Recognized & Parsed Preview Card
                if (spokenText.isNotBlank()) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                        border = BorderStroke(1.dp, Slate200)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = if (isUrdu) "بولے گئے الفاظ:" else "Recognized Speech:",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Slate500
                            )
                            Text(
                                text = "\"$spokenText\"",
                                fontSize = 13.sp,
                                color = Slate900,
                                fontWeight = FontWeight.Medium
                            )

                            Divider(color = Slate200, modifier = Modifier.padding(vertical = 4.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "${if (isUrdu) "قسم:" else "Type:"} ${parsedType.name}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = DukanGreenHover
                                )
                                Text(
                                    text = "${if (isUrdu) "رقم:" else "Amount:"} Rs. ${parsedAmount?.toInt() ?: 0}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF2563EB)
                                )
                            }
                        }
                    }
                }

                // Submit Button
                Button(
                    onClick = {
                        val amount = parsedAmount ?: 0.0
                        if (amount > 0) {
                            val tx = Transaction(
                                id = "tx_${System.currentTimeMillis()}",
                                type = parsedType,
                                amount = amount,
                                category = if (parsedType == TransactionType.EXPENSE) "Voice Expense" else "General",
                                paymentMethod = PaymentMethod.CASH,
                                partyName = parsedParty ?: (if (isUrdu) "وائس کسٹمر" else "Voice Customer"),
                                date = FormatUtils.getTodayIsoDate(),
                                notes = "Voice Entry: $spokenText"
                            )
                            onSubmit(tx)
                            onClose()
                        }
                    },
                    enabled = (parsedAmount ?: 0.0) > 0,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = DukanGreenPrimary),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                ) {
                    Text(
                        text = if (isUrdu) "اینٹری کنفرم کریں" else "Confirm & Save Entry",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}
