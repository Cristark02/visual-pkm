import { jsPDF } from 'jspdf';
import 'svg2pdf.js';
import { useStore } from '../store/useStore';

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

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
}

const FONT_FAMILY = "Arial, Helvetica, sans-serif";

/**
 * Transmuta el grafo de React Flow (HTML + SVG) a un documento SVG monolítico
 * puro, sin foreignObjects, para exportarlo a PDF en alta fidelidad.
 */
export async function exportToVectorPDF() {
  const flowPane = document.querySelector('.react-flow__pane') as HTMLElement;
  if (!flowPane) return;

  const storeState = useStore.getState();
  const storeNodes = storeState.nodes;

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

    const match = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
    if (!match) continue;

    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    const color = label.style.color || '#3b82f6';

    // Generar halo blanco para legibilidad y luego el texto
    edgeLabelsSvgString += `<text x="${x}" y="${y}" fill="white" stroke="white" stroke-width="4" stroke-linejoin="round" font-size="10" font-family="${FONT_FAMILY}" font-weight="900" text-anchor="middle" dominant-baseline="central" letter-spacing="1.5">${text}</text>`;
    edgeLabelsSvgString += `<text x="${x}" y="${y}" fill="${color}" font-size="10" font-family="${FONT_FAMILY}" font-weight="900" text-anchor="middle" dominant-baseline="central" letter-spacing="1.5">${text}</text>`;
  }

  // 2. Extraer los Nodos HTML y transmutarlos a SVG primitivo
  const nodesHtml = document.querySelectorAll('.react-flow__node');
  let nodesSvgString = '';
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (let i = 0; i < nodesHtml.length; i++) {
    const node = nodesHtml[i] as HTMLElement;
    const nodeId = node.getAttribute('data-id');
    const storeNode = storeNodes.find(n => n.id === nodeId);
    
    const transform = node.style.transform;
    const match = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
    if (!match) continue;
    
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    const w = node.offsetWidth;
    const h = node.offsetHeight;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);

    const isCluster = node.classList.contains('react-flow__node-cluster');
    
    if (isCluster) {
      const svgG = node.querySelector('svg g');
      const innerSvg = svgG ? svgG.innerHTML : '';
      let fill = svgG?.getAttribute('fill') || 'rgba(238, 242, 255, 0.3)';
      let fillOpacity = "1";

      // svg2pdf.js no soporta bien hex con alpha (#RRGGBBAA), separar la opacidad
      if (fill.startsWith('#') && fill.length === 9) {
        fillOpacity = (parseInt(fill.substring(7, 9), 16) / 255).toFixed(2);
        fill = fill.substring(0, 7);
      }

      const stroke = svgG?.getAttribute('stroke') || '#c7d2fe';
      const strokeWidth = svgG?.getAttribute('stroke-width') || '2';
      const strokeDasharray = svgG?.getAttribute('stroke-dasharray') || '8 8';
      
      const label = storeNode?.data?.semanticLabel || 'GRUPO';
      const labelColor = storeNode?.data?.color || '#312e81';

      if (innerSvg) {
        // En lugar de usar viewBox y escalar (lo cual svg2pdf falla al aplicar vector-effect="non-scaling-stroke"
        // engordando enormemente los bordes y los dashes), mapeamos las primitivas a coordenadas absolutas.
        const shapeDoc = new DOMParser().parseFromString(`<svg>${innerSvg}</svg>`, 'image/svg+xml');
        const shape = shapeDoc.querySelector('ellipse, rect, polygon');
        let newShapeSvg = '';

        if (shape) {
          if (shape.tagName === 'ellipse') {
             const cx = x + (parseFloat(shape.getAttribute('cx')||'50') / 100) * w;
             const cy = y + (parseFloat(shape.getAttribute('cy')||'50') / 100) * h;
             const rx = (parseFloat(shape.getAttribute('rx')||'50') / 100) * w;
             const ry = (parseFloat(shape.getAttribute('ry')||'50') / 100) * h;
             newShapeSvg = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" />`;
          } else if (shape.tagName === 'rect') {
             const rxAttr = shape.getAttribute('rx');
             const nx = x + (parseFloat(shape.getAttribute('x')||'0') / 100) * w;
             const ny = y + (parseFloat(shape.getAttribute('y')||'0') / 100) * h;
             const nw = (parseFloat(shape.getAttribute('width')||'100') / 100) * w;
             const nh = (parseFloat(shape.getAttribute('height')||'100') / 100) * h;
             const corner = rxAttr ? parseFloat(rxAttr) * 2 : 16;
             newShapeSvg = `<rect x="${nx}" y="${ny}" width="${nw}" height="${nh}" rx="${corner}" />`;
          } else if (shape.tagName === 'polygon') {
             const points = shape.getAttribute('points') || '';
             const pairs = points.trim().split(/[\s,]+/);
             const mapped = [];
             for (let j = 0; j < pairs.length; j+=2) {
                 const px = parseFloat(pairs[j]);
                 const py = parseFloat(pairs[j+1]);
                 if (!isNaN(px) && !isNaN(py)) {
                     mapped.push(`${x + (px/100)*w},${y + (py/100)*h}`);
                 }
             }
             newShapeSvg = `<polygon points="${mapped.join(' ')}" />`;
          }
        }

        if (newShapeSvg) {
          nodesSvgString += `
            <g fill="${fill}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDasharray}">
              ${newShapeSvg}
            </g>
          `;
        }
      } else {
        nodesSvgString += `
          <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDasharray}" rx="16" ry="16"></rect>
        `;
      }
      
      nodesSvgString += `<text x="${x + w/2}" y="${y + h/2}" fill="${labelColor}" font-size="20" font-family="${FONT_FAMILY}" font-weight="900" text-anchor="middle" dominant-baseline="central" opacity="0.6">${label}</text>`;
    } else {
      // Dibujar IndividualNode
      const innerDiv = node.querySelector('div > div') as HTMLElement;
      if (!innerDiv) continue;

      const clipPath = innerDiv.style.clipPath || '';
      
      const givenName = storeNode?.data?.identity?.givenName || '';
      const familyName = storeNode?.data?.identity?.familyName || '';
      const fullName = [givenName, familyName].filter(Boolean).join(' ');
      const alias = storeNode?.data?.identity?.alias || '';
      
      const name = alias || fullName || storeNode?.data?.semanticLabel || 'Nodo';
      const initials = getInitials(name);
      
      const bgColor = stringToColor(fullName || alias || 'X');
      const nodeColor = storeNode?.data?.color;
      const borderColor = nodeColor || '#e5e7eb';
      const textColor = nodeColor || '#374151';
      
      const img = innerDiv.querySelector('img');

      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = w / 2;

      let shapeSvg = '';

      if (clipPath.includes('polygon')) {
        // Star fallback
        shapeSvg = `<polygon points="${x+w/2},${y} ${x+w},${y+h} ${x},${y+h}" fill="${bgColor}" stroke="${borderColor}" stroke-width="4" />`;
      } else if (clipPath.includes('path')) {
        // Heart fallback
        shapeSvg = `<path d="M${cx},${y+h*0.3} C${cx-w/2},${y-h*0.2} ${x-w/4},${y+h*0.8} ${cx},${y+h} C${x+w+w/4},${y+h*0.8} ${cx+w/2},${y-h*0.2} ${cx},${y+h*0.3} Z" fill="${bgColor}" stroke="${borderColor}" stroke-width="4" />`;
      } else if (innerDiv.className.includes('rounded-xl') || clipPath.includes('rect')) {
        // Square
        shapeSvg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bgColor}" stroke="${borderColor}" stroke-width="4" rx="12" ry="12"></rect>`;
      } else {
        // Circle (Default)
        shapeSvg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${bgColor}" stroke="${borderColor}" stroke-width="4"></circle>`;
      }

      nodesSvgString += shapeSvg;

      // Draw Avatar or Initials
      if (img && img.src) {
        try {
          const b64 = await urlToBase64(img.src);
          const clipId = `clip-${Math.random().toString(36).substr(2, 9)}`;
          
          // Background for transparent images
          nodesSvgString += shapeSvg.replace(`fill="${bgColor}"`, `fill="#ffffff"`);
          
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
      } else if (initials) {
        nodesSvgString += `<text x="${cx}" y="${cy}" fill="#ffffff" font-size="24" font-family="${FONT_FAMILY}" font-weight="900" text-anchor="middle" dominant-baseline="central">${initials}</text>`;
      }

      // Draw Name Label if exists
      if (name) {
        const charWidth = 6.5; // Aproximación
        const textWidth = name.length * charWidth;
        const rectWidth = Math.max(textWidth + 16, 40);
        
        nodesSvgString += `<rect x="${cx - (rectWidth / 2)}" y="${y + h + 6}" width="${rectWidth}" height="22" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" rx="10" filter="url(#drop-shadow)"></rect>`;
        nodesSvgString += `<text x="${cx}" y="${y + h + 21}" fill="${textColor}" font-size="11" font-family="${FONT_FAMILY}" font-weight="bold" text-anchor="middle">${name}</text>`;
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
      <defs>
        <filter id="drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.1" />
        </filter>
      </defs>
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
