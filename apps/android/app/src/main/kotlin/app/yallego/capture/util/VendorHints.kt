package app.yallego.capture.util

import android.os.Build

/** docs/08_UX_FLUJOS.md §4.1: fabricantes que requieren configuración adicional. */
enum class Vendor {
    XIAOMI, HUAWEI, OPPO, VIVO, SAMSUNG, OTHER
}

data class VendorGuidance(val vendor: Vendor, val instructions: List<String>)

object VendorHints {

    fun detect(manufacturer: String = Build.MANUFACTURER, brand: String = Build.BRAND): Vendor {
        val signature = "$manufacturer $brand".lowercase()
        return when {
            listOf("xiaomi", "redmi", "poco").any { it in signature } -> Vendor.XIAOMI
            listOf("huawei", "honor").any { it in signature } -> Vendor.HUAWEI
            listOf("oppo", "realme", "oneplus").any { it in signature } -> Vendor.OPPO
            "vivo" in signature -> Vendor.VIVO
            "samsung" in signature -> Vendor.SAMSUNG
            else -> Vendor.OTHER
        }
    }

    fun guidanceFor(vendor: Vendor): VendorGuidance? = when (vendor) {
        Vendor.XIAOMI -> VendorGuidance(
            vendor,
            listOf(
                "Activa \"Inicio automático\" para Yallegó en Ajustes > Aplicaciones > Permisos.",
                "Abre la vista de aplicaciones recientes y bloquea Yallegó con el ícono de candado.",
            ),
        )
        Vendor.HUAWEI -> VendorGuidance(
            vendor,
            listOf("Activa la gestión manual de inicio para Yallegó en Ajustes > Batería > Inicio de aplicaciones."),
        )
        Vendor.OPPO -> VendorGuidance(
            vendor,
            listOf(
                "Activa el permiso de inicio automático para Yallegó.",
                "Desactiva la congelación en segundo plano para Yallegó.",
            ),
        )
        Vendor.VIVO -> VendorGuidance(
            vendor,
            listOf(
                "Permite el consumo de batería en segundo plano para Yallegó.",
                "Activa el inicio automático para Yallegó.",
            ),
        )
        Vendor.SAMSUNG -> VendorGuidance(
            vendor,
            listOf("Excluye a Yallegó de la suspensión profunda en Ajustes > Batería > Límites de uso en segundo plano."),
        )
        Vendor.OTHER -> null
    }
}
