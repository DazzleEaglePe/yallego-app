// Repositorio raíz del proyecto Android. Deliberadamente fuera del
// orquestador de pnpm/Turborepo (docs/11_ESTRUCTURA_PROYECTO.md §1): se
// compila con su propia herramienta.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.ksp) apply false
    alias(libs.plugins.hilt) apply false
}
