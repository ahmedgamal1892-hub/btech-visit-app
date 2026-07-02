import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function loadCairoFontBase64(): string {
  const fontPath = join(process.cwd(), 'src/assets/fonts/Cairo-Regular.ttf')
  return readFileSync(fontPath).toString('base64')
}

const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80">
      <rect width="120" height="80" fill="#f3f4f6" stroke="#d1d5db"/>
      <text x="60" y="44" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#6b7280">Placeholder</text>
    </svg>`,
  ).toString('base64')

export function buildSampleHtml(): string {
  const cairoBase64 = loadCairoFontBase64()

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Production PDF Spike</title>
  <style>
    @font-face {
      font-family: 'Cairo';
      src: url('data:font/ttf;base64,${cairoBase64}') format('truetype');
      font-weight: normal;
      font-style: normal;
    }

    @page {
      size: A4;
      margin: 12mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Cairo', system-ui, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #111827;
      margin: 0;
      padding: 0;
    }

    h1 {
      font-size: 18pt;
      margin: 0 0 8mm;
      color: #ff6a00;
    }

    h2 {
      font-size: 13pt;
      margin: 6mm 0 3mm;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 2mm;
    }

    .section {
      margin-bottom: 5mm;
    }

    .ltr {
      direction: ltr;
      text-align: left;
      unicode-bidi: isolate;
    }

    .rtl {
      direction: rtl;
      text-align: right;
      unicode-bidi: isolate;
    }

    .mixed {
      direction: rtl;
      text-align: right;
      unicode-bidi: plaintext;
    }

    .model {
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 3mm;
      font-size: 11pt;
    }

    th,
    td {
      border: 1px solid #d1d5db;
      padding: 6px 8px;
    }

    th {
      background: #fff7ed;
      color: #9a3412;
      font-weight: 700;
    }

    .images {
      display: flex;
      gap: 8mm;
      margin-top: 4mm;
    }

    .images img {
      border: 1px solid #d1d5db;
      border-radius: 4px;
    }

    .caption {
      font-size: 9pt;
      color: #6b7280;
      margin-top: 2mm;
    }
  </style>
</head>
<body>
  <h1>Production PDF Spike — BTECH Visit App</h1>

  <div class="section rtl">
    <h2>فقرة عربية (RTL)</h2>
    <p>هذا تقرير تجريبي للتحقق من إنشاء ملف PDF على Vercel باستخدام Playwright و Chromium. يجب أن تظهر الحروف العربية بشكل صحيح مع خط Cairo.</p>
  </div>

  <div class="section ltr">
    <h2>English Paragraph (LTR)</h2>
    <p>This is a production validation spike for HTML-to-PDF generation. English text should render left-to-right with correct line breaks and typography.</p>
  </div>

  <div class="section mixed">
    <h2>نص مختلط / Mixed Arabic + English</h2>
    <p>تم فحص المنتج AQD1070D 497 XEX في فرع Main Branch — الحالة: OK / Passed inspection.</p>
  </div>

  <div class="section ltr">
    <h2>Product Model</h2>
    <p class="model">AQD1070D 497 XEX</p>
  </div>

  <div class="section">
    <h2>جدول بسيط / Simple Table</h2>
    <table>
      <thead>
        <tr>
          <th>البند / Item</th>
          <th>القيمة / Value</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Model Number</td>
          <td class="ltr model">AQD1070D 497 XEX</td>
          <td>OK</td>
        </tr>
        <tr>
          <td>الفرع</td>
          <td class="rtl">الفرع الرئيسي — القاهرة</td>
          <td>OK</td>
        </tr>
        <tr>
          <td>Inspector</td>
          <td>Ahmed / أحمد</td>
          <td>Done</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>صور / Images</h2>
    <div class="images">
      <div>
        <img src="${PLACEHOLDER_IMAGE}" width="120" height="80" alt="Placeholder logo" />
        <p class="caption">Logo placeholder</p>
      </div>
      <div>
        <img src="${PLACEHOLDER_IMAGE}" width="120" height="80" alt="Placeholder photo" />
        <p class="caption">Photo placeholder</p>
      </div>
    </div>
  </div>
</body>
</html>`
}
