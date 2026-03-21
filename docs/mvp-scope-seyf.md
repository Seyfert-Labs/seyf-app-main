# MVP Scope: Seyf

## Problema Core

El trabajador mexicano informal o subbancarizado guarda su dinero en una cuenta de débito al 0% de rendimiento. Cuando enfrenta una emergencia o necesidad de liquidez menor, la única opción disponible es endeudarse a tasas elevadas mediante tarjetas de crédito o préstamos informales. Seyf resuelve esto en una sola frase: **el usuario deposita sus ahorros, ganan rendimiento real respaldado por CETES tokenizados, y si necesita liquidez hoy, la app le adelanta parte de ese rendimiento ya generado — sin tocar el principal, sin deuda, sin intereses.**

***

## Contexto Tecnico del Stack

Seyf se construye sobre tres primitivas ya operativas en mainnet de Stellar:

- **MXNe (Etherfuse):** Stablecoin denominada en pesos mexicanos, emitida con Brale y respaldada por CETES. Emitida nativamente en Stellar, puede adquirirse desde el DEX de la red con costos de conversion de aproximadamente 4 puntos base frente al dolar — una tasa de grado institucional.[^1][^2]
- **Stablebonds / CETES tokenizados (Etherfuse):** Tokens respaldados por Certificados de la Tesoreria de la Federacion, los bonos gubernamentales de corto plazo de Mexico. Etherfuse adquiere los CETES de forma tradicional y emite un token por cada peso de deuda, transfiriendo al tenedor el 99.5% del rendimiento. Los Stablebonds se emiten nativamente en Stellar y pueden comprarse, venderse e intercambiarse libremente en el DEX de la red, garantizando liquidez y transparencia en cadena.[^3][^4][^5]
- **Blend Protocol:** Protocolo DeFi de lending construido en Stellar con Soroban. Permite crear pools de prestamo aislados donde los depositantes ganan rendimiento por los pagos de interes de los prestatarios. Al cierre de H2 2025, Blend reporta casi 90 millones de dolares en TVL con APRs superiores al 10% en ciertos activos.[^6][^7][^8]

La combinacion de Stablebonds + Blend como capa de ejecucion es parte del patron de composabilidad documentado por Stellar. Decaf opera como capa de pagos no custodia: permite a los usuarios depositar MXN via SPEI/CLABE interbancaria y retirar o gastar sus activos digitales en la vida real.[^9][^10][^11]

***

## Usuario Objetivo

Trabajador mexicano de 25 a 40 anos con smartphone que utiliza CoDi o SPEI en su banco pero nunca ha abierto una cuenta en CETES Directo. Tiene entre 2,000 y 20,000 MXN guardados en una cuenta de debito sin rendimiento y de forma ocasional necesita entre 500 y 2,000 MXN de liquidez urgente sin querer endeudarse. Puede ser freelancer, empleado formal sin acceso a credito barato, o microempresario.

El usuario no conoce ni necesita conocer DeFi, Stellar, ni el concepto de stablecoin. La app debe sentirse como un neobanco, no como una billetera cripto.

***

## Flujo MVP: 5 Pasos

### Paso 1 — Deposito (Onramp SPEI a MXNe)

El usuario abre la app, selecciona "Depositar" e ingresa un monto en pesos. La app genera una CLABE interbancaria virtual. El usuario hace una transferencia SPEI desde su banco como si pagara a cualquier cuenta. En minutos, los pesos llegan y la app los convierte automaticamente a MXNe en Stellar. Para el usuario, la experiencia es identica a depositar en una cuenta bancaria normal.[^11]

**Restricciones del MVP:**
- Deposito minimo: 500 MXN
- Deposito maximo inicial: 20,000 MXN por usuario (limite KYC basico)
- Conversion automatica a MXNe — el usuario nunca ve la transaccion en cadena

### Paso 2 — Inversion Automatica (MXNe a Stablebonds / Blend)

Una vez recibido el deposito en MXNe, un contrato inteligente en Soroban despliega automaticamente los fondos:

- **Estrategia conservadora (MVP):** 100% de los fondos se depositan en Stablebonds de CETES a traves del DEX de Stellar. Esto garantiza que el principal nunca esta expuesto a riesgo de smart contract adicional mas alla del propio emisor.[^4][^3]
- **Estrategia con mayor rendimiento (post-MVP):** Una porcion de los fondos se despliega en pools de Blend para capturar el spread adicional de rendimiento DeFi.[^8][^6]

Para el MVP, la decision es deliberada: el principal del usuario solo toca Stablebonds. Blend se usa unicamente en iteraciones posteriores cuando el modelo de riesgo este validado.

El usuario ve en su pantalla: "Tu dinero esta generando rendimiento. Hoy llevas ganados: X pesos."

### Paso 3 — Dashboard de Rendimiento en Tiempo Real

La pantalla principal muestra tres numeros:

1. **Saldo principal:** el dinero original depositado por el usuario (en MXN equivalente, nunca en tokens)
2. **Rendimiento acumulado:** cuanto ha generado el usuario desde su deposito, calculado en tiempo real sobre la tasa de los CETES vigentes
3. **Maximo adelantable hoy:** el monto disponible para solicitar como adelanto, calculado como un porcentaje del rendimiento proyectado para el ciclo activo

La interfaz no menciona CETES, MXNe ni Stellar. Solo muestra: "Tu ahorro", "Lo que ya ganaste", "Puedes pedir adelantado".

### Paso 4 — Solicitud de Adelanto (Yield Advance)

El usuario presiona "Pedir adelanto". La app calcula y muestra:

- Monto maximo disponible basado en yield proyectado (no en principal)
- Comision de Seyf expresada en pesos (no en porcentaje)
- Monto neto que llegara a la wallet del usuario

El usuario confirma con un solo tap. El contrato inteligente en Soroban verifica que el adelanto no excede el limite de rendimiento proyectado, descuenta la comision de Seyf, y transfiere el MXNe al balance de gasto del usuario en segundos.

**Reglas del motor de adelanto para el MVP:**
- El monto maximo de adelanto es igual al rendimiento proyectado del ciclo activo menos la comision de Seyf
- El principal nunca se toca ni se fracciona
- Un usuario solo puede tener un adelanto activo por ciclo (alineado con el vencimiento del CETES en curso, tipicamente 28 o 91 dias)[^12]
- Si el rendimiento generado no cubre el adelanto al vencimiento, la logica de recuperacion usa el rendimiento real acumulado. El usuario no incurre en deuda

### Paso 5 — Gasto en Vida Real (Decaf / QR)

El MXNe adelantado esta disponible en la wallet del usuario. Para gastarlo, el usuario puede:

- **Pagar con QR:** escanear el QR de cualquier negocio que acepte pagos en red Stellar o Decaf[^13][^9]
- **Transferir a cuenta bancaria:** hacer un retiro a MXN via SPEI al banco del usuario, conversion automatica de MXNe a pesos

Decaf ya cuenta con on/off-ramps en Mexico y opera sobre Stellar, lo que lo hace el candidato natural de integracion para la capa de gasto.[^14][^9]

***

## Features del MVP

| Feature | Descripcion | Prioridad |
|---|---|---|
| Deposito via SPEI / CLABE | Onramp de MXN a MXNe sin fricciones | Critica |
| Inversion automatica en Stablebonds | MXNe desplegado en CETES tokenizados via DEX de Stellar | Critica |
| Dashboard de rendimiento en tiempo real | Saldo, yield acumulado y maximo adelantable en pesos | Critica |
| Motor de adelanto de rendimiento | Calculo y transferencia del adelanto en un tap | Critica |
| Gasto via QR o retiro SPEI | Off-ramp del adelanto a pesos o pago directo en comercio | Critica |
| Historial de movimientos | Depositos, rendimiento acumulado, adelantos solicitados y su estado | Alta |

***

## Lo que NO va en el MVP

- **Seleccion manual de estrategia de inversion:** el usuario no elige entre Stablebonds, Blend, ni pools especificos. La app toma la decision automaticamente
- **Retiro del principal en cualquier momento:** el MVP opera en ciclos alineados con el vencimiento de los CETES. El retiro anticipado del principal se diseña en v2
- **Multiples adelantos activos por ciclo:** un adelanto por periodo de inversion para simplificar el modelo de riesgo
- **Sistema de credito o score:** Seyf no es una fintech de credito; el adelanto es siempre menor o igual al rendimiento ya generado
- **Team matching o funciones sociales**
- **Soporte multi-chain** (solo Stellar en MVP)
- **Dashboard para empresas o nomina**
- **Integracion con Blend** (fase 2, pendiente de auditoria de riesgos post-exploit de febrero 2026)[^15]
- **Tarjeta de debito fisica**
- **Gamificacion o referidos**

***

## Modelo de Negocio del MVP

Seyf actua como intermediario de rendimiento:

- El usuario deposita MXNe y recibe el rendimiento de CETES menos la comision de Seyf
- Seyf captura la diferencia entre el rendimiento bruto de los CETES/DeFi y el rendimiento neto que entrega al usuario
- En la capa de adelanto: el usuario paga una comision fija por el adelanto (expresada en pesos, no como tasa de interes)
- El modelo es sostenible porque Seyf nunca asume riesgo de credito: el adelanto siempre esta colateralizado por el rendimiento proyectado del mismo ciclo

Etherfuse cobra aproximadamente 0.5% del rendimiento al emitir los Stablebonds de CETES, lo que establece el piso del costo para Seyf al usar esa capa.[^5]

***

## Riesgos Tecnicos a Validar Antes del Demo

| Riesgo | Descripcion | Mitigacion en MVP |
|---|---|---|
| Riesgo de smart contract en Blend | El exploit de Blend V2 de febrero 2026 expuso fondos de usuarios[^15] | MVP excluye Blend; solo Stablebonds para el principal |
| Variacion de tasa de CETES | Los CETES se subastan semanalmente; la tasa puede cambiar entre el deposito y el vencimiento[^12] | Motor de adelanto usa tasa conservadora (tasa actual menos 10%) para calcular el maximo adelantable |
| Latencia del onramp SPEI | Las transferencias SPEI pueden demorar hasta el siguiente dia habil en fin de semana[^11] | Comunicar al usuario el tiempo estimado de acreditacion; no bloquear la sesion |
| KYC y regulacion de activos digitales en Mexico | MXNe y Stablebonds operan en un marco regulatorio en desarrollo | MVP opera como herramienta de ahorro e inversion, no como captacion de depositos. Revisar interpretacion de CNBV antes de lanzamiento en produccion |

***

## Criterio de Exito

El MVP funciona si el 60% de los usuarios que depositan mas de 1,000 MXN solicitan al menos un adelanto de rendimiento dentro de los primeros 30 dias sin retirar su principal.

**Metricas secundarias:**
- Tiempo promedio de activacion (primer deposito a primera inversion automatica): menor a 5 minutos
- Tasa de retiro del principal en el primer ciclo: menor al 20%
- Monto promedio de adelanto solicitado: entre 200 y 1,500 MXN

***

## Test Final de Scope

- El MVP resuelve UN problema especifico: liquidez urgente sin romper el ahorro ni endeudarse
- Tiene exactamente 6 features, 5 de ellas criticas
- El problema se explica en 30 segundos: "Depositas tus ahorros, ganan rendimiento de CETES en blockchain, y si necesitas dinero hoy te adelantamos lo que ya ganaste — sin deuda, sin tocar tu capital"
- El usuario objetivo esta definido con precision: trabajador o microempresario mexicano de 25 a 40 anos con smartphone y entre 2,000 y 20,000 MXN en ahorro informal

---

## References

1. [Etherfuse aspira a traer 100 monedas soberanas en cadena - Stellar](https://stellar.org/es/blog/podcasts/etherfuse-aspira-a-traer-100-monedas-soberanas-en-cadena) - Author

Gabriella Pellagatti

Publishing date

Dave Taylor no está interesado en construir otra vía ...

2. [Stellar | Premios Stellar i³ 2025](https://stellar.org/es/blog/ecosistema/premios-stellar-i-2025) - Etherfuse trae Stablebonds—tesoros gubernamentales tokenizados—nativamente a Stellar, y los empareja...

3. [Bonos Globales, Impacto Local: Stablebonds en Stellar](https://stellar.org/es/blog/noticias-fundacion/bonos-globales-impacto-local-stablebonds-en-stellar) - Noticias de la Fundación

Author

Kate Montgomery

Publishing date

Etherfuse busca reescribir las r...

4. [Global Bonds, Local Impact: Stablebonds on Stellar](https://stellar.org/blog/foundation-news/global-bonds-local-impact-stablebonds-on-stellar) - Etherfuse is looking to rewrite the rules of the $140T global bond market with Stablebonds, now avai...

5. [Cetes tokenizados: la apuesta de Etherfuse en el mercado ...](https://elceo.com/mercados/cetes-tokenizados-la-apuesta-de-etherfuse-en-el-mercado-mexicano/) - Etherfuse adquiere CETES de la forma tradicional, y posteriormente emite un token por cada peso o tí...

6. [Estudio de Caso de Blend & Meru - Stellarstellar.org › meru-wallet-usa-blend-defi-protocol-para-rendimiento-v2](https://stellar.org/es/estudios-de-caso/meru-wallet-usa-blend-defi-protocol-para-rendimiento-v2) - Blend es un protocolo DeFi construido sobre la blockchain de Stellar, proporcionando fondos de prést...

7. [Blend & Meru Case Study](https://stellar.org/es/estudios-de-caso/meru-wallet-uses-blend-defi-protocol-for-yield) - Case Study

Blend is changing the game when it comes to DeFi on Stellar, opening the door for unders...

8. [Stellar H2 2025 Ecosystem Report](https://research.nansen.ai/articles/stellar-h2-2025-ecosystem-report) - Stellar is an open-source blockchain network designed to facilitate fast, low-cost cross-border paym...

9. [El Efecto Onchain - Cómo Decaf está revolucionando ... - Stellar](https://stellar.org/es/estudios-de-caso/decaf) - Caso de Estudio

Industry

Remesas, On y Off-Ramps

Location

América Latina

Use cases

Stellar Ram...

10. [Composability on Stellar: How DeFi Protocols Work Together - Stellar](https://stellar.org/blog/developers/composability-on-stellar-from-concept-to-reality) - Author

Bri Wylde

Publishing date

Earlier this year, I wrote an article about composability as a c...

11. [Haz tu primer depósito de MXN | Decaf Help Center - Intercom](https://intercom.help/decaf/es/articles/11464611-haz-tu-primer-deposito-de-mxn) - Abre tu Decaf Wallet y ve a la sección "Agregar". · Selecciona la opción de MXN Transferencia Bancar...

12. [Stablebonds - CETES](https://app.etherfuse.com/bonds/CETES) - CETES are BBB- rated short-term government bonds and are highly liquid in the Mexican market. Intere...

13. [Stellar | The Onchain Effect - How Decaf is revolutionizing ...](https://stellar.org/case-studies/decaf) - Case Study

14. [Decaf Wallet - App Store](https://apps.apple.com/us/app/decaf-wallet/id1616564038?l=es-MX) - Convierte cripto en blockchain con Solana y Stellar DEX. • Invierte y haz crecer tu dinero. Gana ren...

15. [Blend TVL Stats & Charts](https://defillama.com/protocol/blend) - Yields. Pools Tracked4. Average APY4.57%. View all Yields ; Hacks. Date: Feb 22, 2026. Protocol: Ble...

