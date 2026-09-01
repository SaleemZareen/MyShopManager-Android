package com.saleemkhan.myshopmanager.ui.components

import androidx.compose.foundation.basicMarquee
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.TextUnit

@Composable
fun AutoScrollText(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = Color.Unspecified,
    fontSize: TextUnit = TextUnit.Unspecified,
    fontWeight: FontWeight? = null,
    style: TextStyle = TextStyle.Default,
    textAlign: TextAlign? = null
) {
    Text(
        text = text,
        modifier = modifier.basicMarquee(
            iterations = Int.MAX_VALUE,
            repeatDelayMillis = 1200
        ),
        color = color,
        fontSize = fontSize,
        fontWeight = fontWeight,
        style = style,
        textAlign = textAlign,
        maxLines = 1
    )
}
