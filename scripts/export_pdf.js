const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// 1. Locate Chrome or Edge
function findBrowser() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Chrome or Edge browser not found!');
}

const browserPath = findBrowser();
const workspaceDir = path.resolve(__dirname, '..');
const indexHtmlPath = path.join(workspaceDir, 'index.html');
const continuousPdfPath = path.join(workspaceDir, 'Vu-Ngoc-Minh-CV-Continuous.pdf');
const a4PdfPath = path.join(workspaceDir, 'Vu-Ngoc-Minh-CV-A4.pdf');

console.log(`Using browser: ${browserPath}`);

// Helper to run headless browser print
function generatePdf(tempHtmlPath, outputPath) {
  execFileSync(browserPath, [
    '--headless=new',
    '--no-pdf-header-footer',
    '--disable-gpu',
    `--print-to-pdf=${outputPath}`,
    `file:///${tempHtmlPath.replace(/\\/g, '/')}`
  ], { stdio: 'pipe' });
}

// 2. Measure content height for Continuous PDF
let originalHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// Measure height script
const measureHtml = originalHtml.replace('</body>', `
  <script>
    window.addEventListener('load', () => {
      const main = document.querySelector('main');
      const height = main ? main.scrollHeight : document.body.scrollHeight;
      document.title = "HEIGHT:" + height;
    });
  </script>
</body>`);

const tempMeasureFile = path.join(workspaceDir, 'temp_measure.html');
fs.writeFileSync(tempMeasureFile, measureHtml, 'utf8');

let renderedHeightPx = 6500;
try {
  const domOut = execFileSync(browserPath, [
    '--headless=new',
    '--virtual-time-budget=2000',
    '--dump-dom',
    `file:///${tempMeasureFile.replace(/\\/g, '/')}`
  ], { encoding: 'utf8' });
  const m = domOut.match(/<title>HEIGHT:(\d+)<\/title>/);
  if (m && m[1]) {
    renderedHeightPx = parseInt(m[1], 10);
  }
} catch (e) {
  console.warn('Could not auto-measure, using fallback height');
} finally {
  if (fs.existsSync(tempMeasureFile)) fs.unlinkSync(tempMeasureFile);
}

// Calculate mm: (px * 25.4 / 96) + margin
// At 96 DPI, 1px ≈ 0.264583 mm. Adding 40mm buffer for header/footer margins.
const continuousHeightMm = Math.ceil((renderedHeightPx * 25.4) / 96) + 50;
console.log(`Detected content height: ${renderedHeightPx}px => ${continuousHeightMm}mm`);

// 3. Generate Continuous Single-Page PDF (NO PAGE BREAKS)
const continuousStyle = `
  <style>
    @media print {
      @page {
        size: 210mm ${continuousHeightMm}mm !important;
        margin: 10mm 12mm !important;
      }
      * {
        break-inside: auto !important;
        page-break-inside: auto !important;
        break-after: auto !important;
        page-break-after: auto !important;
      }
    }
  </style>
`;
const continuousHtml = originalHtml.replace('</head>', `${continuousStyle}</head>`);
const tempContinuousFile = path.join(workspaceDir, 'temp_continuous.html');
fs.writeFileSync(tempContinuousFile, continuousHtml, 'utf8');

console.log('Generating Continuous PDF (1 single continuous page, no breaks)...');
generatePdf(tempContinuousFile, continuousPdfPath);
fs.unlinkSync(tempContinuousFile);

// Check continuous PDF page count
const contBytes = fs.readFileSync(continuousPdfPath);
const contPages = (contBytes.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
console.log(`Continuous PDF created: ${continuousPdfPath} (${contBytes.length} bytes, ${contPages} page)`);

// 4. Generate A4 Multi-Page PDF with Anti-Cut Page Breaks
const tempA4File = path.join(workspaceDir, 'temp_a4.html');
fs.writeFileSync(tempA4File, originalHtml, 'utf8');
console.log('Generating A4 Multi-Page PDF (optimized anti-cut page breaks)...');
generatePdf(tempA4File, a4PdfPath);
fs.unlinkSync(tempA4File);

const a4Bytes = fs.readFileSync(a4PdfPath);
const a4Pages = (a4Bytes.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
console.log(`A4 Multi-page PDF created: ${a4PdfPath} (${a4Bytes.length} bytes, ${a4Pages} pages)`);
console.log('Done! Both PDFs generated successfully.');
