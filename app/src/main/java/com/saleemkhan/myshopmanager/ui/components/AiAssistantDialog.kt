package com.saleemkhan.myshopmanager.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.saleemkhan.myshopmanager.model.AppState
import com.saleemkhan.myshopmanager.ui.theme.*
import com.saleemkhan.myshopmanager.utils.FormatUtils
import com.saleemkhan.myshopmanager.utils.TaxEngine

data class ChatMessage(
    val sender: String, // "AI" or "USER"
    val message: String
)

@Composable
fun AiAssistantDialog(
    isOpen: Boolean,
    onClose: () -> Unit,
    state: AppState,
    isUrdu: Boolean
) {
    if (!isOpen) return

    val taxSummary = remember(state) { TaxEngine.calculateFbrSummary(state) }
    val totalSales = remember(state.transactions) {
        state.transactions.filter { it.type == com.saleemkhan.myshopmanager.model.TransactionType.SALE }.sumOf { it.amount }
    }
    val totalUdhaar = remember(state.customers) {
        state.customers.sumOf { it.totalCredit }
    }

    val initialAdvisorMessage = if (isUrdu) {
        """
        السلام علیکم! میں آپ کا اسمارٹ شاپ اے آئی ایڈوائزر ہوں۔
        
        📊 **آپ کی دکان کا تازہ جائزہ:**
        • کل فروخت: ${FormatUtils.formatCurrency(totalSales)}
        • واجب الوصول ادھار: ${FormatUtils.formatCurrency(totalUdhaar)}
        • تخمینہ شدہ نیٹ منافع: ${FormatUtils.formatCurrency(taxSummary.netProfit ?: 0.0)}
        
        💡 **کاروباری مشورہ:**
        ${if (totalUdhaar > 20000) "آپ کے ادھار کی رقم زیادہ ہو رہی ہے۔ کسٹمرز کو خودکار واٹس ایپ ریمائنڈرز بھیج کر فوری وصولی یقینی بنائیں۔" else "آپ کے کھاتے اور کیش فلو کی صورتحال بہترین اور متوازن ہے۔"}
        """.trimIndent()
    } else {
        """
        Assalam-o-Alaikum! I am your AI Smart Shop Business Advisor.
        
        📊 **Store Financial Health:**
        • Total Sales: ${FormatUtils.formatCurrency(totalSales)}
        • Outstanding Udhaar: ${FormatUtils.formatCurrency(totalUdhaar)}
        • Estimated Net Profit: ${FormatUtils.formatCurrency(taxSummary.netProfit ?: 0.0)}
        
        💡 **Actionable Recommendation:**
        ${if (totalUdhaar > 20000) "Your customer receivables are high. Send polite payment reminders to maintain healthy working capital." else "Your cash flow and inventory turnover are well balanced."}
        """.trimIndent()
    }

    var messages by remember {
        mutableStateOf(listOf(ChatMessage(sender = "AI", message = initialAdvisorMessage)))
    }
    var promptInput by remember { mutableStateOf("") }

    fun sendMessage() {
        val userText = promptInput.trim()
        if (userText.isBlank()) return

        val newMsgList = messages + ChatMessage(sender = "USER", message = userText)
        promptInput = ""

        val aiReply = if (isUrdu) {
            when {
                userText.contains("منافع") || userText.contains("profit") -> "آپ کی دکان کا موجودہ خالص منافع تقریباً ${FormatUtils.formatCurrency(taxSummary.netProfit ?: 0.0)} بن رہا ہے۔ اخراجات کم رکھ کر اسے مزید بڑھایا جا سکتا ہے۔"
                userText.contains("ادھار") || userText.contains("udhaar") -> "کسٹمرز کے ذمے کل بقایا ادھار ${FormatUtils.formatCurrency(totalUdhaar)} ہے۔ ادھار کی حد 10,000 روپے تک محدود رکھیں۔"
                userText.contains("ٹیکس") || userText.contains("fbr") -> "آپ کا تخمینہ شدہ انکم ٹیکس ${FormatUtils.formatCurrency(taxSummary.estimatedIncomeTax)} ہے۔ برائے مہربانی سالانہ گوشوارے وقت پر جمع کروائیں۔"
                else -> "آپ کا کاروباری ماڈل مستحکم ہے۔ میں تجویز کروں گا کہ روزانہ کی بنیاد پر اسٹاک اور کیش کا تقابل جاری رکھیں۔"
            }
        } else {
            when {
                userText.lowercase().contains("profit") -> "Your estimated net profit stands at ${FormatUtils.formatCurrency(taxSummary.netProfit ?: 0.0)}. Keep operational overheads lean to maximize ROI."
                userText.lowercase().contains("udhaar") || userText.lowercase().contains("credit") -> "Total outstanding customer credit is ${FormatUtils.formatCurrency(totalUdhaar)}. Establish firm payment cycles."
                userText.lowercase().contains("tax") || userText.lowercase().contains("fbr") -> "Your estimated annual tax is ${FormatUtils.formatCurrency(taxSummary.estimatedIncomeTax)}. Ensure proper withholding challans."
                else -> "Your current retail performance is robust. Maintain daily end-of-day cash reconciliation."
            }
        }

        messages = newMsgList + ChatMessage(sender = "AI", message = aiReply)
    }

    Dialog(onDismissRequest = onClose) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .background(
                                    Brush.linearGradient(listOf(DukanGreenPrimary, DukanGreenHover)),
                                    CircleShape
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.SmartToy,
                                contentDescription = "AI",
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isUrdu) "اے آئی بزنس ایڈوائزر" else "AI Business Advisor",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Slate900
                        )
                    }
                    IconButton(onClick = onClose, modifier = Modifier.size(28.dp)) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = Slate500)
                    }
                }

                // Chat Messages List
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(280.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(messages) { msg ->
                        val isAi = msg.sender == "AI"
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = if (isAi) Arrangement.Start else Arrangement.End
                        ) {
                            Card(
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isAi) Color(0xFFF0FDF4) else Color(0xFFEFF6FF)
                                ),
                                border = BorderStroke(
                                    1.dp,
                                    if (isAi) Color(0xFFBBF7D0) else Color(0xFFBFDBFE)
                                ),
                                modifier = Modifier.widthIn(max = 280.dp)
                            ) {
                                Text(
                                    text = msg.message,
                                    fontSize = 12.sp,
                                    lineHeight = 17.sp,
                                    color = if (isAi) Color(0xFF14532D) else Color(0xFF1E3A8A),
                                    modifier = Modifier.padding(10.dp)
                                )
                            }
                        }
                    }
                }

                // Prompt Input Box
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = promptInput,
                        onValueChange = { promptInput = it },
                        placeholder = {
                            Text(
                                if (isUrdu) "کوئی بھی کاروباری سوال پوچھیں..." else "Ask any business question...",
                                fontSize = 12.sp
                            )
                        },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(
                        onClick = { sendMessage() },
                        modifier = Modifier
                            .size(42.dp)
                            .background(DukanGreenPrimary, CircleShape)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Send,
                            contentDescription = "Send",
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }
    }
}
