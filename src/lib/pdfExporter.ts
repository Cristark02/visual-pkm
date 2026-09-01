import { jsPDF } from 'jspdf';
import 'svg2pdf.js';

// Converts an image URL (like a Blob URL) to Base64 to safely embed in the SVG for PDF
async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Transmuta el grafo de React Flow (HTML + SVG) a un documento SVG monolítico
 * puro, sin foreignObjects, para exportarlo a PDF en alta fidelidad.
 */export async function exportToVectorPDF() {
  const flowPane = document.querySelector('.react-flow__pane') as HTMLElement;
  if (!flowPane) return;

  // Accedemos a los datos reales de los nodos a través del DOM indirectamente (o store si estuviera importado)
  // Para no mezclar dependencias de React en este script vanilla, extraeremos info de los atributos de React Flow y del DOM.

  // 1. Clonar las aristas (edges) que ya son SVG puros
  const edgesSvg = document.querySelector('.react-flow__edges') as SVGSVGElement;
  let edgesGroupString = '';
  if (edgesSvg) {
    const g = edgesSvg.querySelector('g');
    if (g) {
      edgesGroupString = g.innerHTML;
    }
  }

  // 1.5 Extraer las etiquetas de las uniones (Edge Labels)
  let edgeLabelsSvgString = '';
  const edgeLabels = document.querySelectorAll('.react-flow__edgelabel-renderer > div');
  for (let i = 0; i < edgeLabels.length; i++) {
    const label = edgeLabels[i] as HTMLElement;
    const transform = label.style.transform;
    const text = label.textContent || '';
    if (!text) continue;

    // El transform suele ser: translate(-50%, -50%) translate(Xpx, Ypx)
    const match = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
    if (!match) continue;

    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    const color = label.style.color || '#3b82f6';

    // Generar el SVG del texto, ajustando el -50% -50% con text-anchor y dominant-baseline
    edgeLabelsSvgString += `<text x="${x}" y="${y}" fill="${color}" font-size="10" font-family="sans-serif" font-weight="900" text-anchor="middle" dominant-baseline="central" letter-spacing="1.5">${text}</text>`;
  }

  // 2. Extraer los Nodos HTML y transmutarlos a SVG primitivo
  const nodesHtml = document.querySelectorAll('.react-flow__node');
  let nodesSvgString = '';
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (let i = 0; i < nodesHtml.length; i++) {
    const node = nodesHtml[i] as HTMLElement;
    const transform = node.style.transform;
    const match = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
    if (!match) continue;
    
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    const w = node.offsetWidth;
    const h = node.offsetHeight;

    // Actualizar bounding box
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);

    const isCluster = node.classList.contains('react-flow__node-cluster');
    
    if (isCluster) {
      // Extraer la geometria real del cluster y su color
      const svgG = node.querySelector('svg g');
      const innerSvg = svgG ? svgG.innerHTML : '';
      const fill = svgG?.getAttribute('fill') || 'rgba(238, 242, 255, 0.3)';
      const stroke = svgG?.getAttribute('stroke') || '#c7d2fe';
      const strokeWidth = svgG?.getAttribute('stroke-width') || '2';
      const strokeDasharray = svgG?.getAttribute('stroke-dasharray') || '8 8';
      
      const labelElement = node.querySelector('h3, span.text-xl');
      const label = labelElement?.textContent || 'GRUPO';
      const labelColor = (labelElement as HTMLElement)?.style?.color || '#312e81';

      if (innerSvg) {
        // Envolvemos el SVG interno del cluster escalándolo a su tamaño
        nodesSvgString += `
          <g transform="translate(${x}, ${y}) scale(${w / 100}, ${h / 100})">
            <g fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDasharray}" vector-effect="non-scaling-stroke">
              ${innerSvg}
            </g>
          </g>
        `;
      } else {
        nodesSvgString += `
          <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDasharray}" rx="16" ry="16"></rect>
        `;
      }
      
      nodesSvgString += `<text x="${x + w/2}" y="${y + h/2}" fill="${labelColor}" font-size="20" font-family="sans-serif" font-weight="900" text-anchor="middle" dominant-baseline="central" opacity="0.6">${label}</text>`;
    } else {
      // Dibujar IndividualNode
      const innerDiv = node.querySelector('div > div') as HTMLElement;
      if (!innerDiv) continue;

      const bg = innerDiv.style.backgroundColor || '#ffffff';
      const clipPath = innerDiv.style.clipPath || '';
      
      // Buscar el nombre en la etiqueta blanca de abajo
      const nameTag = node.querySelector('.bg-white.shadow-md') as HTMLElement;
      const name = nameTag?.textContent || node.getAttribute('data-id') || '';
      
      const img = innerDiv.querySelector('img');
      const fallbackSpan = innerDiv.querySelector('span');

      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = w / 2;

      let shapeSvg = '';

      if (clipPath.includes('polygon')) {
        // Star fallback
        shapeSvg = `<polygon points="${x+w/2},${y} ${x+w},${y+h} ${x},${y+h}" fill="${bg}" stroke="#9ca3af" stroke-width="2" />`;
      } else if (clipPath.includes('path')) {
        // Heart fallback
        shapeSvg = `<path d="M${cx},${y+h*0.3} C${cx-w/2},${y-h*0.2} ${x-w/4},${y+h*0.8} ${cx},${y+h} C${x+w+w/4},${y+h*0.8} ${cx+w/2},${y-h*0.2} ${cx},${y+h*0.3} Z" fill="${bg}" stroke="#9ca3af" stroke-width="2" />`;
      } else if (innerDiv.className.includes('rounded-xl') || clipPath.includes('rect')) {
        // Square
        shapeSvg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}" stroke="#9ca3af" stroke-width="2" rx="12" ry="12"></rect>`;
      } else {
        // Circle (Default)
        shapeSvg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${bg}" stroke="#9ca3af" stroke-width="2"></circle>`;
      }

      nodesSvgString += shapeSvg;

      // Draw Avatar or Initials
      if (img && img.src) {
        try {
          const b64 = await urlToBase64(img.src);
          // Usamos un ID único para el clip-path del nodo
          const clipId = `clip-${Math.random().toString(36).substr(2, 9)}`;
          nodesSvgString += `
            <defs>
              <clipPath id="${clipId}">
                ${shapeSvg.replace(/fill=".*?"/, '').replace(/stroke=".*?"/, '')}
              </clipPath>
            </defs>
            <image x="${x}" y="${y}" width="${w}" height="${h}" href="${b64}" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"></image>
          `;
        } catch (e) {
          console.error('Failed to encode image for PDF', e);
        }
      } else if (fallbackSpan) {
        nodesSvgString += `<text x="${cx}" y="${cy}" fill="#ffffff" font-size="24" font-family="sans-serif" font-weight="bold" text-anchor="middle" dominant-baseline="central">${fallbackSpan.textContent}</text>`;
      }

      // Draw Name Label if exists
      if (name) {
        nodesSvgString += `<rect x="${cx - (name.length * 4)}" y="${y + h + 8}" width="${name.length * 8}" height="24" fill="#ffffff" rx="12"></rect>`;
        nodesSvgString += `<text x="${cx}" y="${y + h + 24}" fill="#1f2937" font-size="12" font-family="sans-serif" font-weight="600" text-anchor="middle">${name}</text>`;
      }
    }
  }

  // Padding
  minX -= 50;
  minY -= 50;
  maxX += 50;
  maxY += 50;

  const totalWidth = Math.max(800, maxX - minX);
  const totalHeight = Math.max(600, maxY - minY);

  // Construir SVG Monolítico
  const monolithicSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}">
      <rect x="${minX}" y="${minY}" width="${totalWidth}" height="${totalHeight}" fill="#f9fafb"></rect>
      <g id="edges-layer">${edgesGroupString}</g>
      <g id="edge-labels-layer">${edgeLabelsSvgString}</g>
      <g id="nodes-layer">${nodesSvgString}</g>
    </svg>
  `;

  // Parsear el string a un DOM real SVG para svg2pdf
  const parser = new DOMParser();
  const svgDocument = parser.parseFromString(monolithicSvg, "image/svg+xml");
  const svgElement = svgDocument.documentElement;

  // Crear documento PDF de un tamaño que abarque el viewport
  const pdf = new jsPDF({
    orientation: totalWidth > totalHeight ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [totalWidth, totalHeight]
  });

  // Renderizar
  await pdf.svg(svgElement, {
    x: 0,
    y: 0,
    width: totalWidth,
    height: totalHeight
  });

  pdf.save('cerebro_externo_mapa.pdf');
}
