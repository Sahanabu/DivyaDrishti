package com.example.saferideai.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun OnboardingScreen(onFinish: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Default.Security,
                contentDescription = "Security Illustration",
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(150.dp)
            )
            
            Spacer(modifier = Modifier.height(48.dp))
            
            Text(
                text = "AI Crash Detection",
                color = MaterialTheme.colorScheme.onBackground,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                text = "This app detects severe impacts and calls help immediately. \nNo manual action required in danger.",
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f),
                fontSize = 18.sp,
                textAlign = TextAlign.Center,
                lineHeight = 24.sp
            )
            
            Spacer(modifier = Modifier.height(64.dp))
            
            Button(
                onClick = onFinish,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(60.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            ) {
                Text(
                    text = "Get Started", 
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimary
                )
                Spacer(modifier = Modifier.width(8.dp))
                Icon(
                    imageVector = Icons.Default.ArrowForward,
                    contentDescription = "Arrow",
                    tint = MaterialTheme.colorScheme.onPrimary
                )
            }
        }
    }
}
