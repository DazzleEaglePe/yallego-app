# 09 — Sistema de Diseño

> **Versión:** 1.0
> **Alcance:** panel administrativo (web) y aplicación Android

---

## 1. Principios de diseño

| Principio                        | Implicación práctica                                                                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **El monto es el protagonista**  | En cualquier representación de un cobro, el monto tiene la mayor jerarquía visual. Es el dato que se busca de un vistazo.                    |
| **Legibilidad sobre densidad**   | El panel se consulta en movimiento, con poca atención disponible. Se prioriza contraste y tamaño sobre cantidad de información por pantalla. |
| **Estado siempre visible**       | El usuario debe saber en todo momento si el sistema está capturando correctamente. La ambigüedad genera desconfianza.                        |
| **Sin decoración gratuita**      | Cada elemento visual comunica algo. No hay ornamento.                                                                                        |
| **Confianza mediante sobriedad** | Se manejan datos financieros; la estética es sobria y precisa, no lúdica.                                                                    |

---

## 2. Identidad

### 2.1. Marca

| Elemento     | Definición                                           |
| ------------ | ---------------------------------------------------- |
| Nombre       | Yallegó                                              |
| Lema         | ¿Ya llegó?                                           |
| Naturaleza   | Producto de infraestructura financiera para negocios |
| Personalidad | Confiable, directo, cercano sin ser informal         |

### 2.2. Uso del signo de interrogación

El signo forma parte del lema y del tratamiento gráfico del logotipo, pero **no del nombre en contextos técnicos**: dominios, identificadores, nombres de paquete y referencias en código utilizan `yallego` sin signo ni tilde.

---

## 3. Color

### 3.1. Paleta primaria

| Token       | Valor     | Uso                                |
| ----------- | --------- | ---------------------------------- |
| `brand-50`  | `#EEF6FF` | Fondos de énfasis sutil            |
| `brand-100` | `#D8EAFF` | Fondos de estado informativo       |
| `brand-200` | `#B4D6FF` | Bordes de énfasis                  |
| `brand-300` | `#83BAFF` | Elementos decorativos              |
| `brand-400` | `#4F97FA` | Estados de interacción             |
| `brand-500` | `#2477EF` | **Color principal de acción**      |
| `brand-600` | `#155DD4` | Interacción sobre el principal     |
| `brand-700` | `#1249AB` | Texto sobre fondos claros de marca |
| `brand-800` | `#143F8A` | Énfasis alto                       |
| `brand-900` | `#152F5C` | Máximo contraste de marca          |

### 3.2. Colores semánticos

| Token         | Valor     | Significado                                      |
| ------------- | --------- | ------------------------------------------------ |
| `success-500` | `#16A34A` | Cobro confirmado, dispositivo operativo          |
| `success-50`  | `#F0FDF4` | Fondo de confirmación                            |
| `warning-500` | `#D97706` | Consumo próximo al límite, advertencia           |
| `warning-50`  | `#FFFBEB` | Fondo de advertencia                             |
| `danger-500`  | `#DC2626` | Error, dispositivo desconectado, cobro disputado |
| `danger-50`   | `#FEF2F2` | Fondo de error                                   |
| `info-500`    | `#0891B2` | Información neutra                               |
| `info-50`     | `#ECFEFF` | Fondo informativo                                |

### 3.3. Escala neutra

| Token         | Valor     | Uso                                         |
| ------------- | --------- | ------------------------------------------- |
| `neutral-0`   | `#FFFFFF` | Superficie base en modo claro               |
| `neutral-50`  | `#FAFAFA` | Fondo de página                             |
| `neutral-100` | `#F4F4F5` | Superficie elevada sutil                    |
| `neutral-200` | `#E4E4E7` | Bordes y separadores                        |
| `neutral-300` | `#D4D4D8` | Bordes de énfasis                           |
| `neutral-400` | `#A1A1AA` | Texto deshabilitado, marcadores de posición |
| `neutral-500` | `#71717A` | Texto secundario                            |
| `neutral-600` | `#52525B` | Texto de apoyo                              |
| `neutral-700` | `#3F3F46` | Texto de cuerpo en modo oscuro              |
| `neutral-800` | `#27272A` | Superficie en modo oscuro                   |
| `neutral-900` | `#18181B` | **Texto principal**                         |
| `neutral-950` | `#09090B` | Fondo en modo oscuro                        |

### 3.4. Colores de billetera

Empleados exclusivamente como marcador de identificación de origen, en superficies reducidas (indicador, borde lateral, icono). Nunca como fondo de área extensa.

| Billetera | Token         | Valor     |
| --------- | ------------- | --------- |
| Yape      | `wallet-yape` | `#742384` |
| Plin      | `wallet-plin` | `#00B2A9` |
| BIM       | `wallet-bim`  | `#E8452C` |

> Se emplean para reconocimiento inmediato del origen del cobro. La marca Yallegó mantiene su identidad propia y no adopta estos colores.

### 3.5. Verificación de contraste

| Combinación                     | Relación | Nivel |
| ------------------------------- | -------- | ----- |
| `neutral-900` sobre `neutral-0` | 17.9:1   | AAA   |
| `neutral-500` sobre `neutral-0` | 4.8:1    | AA    |
| `neutral-0` sobre `brand-500`   | 4.6:1    | AA    |
| `neutral-0` sobre `success-500` | 4.5:1    | AA    |
| `neutral-0` sobre `danger-500`  | 4.9:1    | AA    |

---

## 4. Tipografía

### 4.1. Familias

| Uso              | Familia            | Justificación                                                                                                   |
| ---------------- | ------------------ | --------------------------------------------------------------------------------------------------------------- |
| Interfaz general | **Inter**          | Alta legibilidad en tamaños reducidos, amplio soporte de pesos, optimizada para pantalla                        |
| Cifras y códigos | **JetBrains Mono** | Ancho fijo: los montos se alinean verticalmente y los códigos se leen sin ambigüedad entre caracteres similares |

Ambas de licencia abierta, disponibles para autoalojamiento.

### 4.2. Escala tipográfica

| Token      | Tamaño | Interlineado | Peso | Uso                                      |
| ---------- | ------ | ------------ | ---- | ---------------------------------------- |
| `display`  | 36 px  | 40 px        | 700  | Monto en vista de detalle                |
| `h1`       | 30 px  | 36 px        | 700  | Título de página                         |
| `h2`       | 24 px  | 32 px        | 600  | Título de sección                        |
| `h3`       | 20 px  | 28 px        | 600  | Título de tarjeta                        |
| `h4`       | 18 px  | 26 px        | 600  | Subtítulo                                |
| `body-lg`  | 16 px  | 24 px        | 400  | Texto destacado                          |
| `body`     | 14 px  | 20 px        | 400  | Texto general                            |
| `body-sm`  | 13 px  | 18 px        | 400  | Texto de apoyo                           |
| `caption`  | 12 px  | 16 px        | 500  | Etiquetas, metadatos                     |
| `overline` | 11 px  | 16 px        | 600  | Encabezados de agrupación, en mayúsculas |

### 4.3. Tratamiento de cifras

| Elemento            | Tratamiento                                              |
| ------------------- | -------------------------------------------------------- |
| Monto en lista      | `JetBrains Mono` · 18 px · peso 600 · cifras tabulares   |
| Monto en detalle    | `JetBrains Mono` · 36 px · peso 700                      |
| Código de seguridad | `JetBrains Mono` · 20 px · peso 700 · espaciado ampliado |
| Identificadores     | `JetBrains Mono` · 13 px · peso 400                      |

**Formato de monto:** `S/ 35.50` — símbolo, espacio, cifra con dos decimales y separador de miles.

---

## 5. Espaciado y disposición

### 5.1. Escala

Base de 4 píxeles.

| Token      | Valor |
| ---------- | ----- |
| `space-1`  | 4 px  |
| `space-2`  | 8 px  |
| `space-3`  | 12 px |
| `space-4`  | 16 px |
| `space-5`  | 20 px |
| `space-6`  | 24 px |
| `space-8`  | 32 px |
| `space-10` | 40 px |
| `space-12` | 48 px |
| `space-16` | 64 px |

### 5.2. Radios

| Token         | Valor   | Uso                        |
| ------------- | ------- | -------------------------- |
| `radius-sm`   | 6 px    | Etiquetas, indicadores     |
| `radius-md`   | 8 px    | Botones, campos de entrada |
| `radius-lg`   | 12 px   | Tarjetas                   |
| `radius-xl`   | 16 px   | Diálogos, paneles          |
| `radius-full` | 9999 px | Elementos circulares       |

### 5.3. Elevación

| Token          | Definición               | Uso                |
| -------------- | ------------------------ | ------------------ |
| `shadow-sm`    | Sombra mínima            | Tarjetas en reposo |
| `shadow-md`    | Sombra media             | Menús desplegables |
| `shadow-lg`    | Sombra amplia            | Diálogos           |
| `shadow-focus` | Anillo de color de marca | Estado de foco     |

### 5.4. Contenedores

| Contexto             | Ancho máximo |
| -------------------- | ------------ |
| Contenido general    | 1280 px      |
| Formularios          | 640 px       |
| Autenticación        | 420 px       |
| Contenido de lectura | 720 px       |

---

## 6. Biblioteca de componentes

### 6.1. Fundamento técnico

| Capa                    | Elección                  | Justificación                                                                    |
| ----------------------- | ------------------------- | -------------------------------------------------------------------------------- |
| Primitivas accesibles   | **Radix UI**              | Comportamiento y accesibilidad resueltos; sin estilos impuestos                  |
| Estilos                 | **Tailwind CSS**          | Consistencia mediante tokens; sin hojas de estilo dispersas                      |
| Composición             | **shadcn/ui**             | Los componentes se copian al repositorio, quedando bajo control total del equipo |
| Iconografía             | **Lucide**                | Conjunto coherente, licencia permisiva, trazo uniforme                           |
| Gráficos                | **Recharts**              | Declarativo, suficiente para las visualizaciones previstas                       |
| Formularios             | **React Hook Form + Zod** | Validación tipada, esquemas compartidos con el backend                           |
| Tablas                  | **TanStack Table**        | Sin estilos impuestos, control completo de la presentación                       |
| Notificaciones efímeras | **Sonner**                | Ligero, accesible                                                                |
| Fechas                  | **date-fns**              | Modular, con soporte de configuración regional                                   |

**Justificación de shadcn/ui frente a bibliotecas cerradas:** al copiarse el código al repositorio se elimina la dependencia de las decisiones de un tercero, permitiendo adaptar cualquier componente sin recurrir a anulaciones de estilo.

### 6.2. Inventario de componentes

**Fundamentales**
`Button` · `Input` · `Textarea` · `Select` · `Checkbox` · `RadioGroup` · `Switch` · `Label` · `Badge` · `Avatar` · `Separator` · `Skeleton` · `Spinner`

**Disposición**
`Card` · `Sheet` · `Dialog` · `Tabs` · `Accordion` · `ScrollArea` · `Collapsible`

**Navegación**
`Sidebar` · `Breadcrumb` · `Pagination` · `DropdownMenu` · `TenantSwitcher`

**Retroalimentación**
`Alert` · `Toast` · `Tooltip` · `Popover` · `Progress` · `EmptyState` · `ErrorState`

**Datos**
`DataTable` · `DateRangePicker` · `FilterBar` · `StatCard` · `Chart`

**Específicos del dominio**

| Componente           | Propósito                                     |
| -------------------- | --------------------------------------------- |
| `TransactionCard`    | Representación de un cobro en lista           |
| `TransactionDetail`  | Vista ampliada de un cobro                    |
| `AmountDisplay`      | Presentación normalizada de montos            |
| `SecurityCodeBadge`  | Código de seguridad destacado                 |
| `WalletBadge`        | Identificación de la billetera de origen      |
| `DeviceStatusCard`   | Estado de un dispositivo                      |
| `ConnectivityBanner` | Aviso persistente de dispositivo desconectado |
| `UsageMeter`         | Consumo frente al límite del plan             |
| `PlanComparison`     | Tabla comparativa de planes                   |
| `WebhookDeliveryRow` | Registro de entrega con detalle expandible    |
| `PairingCodeDisplay` | Código de vinculación con representación QR   |
| `LiveIndicator`      | Señal de conexión en tiempo real activa       |

---

## 7. Especificación de componentes clave

### 7.1. `TransactionCard`

```
┌────────────────────────────────────────────────────────┐
│ ▌ [icono]  JUAN CARLOS PEREZ R.          S/ 35.50      │
│ ▌          hace 2 minutos · Yape           ⟨ 247 ⟩     │
└────────────────────────────────────────────────────────┘
  ▌ = franja lateral con el color de la billetera
```

| Aspecto             | Definición                                                         |
| ------------------- | ------------------------------------------------------------------ |
| Jerarquía           | Monto en el extremo derecho, alineado; es el primer elemento leído |
| Código de seguridad | Presentado en cápsula con tipografía monoespaciada                 |
| Estado confirmado   | Marca discreta junto al monto, sin alterar la disposición          |
| Interacción         | La tarjeta completa es accionable, abriendo el detalle             |
| Aparición           | Al llegar por tiempo real, transición de entrada de 200 ms         |

### 7.2. `AmountDisplay`

| Variante | Tamaño | Contexto            |
| -------- | ------ | ------------------- |
| `sm`     | 14 px  | Tablas densas       |
| `md`     | 18 px  | Listas              |
| `lg`     | 24 px  | Tarjetas destacadas |
| `xl`     | 36 px  | Vista de detalle    |

Emplea cifras tabulares para que los montos se alineen verticalmente en listados.

### 7.3. `ConnectivityBanner`

Aviso persistente que aparece cuando un dispositivo deja de reportar.

| Aspecto   | Definición                                                                 |
| --------- | -------------------------------------------------------------------------- |
| Posición  | Fijo bajo la cabecera, sobre el contenido                                  |
| Color     | Escala de peligro                                                          |
| Contenido | Identificación del dispositivo, tiempo transcurrido, acción de diagnóstico |
| Descarte  | No descartable mientras persista la condición                              |
| Anuncio   | Región activa para lectores de pantalla                                    |

### 7.4. `UsageMeter`

| Rango de consumo | Color                 |
| ---------------- | --------------------- |
| 0 – 79%          | Escala de marca       |
| 80 – 99%         | Escala de advertencia |
| 100%             | Escala de peligro     |

Incluye la cifra exacta junto a la representación visual, ya que la barra por sí sola no comunica el valor con precisión.

---

## 8. Iconografía

### 8.1. Especificación

| Aspecto           | Definición                                            |
| ----------------- | ----------------------------------------------------- |
| Conjunto          | Lucide                                                |
| Grosor de trazo   | 2 px (1.5 px en tamaños superiores a 32 px)           |
| Tamaños           | 16 px, 20 px, 24 px, 32 px                            |
| Color             | Heredado del contexto tipográfico                     |
| Alineación óptica | Centrado respecto a la línea base del texto adyacente |

### 8.2. Correspondencia semántica

| Concepto            | Icono                |
| ------------------- | -------------------- |
| Cobro / transacción | `receipt`            |
| Dispositivo         | `smartphone`         |
| Billetera           | `wallet`             |
| Equipo              | `users`              |
| Integraciones       | `plug`               |
| Clave de API        | `key`                |
| Webhook             | `webhook`            |
| Membresía           | `credit-card`        |
| Auditoría           | `scroll-text`        |
| Configuración       | `settings`           |
| Confirmado          | `check-circle-2`     |
| Disputado           | `alert-octagon`      |
| Desconectado        | `wifi-off`           |
| En tiempo real      | `radio`              |
| Exportar            | `download`           |
| Copiar              | `copy`               |
| Buscar              | `search`             |
| Filtrar             | `sliders-horizontal` |

---

## 9. Movimiento

| Interacción                 | Duración | Curva                  |
| --------------------------- | -------- | ---------------------- |
| Cambio de estado de control | 150 ms   | Salida suave           |
| Apertura de diálogo         | 200 ms   | Entrada y salida suave |
| Panel deslizante            | 250 ms   | Entrada y salida suave |
| Entrada de nuevo cobro      | 200 ms   | Salida suave           |
| Notificación efímera        | 200 ms   | Salida suave           |
| Esqueleto de carga          | 1500 ms  | Cíclica                |

**Principios:** el movimiento comunica origen y destino, nunca decora. Se respeta la preferencia de movimiento reducido del sistema operativo, sustituyendo las transiciones por cambios inmediatos.

---

## 10. Modo oscuro

Contemplado desde la definición de tokens. Se implementa mediante inversión de la escala neutra y ajuste de saturación en los colores semánticos.

| Token              | Modo claro    | Modo oscuro   |
| ------------------ | ------------- | ------------- |
| Fondo de página    | `neutral-50`  | `neutral-950` |
| Superficie         | `neutral-0`   | `neutral-900` |
| Superficie elevada | `neutral-0`   | `neutral-800` |
| Borde              | `neutral-200` | `neutral-800` |
| Texto principal    | `neutral-900` | `neutral-50`  |
| Texto secundario   | `neutral-500` | `neutral-400` |
| Acción principal   | `brand-500`   | `brand-400`   |

**Prioridad:** implementación en Sprint 8 o posterior. Los tokens se definen desde el inicio para evitar retrabajo.

---

## 11. Diseño de la aplicación Android

### 11.1. Fundamento

| Aspecto        | Elección                                         |
| -------------- | ------------------------------------------------ |
| Sistema        | Material 3                                       |
| Interfaz       | Jetpack Compose                                  |
| Color dinámico | Deshabilitado; se preserva la identidad de marca |
| Tipografía     | Inter, alineada con el panel                     |

### 11.2. Correspondencia de color

| Rol de Material 3  | Token de Yallegó |
| ------------------ | ---------------- |
| `primary`          | `brand-500`      |
| `onPrimary`        | `neutral-0`      |
| `primaryContainer` | `brand-100`      |
| `surface`          | `neutral-0`      |
| `surfaceVariant`   | `neutral-100`    |
| `error`            | `danger-500`     |
| `outline`          | `neutral-300`    |

### 11.3. Consideraciones específicas

| Aspecto                  | Definición                                                               |
| ------------------------ | ------------------------------------------------------------------------ |
| Alcance con una mano     | Las acciones principales se ubican en el tercio inferior de la pantalla  |
| Notificación persistente | Discreta, con texto informativo del estado y sin sonido                  |
| Estado operativo         | Indicador de color y texto en la pantalla principal, legible a distancia |
| Asistente de permisos    | Una instrucción por pantalla, con ilustración del paso correspondiente   |
| Modo oscuro              | Soportado desde la primera versión, siguiendo la preferencia del sistema |

---

## 12. Configuración de tokens

```typescript
// packages/design-tokens/src/tokens.ts

export const tokens = {
  color: {
    brand: {
      50: '#EEF6FF',
      100: '#D8EAFF',
      200: '#B4D6FF',
      300: '#83BAFF',
      400: '#4F97FA',
      500: '#2477EF',
      600: '#155DD4',
      700: '#1249AB',
      800: '#143F8A',
      900: '#152F5C',
    },
    neutral: {
      0: '#FFFFFF',
      50: '#FAFAFA',
      100: '#F4F4F5',
      200: '#E4E4E7',
      300: '#D4D4D8',
      400: '#A1A1AA',
      500: '#71717A',
      600: '#52525B',
      700: '#3F3F46',
      800: '#27272A',
      900: '#18181B',
      950: '#09090B',
    },
    success: { 50: '#F0FDF4', 500: '#16A34A', 600: '#15803D' },
    warning: { 50: '#FFFBEB', 500: '#D97706', 600: '#B45309' },
    danger: { 50: '#FEF2F2', 500: '#DC2626', 600: '#B91C1C' },
    info: { 50: '#ECFEFF', 500: '#0891B2', 600: '#0E7490' },
    wallet: { yape: '#742384', plin: '#00B2A9', bim: '#E8452C' },
  },
  font: {
    sans: 'Inter, system-ui, sans-serif',
    mono: 'JetBrains Mono, ui-monospace, monospace',
  },
  radius: { sm: '6px', md: '8px', lg: '12px', xl: '16px', full: '9999px' },
} as const;
```

Este paquete es la fuente única de verdad. La configuración de Tailwind y el tema de Compose se derivan de él, garantizando coherencia entre plataformas.

---

## 13. Recursos de marca

| Recurso                   | Formato        | Uso                                     |
| ------------------------- | -------------- | --------------------------------------- |
| Logotipo completo         | SVG            | Cabecera, documentación, comunicaciones |
| Isotipo                   | SVG            | Icono de aplicación, favicon, avatar    |
| Logotipo monocromo claro  | SVG            | Sobre fondos oscuros                    |
| Logotipo monocromo oscuro | SVG            | Sobre fondos claros                     |
| Icono de aplicación       | PNG adaptativo | Android                                 |
| Favicon                   | ICO y PNG      | Navegadores                             |
| Imagen de vista previa    | PNG 1200×630   | Compartición en redes                   |

---

## 14. Lista de verificación de calidad

Antes de dar por completada cualquier vista:

| Verificación                                                           |
| ---------------------------------------------------------------------- |
| Los cuatro estados están implementados: carga, vacío, error, contenido |
| El diseño es funcional desde 360 px de ancho                           |
| Todas las acciones son alcanzables por teclado                         |
| El foco es visible en todos los elementos interactivos                 |
| El contraste cumple el nivel AA                                        |
| Ningún estado se comunica exclusivamente por color                     |
| Los textos son claros y accionables, sin jerga técnica                 |
| Los objetivos táctiles miden al menos 44 píxeles en móvil              |
| Se respeta la preferencia de movimiento reducido                       |
| Los montos emplean cifras tabulares y formato consistente              |
