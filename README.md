# Social-Link

Social-Link es una herramienta experimental concebida para la Gestión del Conocimiento Personal y la cartografía relacional. Permite mapear de forma visual e interactiva la red de contactos, recuerdos y notas de vida de un individuo asegurando una arquitectura totalmente offline (PWA) basada en la privacidad y la preservación local (JSON puro sin servidor).

👉 **[Prueba Social-Link en vivo haciendo clic aquí](https://cristark02.github.io/visual-pkm)**

## 🚀 Funcionalidades Principales

*   **Lienzo Visual Interactivo:** Entorno de navegación infinito (panorámica y zoom) fluido y adaptado tanto para ratón como para pantallas táctiles.
*   **Gestión de Entidades (Nodos y Grupos):**
    *   **Personas:** Nodos individuales personalizables con nombres, alias (que prevalece visualmente), avatares de color, formas geométricas y pronombres/género.
    *   **Grupos (Clusters):** Agrupaciones visuales para categorizar nodos. Se pueden solapar, redimensionar, y configurar con "arrastre encadenado" (candado) para mover múltiples grupos superpuestos al unísono.
*   **Sistema de Vínculos Semánticos:** 10 niveles de relaciones preconfiguradas con códigos de color estrictos, grosores adaptativos, líneas continuas o punteadas, y flechas direccionales exclusivas para vínculos jerárquicos (nivel 10). Las conexiones múltiples entre dos mismas personas se separan matemáticamente en curvas Bèzier paralelas.
*   **Edición y Notas en Tiempo Real:** Panel de propiedades lateral (que en móviles se convierte en un elegante panel inferior deslizante) para actualizar datos al vuelo. Incluye soporte para anotar contexto histórico extenso sobre cada vínculo o persona.
*   **100% Privado y Offline:** Todo se procesa en el navegador. La aplicación actúa como un motor de lectura/escritura de archivos `.zip` locales.
*   **Exportación de Datos Avanzada:**
    *   **ZIP Empaquetado:** Respaldos automáticos que generan archivos ZIP titulados inteligentemente (ej. `Social-Link de [Alias] [Fecha].zip`).
    *   **Exportación a PDF:** Conversión del mapa relacional a documento vectorial PDF.
*   **Diseño 100% Responsivo:** Interfaces modulares, gestos táctiles perfeccionados y prevención de pérdida de datos al cerrar pestañas por accidente.

---

## Aviso Legal de No-Autoría y Responsabilidad (Disclaimer)

**Por favor, lee esto detenidamente antes de evaluar o interactuar con este repositorio:**

1. **No-Autoría Experimental:** Yo soy un **no-autor** de esta aplicación. No reclamo el crédito por la arquitectura técnica, la escritura del código, ni el diseño visual o estructural de Social-Link. 
2. **Naturaleza del Experimento:** Todo el contenido de este repositorio ha sido generado como un experimento utilizando herramientas de Inteligencia Artificial altamente automatizadas (agentes autónomos de codificación).
3. **Desvinculación Profesional:** El desarrollo web frontend/backend ni es mi campo de especialización, ni me interesa. Este código **no refleja mi experiencia, mi nivel de habilidades técnicas, ni indica ninguna falta de profesionalidad** por mi parte. Es el resultado crudo de delegar una tarea a una IA.
4. **Licenciamiento y Uso:** Este proyecto se proporciona única y exclusivamente con fines de registro experimental. **No tiene licencia de uso oficial, ni otorga ningún derecho de uso, distribución o modificación comercial.** Se distribuye "tal cual" (AS IS). No ofrezco ningún tipo de soporte, mantenimiento ni garantías de que el código sea seguro, eficiente o libre de errores. Declino absolutamente cualquier responsabilidad sobre pérdida de datos, corrupción de archivos o cualquier otro daño derivado del uso (o intento de uso) de este software.

---

## Características Técnicas de la IA (Para referencia histórica)

*   **Offline-First & PWA:** No utiliza base de datos en la nube. La persistencia se logra conectando directamente el navegador con el sistema de archivos del usuario (File System Access API).
*   **JSON Semántico:** El almacenamiento se hace en un archivo JSON puramente semántico, calculando las coordenadas geométricas al vuelo (React Flow).
*   **Paralelismo Matemático:** Algoritmos de separación mediante curvas de Bézier para aristas múltiples entre los mismos nodos.
*   **Exportación Vectorial:** Reescritura del DOM HTML a un string monolítico de SVG puro para la exportación a PDF usando `jsPDF`.
