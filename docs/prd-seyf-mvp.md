# PRD — Seyf MVP: Adelantos de Rendimiento en CETES Tokenizados

## 1. Project Overview

### 1.1 Problema

El trabajador mexicano con ahorros pequeños o medianos mantiene su dinero en cuentas de débito al 0% de rendimiento y, cuando enfrenta una emergencia de liquidez relativamente chica (500–2,000 MXN), termina endeudándose con tarjetas, apps de BNPL o préstamos informales a tasas muy altas.[file:3] Al mismo tiempo, existen CETES tokenizados en Stellar (Stablebonds via Etherfuse) que permiten capturar rendimiento real sobre pesos mexicanos sin fricción técnica, pero el usuario promedio no conoce ni entiende estas herramientas.[file:3][file:1]

Seyf busca resolver esto con una propuesta clara: el usuario deposita pesos vía SPEI, su dinero se invierte automáticamente en CETES tokenizados, y si necesita liquidez hoy puede pedir un adelanto del rendimiento que su ahorro ya está generando, sin tocar el principal y sin contraer deuda.[file:3][file:1]

### 1.2 Objetivos del MVP

- Permitir que un usuario mexicano de 25–40 años de perfil medio-bancalizado deposite entre 500 y 20,000 MXN desde su banco vía SPEI hacia Seyf en menos de 5 minutos, viendo su saldo reflejado y “trabajando” automáticamente.[file:3][file:1]
- Invertir de forma automática el 100% del depósito en Stablebonds de CETES sobre Stellar, sin que el usuario tenga que elegir estrategias ni ver conceptos cripto.[file:3]
- Exponer en un dashboard simple: saldo principal, rendimiento acumulado en pesos y monto máximo adelantable hoy, todo en MXN.[file:3]
- Permitir que el usuario solicite un adelanto del rendimiento proyectado de su ciclo actual con un solo tap, procesando la transacción en segundos y abonando MXNe listo para gastar o retirar a MXN.[file:3]
- Ofrecer salida a vida real vía: pago con QR dentro del ecosistema Stellar/Decaf y retiro SPEI a cuenta bancaria.[file:3]

### 1.3 Usuario Target (User Personas)

**Persona 1 — Carlos, empleado formal sin acceso a crédito barato**
- 29 años, vive en CDMX, trabaja en retail con nómina en banco tradicional.
- Tiene 6,000–10,000 MXN en su cuenta de débito que casi no se mueve; nunca ha invertido en CETES Directo por flojera y desconfianza.
- Usa SPEI, CoDi, apps como Nu o MercadoPago; se siente cómodo moviendo dinero desde el móvil.[file:1]
- Dolor: cuando tiene una emergencia (consultorio médico, viaje familiar inesperado) termina usando tarjeta de crédito o pidiendo prestado a familiares.

**Persona 2 — Ana, freelancer de servicios creativos**
- 33 años, trabaja por su cuenta, cobra por SPEI y en ocasiones en efectivo.
- Sus ingresos suben y bajan; a veces acumula 3,000–15,000 MXN “parados” en su cuenta sin rendir nada.[file:1]
- Quiere una forma sencilla de “poner a trabajar” ese dinero, sin aprender de cripto ni pasar por procesos complicados de inversión.
- Dolor: cuando un cliente se retrasa en pagar, necesita liquidez inmediata sin entrar a créditos caros tipo BNPL.

**Persona 3 — Luis, microempresario**
- 38 años, dueño de una tiendita o pequeño negocio de servicios.
- Maneja caja chica y un colchón de 10,000–20,000 MXN en la cuenta del negocio o en efectivo.
- Conoce SPEI y algunas wallets, pero no CETES ni DeFi; le preocupa no tener liquidez si ocurre una emergencia (reparación, inventario urgente).
- Dolor: no quiere inmovilizar capital ni endeudarse; necesita ver siempre disponible su “colchón”, pero le frustra que no genere nada.

### 1.4 Propuesta de Valor del MVP

- App que se siente como neobanco (no como wallet cripto) donde el usuario ve siempre:
  - “Tu ahorro” (principal depositado)
  - “Lo que ya ganaste” (rendimiento acumulado)
  - “Puedes pedir adelantado” (límite de adelanto de rendimiento)
- El usuario no ve CETES, Stellar, Stablebonds ni MXNe: solo pesos mexicanos y acciones claras (Depositar, Pedir adelanto, Retirar/Pagar).
- El adelanto de rendimiento no es deuda: el principal nunca se toca y el usuario no queda “debloqueado” si el CETE no alcanza, solo recibe menos rendimiento neto.

### 1.5 Fuera de Alcance (Out of Scope MVP)

- Retiro del principal en cualquier momento (el MVP opera por ciclos alineados con vencimiento de CETES, p.ej. 28 días).[file:3]
- Múltiples adelantos simultáneos en un mismo ciclo (solo 1 adelanto activo por periodo de inversión).[file:3]
- Elección manual de estrategia de inversión (Stablebonds vs Blend u otros protocolos).[file:3]
- Integración con Blend/otros protocolos DeFi (post-MVP por riesgos de smart contract).[file:3]
- Tarjeta física, gamificación avanzada, sistema de referidos, dashboard para empresas o nóminas.[file:3]

---

## 2. User Stories & Acceptance Criteria

### 2.1 Registro y Onboarding

**US-01 — Crear cuenta básica**  
Como usuario nuevo, quiero crear una cuenta en Seyf usando mi teléfono y correo para empezar a depositar y ver mi ahorro.

Criterios de aceptación:
- CA-01: Desde la pantalla inicial puedo elegir “Crear cuenta” e ingresar: nombre, correo, teléfono, contraseña y aceptar términos.
- CA-02: El sistema envía un código de verificación por SMS o correo y no permite continuar sin validarlo.
- CA-03: Una vez verificados los datos, quedo autenticado y veo el dashboard inicial (saldo 0, sin depósitos).

**US-02 — Completar KYC básico**  
Como usuario, quiero completar un KYC ligero para poder depositar hasta 20,000 MXN.

Criterios de aceptación:
- CA-01: Desde el dashboard veo un banner/CTA “Completa tu verificación para depositar hasta 20,000 MXN”.
- CA-02: El flujo KYC solicita: nombre legal completo, CURP opcional (post-MVP), fecha de nacimiento, dirección aproximada (ciudad/estado) y una foto de identificación si se requiere.
- CA-03: Mientras el KYC está pendiente, el límite máximo de depósito está restringido (p.ej. 5,000 MXN) y se muestra claramente.
- CA-04: Al completar y ser aprobado el KYC, el límite se actualiza automáticamente en el dashboard.

### 2.2 Depósito vía SPEI (Onramp)

**US-03 — Ver datos de depósito SPEI**  
Como usuario verificado, quiero ver una CLABE/interbancaria y referencia para depositar vía SPEI desde mi banco.

Criterios de aceptación:
- CA-01: Desde el dashboard puedo tocar “Depositar”.
- CA-02: La app muestra una pantalla con: nombre del beneficiario, banco receptor, CLABE o número de cuenta, referencia o concepto sugerido.
- CA-03: Puedo copiar la CLABE y la referencia con un solo tap.
- CA-04: La pantalla explica en lenguaje simple que debo hacer una transferencia SPEI desde mi app bancaria.

**US-04 — Ver confirmación de depósito y conversión a MXNe**  
Como usuario, quiero que cuando mi transferencia SPEI llegue, mi saldo en Seyf se actualice en pesos y comience a generar rendimiento automáticamente.

Criterios de aceptación:
- CA-01: Cuando se detecta un depósito entrante vía integración con el onramp/partner, el backend crea una transacción con estado “Pendiente de conversión”.[file:3]
- CA-02: Una vez convertido el depósito a MXNe en Stellar y desplegado en Stablebonds, el estado cambia a “Completado” y el saldo principal en el dashboard se actualiza (en pesos equivalentes).
- CA-03: El usuario recibe una notificación push y/o in-app “Tu depósito de X MXN ya está generando rendimiento”.[file:3]
- CA-04: El usuario nunca ve ni token names ni direcciones on-chain; solo ve montos en MXN.

### 2.3 Inversión automática en Stablebonds

**US-05 — Activación automática de inversión**  
Como usuario, quiero que cada vez que deposité, mi ahorro empiece a generar rendimiento sin tomar decisiones de inversión.

Criterios de aceptación:
- CA-01: Al acreditarse un depósito, el backend ejecuta la estrategia: convertir MXN a MXNe y luego comprar Stablebonds de CETES en el DEX de Stellar.[file:3]
- CA-02: El sistema guarda el precio y la tasa de CETES al momento de la compra para cada ciclo.
- CA-03: En el dashboard se refleja el nuevo saldo principal sumando todos los depósitos activos en el ciclo.
- CA-04: No existe UI para elegir estrategias o protocolos.

### 2.4 Dashboard de rendimiento

**US-06 — Ver mi ahorro y rendimiento en tiempo real**  
Como usuario, quiero ver en una sola pantalla cuánto he depositado, cuánto he ganado y cuánto puedo adelantar hoy.

Criterios de aceptación:
- CA-01: El dashboard muestra tres tarjetas o bloques:
  - “Tu ahorro” (saldo principal, MXN equivalente).
  - “Lo que ya ganaste” (rendimiento acumulado en MXN desde inicio del ciclo).
  - “Puedes pedir adelantado” (límite máximo de adelanto disponible hoy).
- CA-02: El rendimiento acumulado se actualiza al menos al abrir la app y al hacer pull-to-refresh, usando la tasa CETES vigente y el tiempo transcurrido.[file:3]
- CA-03: El límite adelantable usa una tasa conservadora (p.ej. tasa CETES actual menos margen de seguridad) para no sobreprometer.[file:3]
- CA-04: Se incluye una pequeña explicación textual bajo cada bloque en lenguaje simple.

### 2.5 Solicitud de adelanto de rendimiento

**US-07 — Simular adelanto**  
Como usuario, quiero simular cuánto recibiría hoy si pido adelanto, incluyendo comisión de Seyf.

Criterios de aceptación:
- CA-01: Desde el dashboard, al tocar “Pedir adelanto” se abre una pantalla de simulación.
- CA-02: La pantalla muestra:
  - Monto máximo adelantable.
  - Un control (slider o input) para elegir el monto de adelanto, limitado por el máximo.
  - Comisión de Seyf en pesos.
  - Monto neto a recibir en la wallet de gasto.
- CA-03: Los cálculos se actualizan en tiempo real al mover el slider o editar el monto.

**US-08 — Confirmar adelanto en un tap**  
Como usuario, quiero confirmar mi adelanto en un solo tap y ver el dinero listo para gastar.

Criterios de aceptación:
- CA-01: Desde la simulación, hay un botón principal “Confirmar adelanto”.
- CA-02: Al confirmar, la app muestra un estado de carga mientras el backend ejecuta la lógica en Soroban (validar límites, restar comisión, transferir MXNe a balance de gasto).[file:3]
- CA-03: Si la operación es exitosa, el usuario ve una pantalla de éxito con resumen (monto adelantado, comisión, nuevo saldo de ahorro, nuevo saldo de gasto).
- CA-04: El límite de adelanto para el ciclo se actualiza (no se permite un segundo adelanto hasta el siguiente ciclo).[file:3]
- CA-05: En caso de error (ej. problema on-chain), se muestra un mensaje claro y no se descuenta nada.

### 2.6 Gasto y retiros (off-ramp)

**US-09 — Ver opciones para usar mi adelanto**  
Como usuario, quiero ver claramente cómo puedo usar el dinero adelantado: pagar con QR o retirarlo a mi banco.

Criterios de aceptación:
- CA-01: El dashboard incluye un bloque “Saldo para gastar” con el monto disponible en MXN equivalente.
- CA-02: Al tocar este bloque, se abre una pantalla con dos acciones principales: “Pagar con QR” y “Retirar a banco”.[file:3]

**US-10 — Pagar con QR (integración Decaf/partner)**  
Como usuario, quiero pagar con QR en comercios compatibles usando mi saldo adelantado.

Criterios de aceptación:
- CA-01: Al elegir “Pagar con QR”, la app abre un lector de QR o redirige a la app/SDK del partner (p.ej. Decaf), pasando el monto y cuenta de origen según integración definida.[file:3]
- CA-02: Tras el pago, se actualiza el saldo de gasto en Seyf y se registra la transacción en el historial.

**US-11 — Retirar a cuenta bancaria vía SPEI**  
Como usuario, quiero enviar mi saldo adelantado de vuelta a mi cuenta bancaria vía SPEI.

Criterios de aceptación:
- CA-01: En “Retirar a banco”, el usuario selecciona o captura una CLABE/beneficiario; la primera vez se guarda como cuenta favorita.
- CA-02: La pantalla muestra el monto disponible para retiro, comisión (si aplica) y monto neto.
- CA-03: Al confirmar, el backend inicia el flujo de off-ramp a MXN y transferencia SPEI.
- CA-04: La transacción se marca como “Pendiente” hasta que el partner confirme el SPEI, momento en que cambia a “Completado” y se notifica al usuario.[file:3]

### 2.7 Historial y transparencia

**US-12 — Ver historial de movimientos**  
Como usuario, quiero ver todos mis depósitos, rendimientos y adelantos para confiar en la app.

Criterios de aceptación:
- CA-01: Existe una sección “Historial” accesible desde el menú o el dashboard.
- CA-02: Cada ítem muestra tipo (depósito, rendimiento, adelanto, retiro, pago), fecha/hora, monto y estado.
- CA-03: Puedo filtrar por tipo o rango de fechas.

### 2.8 Estados de error y borde

**US-13 — Manejo de riesgos SPEI y on-chain**  
Como usuario, quiero mensajes claros cuando haya demoras en SPEI o problemas on-chain.

Criterios de aceptación:
- CA-01: Si un depósito SPEI tarda más de X minutos, se muestra un mensaje “Tu transferencia sigue en proceso, puede tardar hasta el siguiente día hábil”.[file:3]
- CA-02: Si falla una transacción on-chain (compra de Stablebonds, adelanto, retiro), la UI muestra un error entendible y no refleja cambios de saldo.

---

## 3. UI/UX Requirements

### 3.1 Principios de diseño

- Lenguaje siempre en español neutro mexicano, con énfasis en claridad y confianza.
- El usuario ve pesos mexicanos en todo momento; no se muestran tickers, direcciones ni conceptos cripto.
- Paleta visual tipo neobanco: fondo claro, acentos en un color principal (e.g. verde o azul) para acciones clave.
- Tipografía legible en móviles, con jerarquía clara entre títulos, montos y descripciones.

### 3.2 Pantallas clave (wireframes descriptivos)

**Pantalla 1 — Onboarding inicial**
- Logo de Seyf, breve tagline: “Pon a trabajar tu ahorro y adelanta lo que ya ganaste, sin deuda”.
- Dos botones: “Crear cuenta” (primario) y “Iniciar sesión” (secundario).
- Pie con enlaces a Términos y Aviso de Privacidad.

**Pantalla 2 — Registro / Login**
- Formulario de registro con campos básicos (nombre, correo, teléfono, contraseña) y checkbox de aceptación de términos.
- Alternativamente, pantalla de login con correo/teléfono + contraseña.
- Mensajes de error claros en caso de datos inválidos.

**Pantalla 3 — Dashboard principal**
- Header con saludo: “Hola, [nombre]”.
- Tres tarjetas apiladas:
  - Tarjeta A: “Tu ahorro” — monto grande en MXN, texto corto explicando que es tu capital.
  - Tarjeta B: “Lo que ya ganaste” — monto de rendimiento acumulado, con una leyenda tipo “actualizado al día de hoy”.
  - Tarjeta C: “Puedes pedir adelantado” — monto máximo disponible hoy, con CTA “Pedir adelanto”.
- Botón flotante o barra inferior con accesos rápidos: Depositar, Historial, Ajustes.
- Bloque inferior: “Saldo para gastar” (si hay adelantos activos), con CTA “Usar ahora”.

**Pantalla 4 — Flujo Depositar**
- Muestra CLABE, banco, beneficiario y referencia.
- Botones para “Copiar CLABE” y “Copiar referencia”.
- Texto explicativo: pasos para hacer SPEI desde cualquier banco, estimado de tiempo de acreditación.

**Pantalla 5 — Flujo Pedir Adelanto**
- Encabezado: “Pedir adelanto de rendimiento”.
- Visual tipo tarjeta o slider para elegir monto (dentro del máximo).
- Resumen desglosado:
  - Monto adelantado.
  - Comisión Seyf.
  - Monto neto a recibir.
- Botón primario “Confirmar adelanto”.
- Mensaje discreto: “No tocamos tu ahorro, solo adelantamos parte de lo que ya generaste”.

**Pantalla 6 — Uso del adelanto (QR / Retiro)**
- Tarjeta con “Saldo para gastar”.
- Dos botones grandes: “Pagar con QR” y “Retirar a banco”.
- Explicación corta bajo cada botón.

**Pantalla 7 — Historial**
- Lista cronológica con iconos por tipo de movimiento.
- Tap en cada movimiento abre un modal con detalles.

### 3.3 User flows principales

1. Onboarding → Registro/KYC → Dashboard vacío → Ver flujo “Depositar” → SPEI desde banco → Confirmación → Dashboard con saldo y rendimiento.
2. Dashboard con saldo y rendimiento → “Pedir adelanto” → Simulación → Confirmar → Exito → Dashboard con saldo de gasto actualizado.
3. Dashboard → “Saldo para gastar” → elegir “Pagar con QR” o “Retirar a banco” → completar flujo → Historial refleja operación.

### 3.4 Accesibilidad y estados

- Contraste adecuado para montos y CTA principales.
- Estados de carga visibles mientras se espera respuesta de backend/on-chain.
- Estados vacíos con mensajes educativos (ej. sin depósitos aún, sin adelantos aún).

---

## 4. Technical Requirements

### 4.1 Arquitectura general

- Arquitectura cliente-servidor con backend centralizado coordinando:
  - Autenticación de usuarios y KYC.
  - Integración con on/off-ramps MXN (SPEI) y partner tipo Decaf/Etherfuse.
  - Interacción con la red Stellar (conversión MXNe, compra de Stablebonds, contratos Soroban de adelanto).
- App cliente inicialmente como web app responsiva o mobile (React Native / Flutter) según capacidad del equipo.

### 4.2 Stack sugerido

- Frontend:
  - React Native (iOS/Android) o React web con PWA, según prioridades.
  - Librería de UI (p.ej. React Native Paper o similar) para componentes estándar.
- Backend:
  - Node.js (NestJS/Express) o equivalente en un entorno cloud (p.ej. AWS, GCP, Railway, Render).
  - API REST/GraphQL interna consumida por el cliente.
- On-chain / Stellar / Soroban:
  - SDK oficial de Stellar/Soroban en el backend para firmar y enviar transacciones.
  - Contrato inteligente Soroban que implemente la lógica del motor de adelantos:
    - Cálculo de rendimiento proyectado por usuario/ciclo.
    - Validación de límites de adelanto (no tocar principal, un adelanto activo por ciclo).
    - Emisión de pagos de MXNe a cuenta de gasto.
- Infraestructura:
  - Base de datos relacional (PostgreSQL) para usuarios, KYC, saldos lógicos, histórico de transacciones.
  - Almacenamiento seguro de secretos y claves (KMS / Vault).
  - Monitoreo y logging (p.ej. Sentry, Datadog).

### 4.3 Integraciones externas

- **On-ramp/off-ramp MXN:**
  - Proveedor que expone CLABEs virtuales y notifica depósitos SPEI (webhooks).
  - Endpoint para iniciar retiros SPEI y recibir webhooks de estatus.
- **Etherfuse / Stablebonds:**
  - Acceso a contratos/token Stablebonds de CETES en Stellar.
  - Origen de datos para tasa actual de CETES (vía API o directamente del contrato/token).[file:3]
- **Decaf u otro partner de pagos QR:**
  - Integración vía deep-link, SDK o API para enviar saldo MXNe y disparar pagos.

### 4.4 Reglas de negocio (motor de adelantos)

- Principal:
  - Es la suma de depósitos netos del usuario en el ciclo actual.
  - Nunca se descuenta para adelantos.
- Rendimiento proyectado:
  - Se calcula usando:
    - Monto principal.
    - Tasa CETES del ciclo.
    - Duración del ciclo (28/91 días).
  - Se aplica un margen de seguridad (tasa efectiva usada < tasa oficial) para evitar sobre-adelantos.[file:3]
- Límite de adelanto:
  - Límite = rendimiento proyectado * factor de seguridad (<= 1) − comisión Seyf.
  - Un solo adelanto activo por ciclo.
- Comisiones:
  - Por adelanto: comisión fija o porcentaje sobre el monto adelantado expresado en MXN al usuario.
  - Spread de rendimiento: manejado a nivel de backend/tesorería (no visible como fee, sino implícito en el rendimiento mostrado al usuario).[file:1]

### 4.5 Seguridad y cumplimiento

- Al menos cifrado TLS extremo a extremo entre app y backend.
- Cifrado de datos sensibles en reposo (p.ej. datos KYC parciales, identificadores de cuentas bancarias).
- Gestión segura de claves para interactuar con Stellar (uso de cuentas custodias/“vaults” con políticas claras de firma).
- Cumplimiento básico con normativas mexicanas relevantes para herramientas de ahorro/inversión no bancarias (a revisar con asesor legal antes de producción).[file:3]

### 4.6 Constraints y supuestos

- MVP limitado a residentes en México con acceso a SPEI.
- iOS y Android como plataformas objetivo prioritarias; versión web opcional.
- Límites iniciales de depósito por usuario: mínimo 500 MXN, máximo 20,000 MXN.[file:3]
- No se soportan múltiples monedas; solo MXN.

---

## 5. Success Metrics

### 5.1 KPI principales

- **Activación de primer adelanto:**
  - Meta: al menos 60% de usuarios que depositan >1,000 MXN solicitan al menos un adelanto de rendimiento en los primeros 30 días sin retirar su principal.[file:3]
- **Tiempo a valor (TTV):**
  - Tiempo medio desde creación de cuenta hasta primer depósito acreditado < 5 minutos (considerando tiempo promedio de SPEI en horario hábil).[file:3]
- **Retención de principal en primer ciclo:**
  - Porcentaje de usuarios que mantienen su principal invertido hasta el final del primer ciclo (28/91 días) > 80%.[file:3]
- **Monto promedio de adelanto:**
  - Entre 200 y 1,500 MXN por operación, validando que cubre necesidades reales de liquidez sin incentivar uso excesivo.[file:3]

### 5.2 Métricas secundarias de producto

- Conversión onboarding → KYC completo.
- Porcentaje de depósitos acreditados sin intervención manual.
- Errores on-chain por cada 1,000 operaciones.
- NPS o rating simple in-app (p.ej. “¿Qué tan útil te resultó Seyf este mes?”) > 8/10 en usuarios activos.

---

## 6. Implementation Roadmap

### 6.1 Fase 0 — Fundamentos y diseño (1–2 semanas)

- Definir diseño visual y componentes principales del dashboard y flujos clave.
- Especificar contratos Soroban para motor de adelantos (interfaces, estados, pruebas en testnet).
- Alinear con partner de on/off-ramp (CLABEs, SPEI, MXNe) y con Etherfuse para acceso a Stablebonds.[file:3][file:1]

### 6.2 Fase 1 — MVP funcional end-to-end en testnet (4–6 semanas)

- Implementar backend con:
  - Autenticación de usuarios y modelo de datos básico.
  - Integración dummy o sandbox con on-ramp/off-ramp MXN.
  - Integración con Stellar testnet, MXNe de prueba y Stablebonds dummy.
  - Lógica de cálculo de rendimiento proyectado y límites de adelanto (lado backend) alineada con lo que hará Soroban.
- Implementar app cliente con:
  - Onboarding, login, KYC básico.
  - Dashboard con “Tu ahorro”, “Lo que ya ganaste”, “Puedes pedir adelantado”.
  - Flujo “Depositar” con datos estáticos o sandbox.
  - Flujo “Pedir adelanto” (simulación + confirmación) conectado a contrato en testnet.
  - Historial básico de transacciones.

Entrega de esta fase: demo interno que muestre el flujo completo en entorno de pruebas.

### 6.3 Fase 2 — Integraciones reales y hardening (4–6 semanas)

- Conectar con on/off-ramp MXN real (sandbox → producción).
- Ajustar contratos Soroban y lógica para operar con Stablebonds reales en testnet/mainnet (según acceso).[file:3]
- Añadir manejo robusto de errores SPEI y on-chain (reintentos, reconciliación, estados pendientes).
- Monitoreo y alertas básicas de liquidez y uso del fondo de adelantos.

Entrega de esta fase: versión candidata a piloto cerrado con usuarios reales de confianza.

### 6.4 Fase 3 — Piloto cerrado con usuarios reales (4 semanas)

- Onboard de 30–100 usuarios cercanos (red personal, comunidades Web3/finanzas personales).[file:1]
- Medir KPIs clave: tasa de depósitos, frecuencia de adelantos, satisfacción, problemas de UX.
- Ajustar límites de adelanto, comisiones y mensajes educativos según comportamiento observado.

### 6.5 Backlog post-MVP (no incluido en alcance inmediato)

- Retiro parcial o total del principal antes de vencimiento de ciclo.
- Integración con Blend u otros protocolos DeFi para mejorar rendimiento, después de auditorías de seguridad.[file:3]
- Sistema de referidos, misiones de educación financiera, badges o gamificación light.
- Soporte multi-ciclo y estrategias de inversión avanzadas.

---

Este PRD define el alcance funcional, de UX y técnico mínimo necesario para que un equipo de desarrollo pueda desglosar en épicas y tickets concretos (frontend, backend, contratos Soroban e integraciones externas) y construir un MVP demostrable de Seyf centrado en adelantos de rendimiento sobre CETES tokenizados en Stellar.