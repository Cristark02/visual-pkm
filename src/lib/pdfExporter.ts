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
 */
export async function exportToVectorPDF() {
  const flowPane = document.querySelector('.react-flow__pane') as HTMLElement;
  if (!flowPane) return;

  // Encontramos el viewport para calcular los límites
  const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
  if (!viewport) return;

  // 1. Clonar las aristas (edges) que ya son SVG puros
  const edgesSvg = document.querySelector('.react-flow__edges') as SVGSVGElement;
  let edgesGroupString = '';
  if (edgesSvg) {
    const g = edgesSvg.querySelector('g');
    if (g) {
      edgesGroupString = g.innerHTML;
    }
  }

  // 2. Extraer los Nodos HTML y transmutarlos a SVG primitivo
  const nodesHtml = document.querySelectorAll('.react-flow__node');
  let nodesSvgString = '';
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (let i = 0; i < nodesHtml.length; i++) {
    const node = nodesHtml[i] as HTMLElement;
    // La posición está en el transform del estilo
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
      // Dibujar Cluster como <rect>
      const label = node.querySelector('h3')?.textContent || '';
      nodesSvgString += `
        <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(243, 244, 246, 0.3)" stroke="#d1d5db" stroke-width="2" stroke-dasharray="8 4" rx="16" ry="16"></rect>
        <text x="${x + 12}" y="${y + 24}" fill="#4b5563" font-size="12" font-family="sans-serif" font-weight="bold">${label}</text>
      `;
    } else {
      // Dibujar IndividualNode
      const innerDiv = node.querySelector('div > div') as HTMLElement;
      if (!innerDiv) continue;

      const bg = innerDiv.style.backgroundColor || '#ffffff';
      const clipPath = innerDiv.style.clipPath || '';
      const name = node.querySelector('.group-hover\\:opacity-100')?.textContent || '';
      const img = innerDiv.querySelector('img');
      const span = innerDiv.querySelector('span');

      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = w / 2;

      let shapeSvg = '';

      if (clipPath.includes('polygon')) {
        // Star fallback (simplified approximation inside a rect/polygon)
        shapeSvg = `<polygon points="${x+w/2},${y} ${x+w},${y+h} ${x},${y+h}" fill="${bg}" stroke="#9ca3af" stroke-width="2" />`;
      } else if (clipPath.includes('path')) {
        // Heart fallback
        shapeSvg = `<path d="M${cx},${y+h*0.3} C${cx-w/2},${y-h*0.2} ${x-w/4},${y+h*0.8} ${cx},${y+h} C${x+w+w/4},${y+h*0.8} ${cx+w/2},${y-h*0.2} ${cx},${y+h*0.3} Z" fill="${bg}" stroke="#9ca3af" stroke-width="2" />`;
      } else if (innerDiv.className.includes('rounded-xl')) {
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
          // Insert image bounded by the shape
          nodesSvgString += `<image x="${x}" y="${y}" width="${w}" height="${h}" href="${b64}" clip-path="url(#circleClip)" preserveAspectRatio="xMidYMid slice"></image>`;
        } catch (e) {
          console.error('Failed to encode image for PDF', e);
        }
      } else if (span) {
        nodesSvgString += `<text x="${cx}" y="${cy + 5}" fill="#ffffff" font-size="16" font-family="sans-serif" font-weight="bold" text-anchor="middle">${span.textContent}</text>`;
      }

      // Draw Label
      nodesSvgString += `<rect x="${cx - (name.length * 4)}" y="${y + h + 8}" width="${name.length * 8}" height="20" fill="rgba(255,255,255,0.8)" rx="4"></rect>`;
      nodesSvgString += `<text x="${cx}" y="${y + h + 22}" fill="#1f2937" font-size="10" font-family="sans-serif" font-weight="500" text-anchor="middle">${name}</text>`;
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
      <defs>
        <clipPath id="circleClip">
          <circle cx="50%" cy="50%" r="50%" />
        </clipPath>
      </defs>
      <rect x="${minX}" y="${minY}" width="${totalWidth}" height="${totalHeight}" fill="#f9fafb"></rect>
      <g id="edges-layer">${edgesGroupString}</g>
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
