/**
 * Contract PDF Generation Utility
 * Adapted from admin_frontend for seller_frontend
 * 
 * Note: Requires jspdf and html2canvas packages
 * Install with: npm install jspdf html2canvas
 */

import type { ContractData } from '@types/contracts';

// Dynamic imports to handle missing dependencies gracefully
let jsPDF: any;
let html2canvas: any;

async function loadPDFLibraries() {
  if (!jsPDF || !html2canvas) {
    try {
      const jsPDFModule = await import('jspdf');
      const html2canvasModule = await import('html2canvas');
      jsPDF = jsPDFModule.jsPDF;
      html2canvas = html2canvasModule.default;
    } catch (error) {
      throw new Error(
        'PDF libraries not installed. Please run: npm install jspdf html2canvas'
      );
    }
  }
}

async function loadTemplate(type: 'performance' | 'setupfee'): Promise<string> {
  const filename = type === 'performance' 
    ? 'Performance_Contract_Formatted.html' 
    : 'SetUpFee_Contract_Formatted.html';
  
  const response = await fetch(`/contracts_form/${filename}`);
  if (!response.ok) {
    throw new Error(`Template non trovato: ${filename}`);
  }
  return response.text();
}

function fillTemplate(html: string, data: ContractData): string {
  let result = html;
  
  console.log('📝 Compilazione template');
  
  Object.entries(data).forEach(([key, value]) => {
    const val = value || 'Da definire';
    
    result = result.replace(
      new RegExp(`<span([^>]*?)data-field="${key}"([^>]*?)>.*?</span>`, 'gis'),
      `<span$1data-field="${key}"$2>${val}</span>`
    );
  });
  
  return result;
}

async function renderToCanvas(html: string): Promise<HTMLCanvasElement> {
  await loadPDFLibraries();
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '0';
  tempDiv.style.width = '210mm'; // A4 width
  tempDiv.style.fontSize = '12px';
  tempDiv.style.lineHeight = '1.4';
  tempDiv.style.fontFamily = 'Arial, sans-serif';
  
  document.body.appendChild(tempDiv);
  
  try {
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794, // A4 width in pixels at 96 DPI
      height: tempDiv.scrollHeight
    });
    
    return canvas;
  } finally {
    document.body.removeChild(tempDiv);
  }
}

export async function downloadContractPDF(type: 'performance' | 'setupfee', data: ContractData): Promise<void> {
  try {
    await loadPDFLibraries();
    
    console.log('🚀 Inizio generazione PDF contratto:', type);
    
    // Carica template
    const template = await loadTemplate(type);
    console.log('📄 Template caricato');
    
    // Compila template
    const filledTemplate = fillTemplate(template, data);
    console.log('✏️ Template compilato');
    
    // Renderizza in canvas
    const canvas = await renderToCanvas(filledTemplate);
    console.log('🎨 Canvas generato');
    
    // Crea PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    // Salva PDF
    const fileName = `Contratto_${type}_${data.company_name}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
    console.log('✅ PDF generato e scaricato:', fileName);
    
  } catch (error) {
    console.error('❌ Errore generazione PDF:', error);
    throw error;
  }
}

export function generateContractFileName(type: 'performance' | 'setupfee', companyName: string): string {
  const sanitizedName = companyName.replace(/[^a-zA-Z0-9]/g, '_');
  const date = new Date().toISOString().split('T')[0];
  return `Contratto_${type}_${sanitizedName}_${date}.pdf`;
}
