# Kotlinx Serialization conserva los serializadores generados por el compilador.
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclasseswithmembers class app.yallego.capture.data.remote.dto.**$$serializer { *; }
-keepclassmembers class app.yallego.capture.data.remote.dto.** {
    *** Companion;
}
-keepclasseswithmembers class app.yallego.capture.data.remote.dto.** {
    kotlinx.serialization.KSerializer serializer(...);
}
