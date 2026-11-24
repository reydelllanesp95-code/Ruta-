# Criterios previos — Leer las capturas como foto dentro de RUTA (23-nov-2026)

Rey: copiar y pegar captura por captura es pesado. Eligió que RUTA lea las
fotos ella misma (gratis, en el teléfono), con plan B de pegar texto en Lyft.
Prueba previa con tesseract (CLI) sobre sus 4 capturas: Flex exacto en 36/36
ajustes; Lyft solo en 2/36.

Criterios (se fijan ANTES de programar; no se tocan tras ver resultados):

1. «Elegir capturas» deja escoger varias fotos a la vez; RUTA las lee en el
   teléfono, sin enviar las imágenes a ningún servidor (todo se sirve desde
   la propia web de RUTA; nada de CDN de terceros).
2. Con las 2 capturas de Flex de Rey (17–22 nov), en el navegador de prueba
   con viewport de iPhone, el plan sale igual que pegando el texto: total
   $935.55 y los mismos 13 cambios contra su respaldo.
3. Con las 2 capturas de Lyft del 22 nov: o sale exactamente $89.27 con
   propinas $8.90, o RUTA no propone nada y dice que pegues el texto. Nunca
   un total distinto.
4. El texto leído queda en el recuadro para que Rey pueda corregir un número
   a mano y volver a «Leer».
5. La app sigue abriendo sin internet; el lector (unos MB) solo se descarga
   la primera vez que se usa y no entra en la caché de arranque.
6. Tests y build en verde.

SIN MEDIR fuera de estas 4 capturas: cuánto falla con otras capturas, otros
iPhones o modo claro/oscuro distinto.
