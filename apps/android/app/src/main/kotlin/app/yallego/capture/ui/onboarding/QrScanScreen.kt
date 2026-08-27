package app.yallego.capture.ui.onboarding

import android.Manifest
import android.content.pm.PackageManager
import androidx.annotation.OptIn as AndroidxOptIn
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CameraAlt
import androidx.compose.material.icons.rounded.QrCodeScanner
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import app.yallego.capture.R
import app.yallego.capture.ui.components.IconBadge
import app.yallego.capture.ui.components.SupportNote
import app.yallego.capture.ui.components.YallegoBackdrop
import app.yallego.capture.ui.components.YallegoBrandHeader
import app.yallego.capture.ui.components.YallegoCard
import app.yallego.capture.ui.theme.AppBlueBright
import app.yallego.capture.ui.theme.AppCyan
import app.yallego.capture.ui.theme.AppInk
import app.yallego.capture.ui.theme.AppTextSecondary
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage

/**
 * Lee el código QR que muestra el panel (`yallego://pair?code=XXXX-XXXX`).
 * El permiso de cámara se solicita desde `MainActivity` antes de navegar aquí.
 */
@Composable
@AndroidxOptIn(markerClass = [ExperimentalGetImage::class])
fun QrScanScreen(onCodeScanned: (String) -> Unit) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED,
        )
    }
    val onCodeScannedState = rememberUpdatedState(onCodeScanned)
    var alreadyReported by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        hasCameraPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED
    }

    if (!hasCameraPermission) {
        CameraPermissionFallback()
        return
    }

    val previewView = remember {
        PreviewView(context).apply {
            scaleType = PreviewView.ScaleType.FILL_CENTER
            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
        }
    }
    val scanner = remember {
        BarcodeScanning.getClient(
            BarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                .build(),
        )
    }

    DisposableEffect(Unit) {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        val executor = ContextCompat.getMainExecutor(context)

        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            val preview = Preview.Builder().build().also {
                it.surfaceProvider = previewView.surfaceProvider
            }
            val analysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .also { analysisUseCase ->
                    analysisUseCase.setAnalyzer(executor) { imageProxy ->
                        val mediaImage = imageProxy.image
                        if (mediaImage == null || alreadyReported) {
                            imageProxy.close()
                            return@setAnalyzer
                        }
                        val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
                        scanner.process(image)
                            .addOnSuccessListener { barcodes ->
                                val value = barcodes.firstOrNull()?.rawValue
                                if (value != null && !alreadyReported) {
                                    alreadyReported = true
                                    onCodeScannedState.value(value)
                                }
                            }
                            .addOnCompleteListener { imageProxy.close() }
                    }
                }

            cameraProvider.unbindAll()
            cameraProvider.bindToLifecycle(
                lifecycleOwner,
                CameraSelector.DEFAULT_BACK_CAMERA,
                preview,
                analysis,
            )
        }, executor)

        onDispose {
            if (cameraProviderFuture.isDone) {
                cameraProviderFuture.get().unbindAll()
            }
            scanner.close()
        }
    }

    Box(Modifier.fillMaxSize()) {
        AndroidView(factory = { previewView }, modifier = Modifier.fillMaxSize())
        ScannerOverlay()
    }
}

@Composable
private fun ScannerOverlay() {
    Box(Modifier.fillMaxSize()) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(210.dp)
                .align(Alignment.TopCenter)
                .background(Brush.verticalGradient(listOf(AppInk.copy(alpha = 0.96f), Color.Transparent))),
        )
        Box(
            Modifier
                .fillMaxWidth()
                .height(250.dp)
                .align(Alignment.BottomCenter)
                .background(Brush.verticalGradient(listOf(Color.Transparent, AppInk.copy(alpha = 0.98f)))),
        )

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.TopCenter)
                .statusBarsPadding()
                .padding(horizontal = 22.dp, vertical = 18.dp),
        ) {
            YallegoBrandHeader(trailingLabel = stringResource(R.string.scanner_label))
            Spacer(Modifier.height(26.dp))
            Text(
                text = stringResource(R.string.scanner_title),
                color = Color.White,
                style = MaterialTheme.typography.headlineMedium,
            )
            Text(
                text = stringResource(R.string.scanner_subtitle),
                color = AppTextSecondary,
                style = MaterialTheme.typography.bodyMedium,
            )
        }

        Canvas(
            modifier = Modifier
                .align(Alignment.Center)
                .fillMaxWidth()
                .height(290.dp)
                .padding(horizontal = 42.dp),
        ) {
            val inset = 4.dp.toPx()
            val corner = 44.dp.toPx()
            val stroke = 4.dp.toPx()
            val left = inset
            val top = inset
            val right = size.width - inset
            val bottom = size.height - inset
            drawRoundRect(
                color = Color.White.copy(alpha = 0.16f),
                topLeft = Offset(left, top),
                size = androidx.compose.ui.geometry.Size(right - left, bottom - top),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(28.dp.toPx()),
                style = Stroke(width = 1.dp.toPx()),
            )
            listOf(
                Offset(left, top) to Offset(left + corner, top),
                Offset(left, top) to Offset(left, top + corner),
                Offset(right, top) to Offset(right - corner, top),
                Offset(right, top) to Offset(right, top + corner),
                Offset(left, bottom) to Offset(left + corner, bottom),
                Offset(left, bottom) to Offset(left, bottom - corner),
                Offset(right, bottom) to Offset(right - corner, bottom),
                Offset(right, bottom) to Offset(right, bottom - corner),
            ).forEach { (start, end) ->
                drawLine(AppCyan, start, end, strokeWidth = stroke, cap = StrokeCap.Round)
            }
            drawLine(
                brush = Brush.horizontalGradient(listOf(Color.Transparent, AppBlueBright, Color.Transparent)),
                start = Offset(left + 18.dp.toPx(), size.height * 0.54f),
                end = Offset(right - 18.dp.toPx(), size.height * 0.54f),
                strokeWidth = 2.dp.toPx(),
            )
        }

        YallegoCard(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(horizontal = 22.dp, vertical = 20.dp)
                .fillMaxWidth(),
            elevated = true,
        ) {
            IconBadge(Icons.Rounded.QrCodeScanner, tint = AppCyan, size = 44)
            Spacer(Modifier.height(12.dp))
            Text(
                text = stringResource(R.string.scanner_hint_title),
                color = Color.White,
                style = MaterialTheme.typography.titleMedium,
            )
            Text(
                text = stringResource(R.string.scanner_hint_body),
                color = AppTextSecondary,
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }
}

@Composable
private fun CameraPermissionFallback() {
    YallegoBackdrop {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(22.dp),
        ) {
            YallegoBrandHeader()
            Spacer(Modifier.weight(1f))
            YallegoCard(modifier = Modifier.fillMaxWidth(), elevated = true) {
                IconBadge(Icons.Rounded.CameraAlt, tint = AppCyan)
                Spacer(Modifier.height(18.dp))
                Text(
                    text = stringResource(R.string.scanner_permission_title),
                    color = Color.White,
                    style = MaterialTheme.typography.headlineSmall,
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    text = stringResource(R.string.scanner_permission_body),
                    color = AppTextSecondary,
                    style = MaterialTheme.typography.bodyLarge,
                )
            }
            Spacer(Modifier.height(18.dp))
            SupportNote(
                text = stringResource(R.string.scanner_private_note),
                icon = Icons.Rounded.Shield,
            )
            Spacer(Modifier.weight(1f))
        }
    }
}
