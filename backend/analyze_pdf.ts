import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs/promises';

async function analyze() {
  const data = new Uint8Array(await fs.readFile('../test.pdf'));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true, disableFontFace: true }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  
  console.log(`Page 1 has ${content.items.length} items.`);
  content.items.slice(0, 20).forEach((item: any) => {
    console.log(JSON.stringify({
      str: item.str,
      hasEOL: item.hasEOL,
      transform: item.transform // [scaleX, skewY, skewX, scaleY, x, y]
    }));
  });
}

analyze().catch(console.error);
