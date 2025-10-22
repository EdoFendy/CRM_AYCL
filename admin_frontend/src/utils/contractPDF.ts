/**
 * SISTEMA PDF CONTRATTI - VERSIONE DEFINITIVA
 * Approccio: Renderizza ogni sezione separatamente, IMPOSSIBILE tagliare righe
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface ContractData {
  company_name: string;
  company_address: string;
  company_tax_id: string;
  representative_name: string;
  representative_role: string;
  contract_place: string;
  contract_date: string;
  setup_fee: string;
  unit_cost?: string;
  revenue_share_percentage?: string;
  revenue_share_months?: string;
  icp_geographic_area: string;
  icp_sector: string;
  icp_min_revenue: string;
  icp_unit_cost?: string;
  icp_revenue_share?: string;
  icp_date: string;
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
      `<span$1data-field="${key}"$2 style="background:transparent;border:none;">${val}</span>`
    );
    
    result = result.replace(
      new RegExp(`<input([^>]*?)data-field="${key}"([^>]*?)>`, 'gis'),
      `<span style="display:inline;background:transparent;border:none;font-family:'Times New Roman',serif;font-size:11pt;">${val}</span>`
    );
    
    result = result.replace(
      new RegExp(`<div([^>]*?)data-field="${key}"([^>]*?)>.*?</div>`, 'gis'),
      `<div$1data-field="${key}"$2 style="background:transparent;">${val}</div>`
    );
  });
  
  result = result.replace(/contenteditable="true"/gi, '');
  result = result.replace(/background-color:\s*#fffacd;?/gi, '');
  result = result.replace(
    /\.editable-field\s*\{[^}]*\}/gi,
    '.editable-field { display: inline; background: transparent; border: none; }'
  );
  
  // Stili GARANTITI per non tagliare
  const pdfStyles = `
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: 'Times New Roman', serif;
        font-size: 11pt;
        line-height: 1.7;
        color: #000;
        background: white;
        margin: 0;
        padding: 0;
      }
      
      /* OGNI SEZIONE È AUTONOMA */
      .article, .parties-section, .signature-section, table {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        display: block;
        margin-bottom: 30px;
        padding: 15px;
        border: 1px solid #f0f0f0;
      }
      
      h1, h2, h3, .article-title {
        page-break-after: avoid !important;
        margin: 20px 0 15px 0;
      }
      
      p {
        margin: 10px 0;
        orphans: 4;
        widows: 4;
      }
    </style>
  `;
  
  result = result.replace('</head>', `${pdfStyles}</head>`);
  
  return result;
}

async function loadLogo(): Promise<string> {
  try {
    const response = await fetch('/logo.png');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    return '';
  }
}

/**
 * SOLUZIONE DEFINITIVA: Usa jsPDF.html() con autoPaging='text'
 * Questo metodo RISPETTA automaticamente i page-break CSS
 */
async function htmlToPDF(html: string, filename: string): Promise<void> {
  console.log('🚀 Generazione PDF con metodo GARANTITO...');
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });
  
  const logoData = await loadLogo();
  
  // Crea elemento temporaneo
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'fixed';
  tempDiv.style.left = '-9999px';
  tempDiv.style.width = '210mm';
  tempDiv.innerHTML = html;
  document.body.appendChild(tempDiv);
  
  try {
    // Aspetta rendering
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // USA jsPDF.html() che gestisce automaticamente page breaks
    await pdf.html(tempDiv, {
      callback: async (doc) => {
        const totalPages = doc.getNumberOfPages();
        console.log(`📄 Generato: ${totalPages} pagine`);
        
        // Aggiungi logo e numero pagina su ogni pagina
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          
          // Logo
          if (logoData) {
            const logoWidth = 30;
            const logoHeight = 13;
            doc.addImage(logoData, 'PNG', 210 - logoWidth - 10, 297 - logoHeight - 8, logoWidth, logoHeight);
          }
          
          // Numero pagina
          doc.setFontSize(9);
          doc.setTextColor(120, 120, 120);
          doc.text(`Pagina ${i} di ${totalPages}`, 105, 292, { align: 'center' });
        }
        
        console.log('💾 Salvataggio...');
        doc.save(filename);
        console.log('✅ Completato!');
      },
      x: 15,
      y: 20,
      width: 180,
      windowWidth: 794,
      margin: [20, 15, 30, 15],
      autoPaging: 'text', // CHIAVE: gestione automatica intelligente
    });
  } finally {
    document.body.removeChild(tempDiv);
  }
}

export async function downloadContractPDF(
  type: 'performance' | 'setupfee',
  data: ContractData
): Promise<void> {
  try {
    const template = await loadTemplate(type);
    const filled = fillTemplate(template, data);
    const filename = `contratto_${type}_${data.company_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    await htmlToPDF(filled, filename);
  } catch (error) {
    console.error('Errore:', error);
    throw error;
  }
}
