// server/pdf/renderer.ts
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// server/pdf/production-pdf-spike/generate-pdf.ts
import { chromium as playwrightChromium } from "playwright-core";

// server/pdf/production-pdf-spike/wait-for-report-images.ts
var IMAGE_TIMEOUT_MS = 2e4;
async function waitForImageLocator(page, selector, index = 0) {
  const locator = page.locator(selector).nth(index);
  const count = await page.locator(selector).count();
  if (index >= count) {
    return;
  }
  await locator.scrollIntoViewIfNeeded();
  await locator.evaluate(
    (element, timeoutMs) => new Promise((resolve) => {
      const img = element;
      img.loading = "eager";
      const finish = () => {
        if (typeof img.decode === "function") {
          void img.decode().finally(resolve);
          return;
        }
        resolve();
      };
      if (img.complete && img.naturalWidth > 0) {
        finish();
        return;
      }
      const timer = window.setTimeout(finish, timeoutMs);
      const done = () => {
        window.clearTimeout(timer);
        finish();
      };
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
      const src = img.currentSrc || img.getAttribute("src");
      if (src) {
        img.src = src;
      }
    }),
    IMAGE_TIMEOUT_MS
  );
}
async function waitForReportImages(page) {
  await page.setViewportSize({ width: 794, height: 1123 });
  const photoCount = await page.locator(".report-photo-grid__image").count();
  for (let index = 0; index < photoCount; index += 1) {
    await waitForImageLocator(page, ".report-photo-grid__image", index);
  }
  if (await page.locator(".report-header__logo-image").count()) {
    await waitForImageLocator(page, ".report-header__logo-image", 0);
  }
  await page.waitForLoadState("networkidle", { timeout: 15e3 }).catch(() => {
  });
  await page.evaluate(async () => {
    const replaceWithUnavailable = (img) => {
      const placeholder = document.createElement("div");
      placeholder.className = "report-photo-grid__placeholder report-photo-grid__image report-photo-grid__image--unavailable";
      placeholder.setAttribute("role", "img");
      placeholder.setAttribute("aria-label", "Image unavailable");
      placeholder.textContent = "Image unavailable";
      img.replaceWith(placeholder);
    };
    const retryImage = (img) => new Promise((resolve) => {
      const finish = () => {
        if (typeof img.decode === "function") {
          void img.decode().finally(resolve);
          return;
        }
        resolve();
      };
      if (img.complete && img.naturalWidth > 0) {
        finish();
        return;
      }
      img.addEventListener("load", finish, { once: true });
      img.addEventListener("error", finish, { once: true });
      const src = img.currentSrc || img.getAttribute("src");
      if (src) {
        img.src = src;
      } else {
        finish();
      }
    });
    const images = Array.from(
      document.querySelectorAll(".report-photo-grid__image")
    );
    for (const img of images) {
      img.loading = "eager";
      img.scrollIntoView({ block: "center" });
      await retryImage(img);
      if (!img.isConnected) {
        continue;
      }
      if (!img.complete || img.naturalWidth === 0) {
        replaceWithUnavailable(img);
      }
    }
  });
}

// server/pdf/production-pdf-spike/generate-pdf.ts
async function launchBrowser() {
  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return playwrightChromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true
    });
  }
  try {
    return await playwrightChromium.launch({
      channel: "chrome",
      headless: true
    });
  } catch {
    const { chromium } = await import("playwright");
    return chromium.launch({ headless: true });
  }
}
async function generatePdfFromHtml(html) {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "domcontentloaded"
    });
    await waitForReportImages(page);
    await page.emulateMedia({ media: "print" });
    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0"
      }
    });
    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
}

// server/pdf/components/ReportMixedText.tsx
import { jsx } from "react/jsx-runtime";
function ReportMixedText({ text }) {
  return /* @__PURE__ */ jsx("bdi", { dir: "auto", children: text });
}
function ReportDirectionalText({
  text,
  direction
}) {
  return /* @__PURE__ */ jsx("span", { dir: direction, children: text });
}

// server/pdf/components/ReportBadge.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
function ReportBadge({ label, tone }) {
  return /* @__PURE__ */ jsx2("span", { className: `report-badge report-badge--${tone}`, children: /* @__PURE__ */ jsx2(ReportMixedText, { text: label }) });
}

// server/pdf/components/BranchPerformanceTable.tsx
import { jsx as jsx3, jsxs } from "react/jsx-runtime";
function BranchPerformanceTable({ rows }) {
  if (rows.length === 0) {
    return /* @__PURE__ */ jsx3("p", { className: "report-empty", role: "status", children: "No achievement data available for this branch." });
  }
  return /* @__PURE__ */ jsx3("div", { className: "report-table-wrap", children: /* @__PURE__ */ jsxs("table", { className: "report-table report-table--performance", children: [
    /* @__PURE__ */ jsx3("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
      /* @__PURE__ */ jsx3("th", { scope: "col", children: "Brand" }),
      /* @__PURE__ */ jsx3("th", { scope: "col", children: "Target" }),
      /* @__PURE__ */ jsx3("th", { scope: "col", children: "Actual" }),
      /* @__PURE__ */ jsx3("th", { scope: "col", children: "Achievement %" })
    ] }) }),
    /* @__PURE__ */ jsx3("tbody", { children: rows.map((row) => /* @__PURE__ */ jsxs("tr", { children: [
      /* @__PURE__ */ jsx3("td", { children: /* @__PURE__ */ jsx3(ReportMixedText, { text: row.brand }) }),
      /* @__PURE__ */ jsx3("td", { className: "report-table__numeric", children: /* @__PURE__ */ jsx3(ReportDirectionalText, { text: row.target, direction: "ltr" }) }),
      /* @__PURE__ */ jsx3("td", { className: "report-table__numeric", children: /* @__PURE__ */ jsx3(ReportDirectionalText, { text: row.actual, direction: "ltr" }) }),
      /* @__PURE__ */ jsx3("td", { className: "report-table__numeric", children: /* @__PURE__ */ jsx3(
        ReportBadge,
        {
          label: row.achievementPercent,
          tone: row.achievementTone
        }
      ) })
    ] }, row.brand)) })
  ] }) });
}

// server/pdf/components/GeneralNotesCard.tsx
import { jsx as jsx4 } from "react/jsx-runtime";
function GeneralNotesCard({ html }) {
  if (!html.trim()) {
    return /* @__PURE__ */ jsx4("p", { className: "report-empty", role: "status", children: "No general notes." });
  }
  return /* @__PURE__ */ jsx4("article", { className: "report-general-notes", children: /* @__PURE__ */ jsx4(
    "div",
    {
      className: "report-general-notes__content",
      dir: "auto",
      dangerouslySetInnerHTML: { __html: html }
    }
  ) });
}

// server/pdf/components/InspectionTable.tsx
import { jsx as jsx5, jsxs as jsxs2 } from "react/jsx-runtime";
function InspectionTable({ items }) {
  if (items.length === 0) {
    return /* @__PURE__ */ jsx5("p", { className: "report-empty", role: "status", children: "No inspection items reported." });
  }
  return /* @__PURE__ */ jsx5("div", { className: "report-table-wrap", children: /* @__PURE__ */ jsxs2("table", { className: "report-table report-table--inspection", children: [
    /* @__PURE__ */ jsxs2("colgroup", { children: [
      /* @__PURE__ */ jsx5("col", { className: "report-table__col-brand" }),
      /* @__PURE__ */ jsx5("col", { className: "report-table__col-product" }),
      /* @__PURE__ */ jsx5("col", { className: "report-table__col-status" }),
      /* @__PURE__ */ jsx5("col", { className: "report-table__col-notes" })
    ] }),
    /* @__PURE__ */ jsx5("thead", { children: /* @__PURE__ */ jsxs2("tr", { children: [
      /* @__PURE__ */ jsx5("th", { scope: "col", children: "Brand" }),
      /* @__PURE__ */ jsx5("th", { scope: "col", children: "Product Name" }),
      /* @__PURE__ */ jsx5("th", { scope: "col", children: "Status" }),
      /* @__PURE__ */ jsx5("th", { scope: "col", children: "Notes" })
    ] }) }),
    /* @__PURE__ */ jsx5("tbody", { children: items.map((item) => /* @__PURE__ */ jsxs2("tr", { children: [
      /* @__PURE__ */ jsx5("td", { children: /* @__PURE__ */ jsx5(ReportMixedText, { text: item.brand }) }),
      /* @__PURE__ */ jsx5("td", { className: "report-table__text-cell", children: /* @__PURE__ */ jsx5(ReportMixedText, { text: item.productName }) }),
      /* @__PURE__ */ jsx5("td", { className: "report-table__status", children: /* @__PURE__ */ jsx5(ReportBadge, { label: item.status, tone: item.statusTone }) }),
      /* @__PURE__ */ jsx5("td", { className: "report-table__text-cell", children: /* @__PURE__ */ jsx5(ReportMixedText, { text: item.notes }) })
    ] }, item.id)) })
  ] }) });
}

// server/pdf/components/PhotoGrid.tsx
import { jsx as jsx6, jsxs as jsxs3 } from "react/jsx-runtime";
function PhotoGrid({ photos }) {
  if (photos.length === 0) {
    return /* @__PURE__ */ jsx6("p", { className: "report-empty", role: "status", children: "No visit photos." });
  }
  return /* @__PURE__ */ jsx6("ul", { className: "report-photo-grid", children: photos.map((photo) => /* @__PURE__ */ jsx6("li", { className: "report-photo-grid__item", children: /* @__PURE__ */ jsxs3("figure", { className: "report-photo-grid__figure", children: [
    /* @__PURE__ */ jsx6(
      "img",
      {
        className: "report-photo-grid__image",
        src: photo.src,
        alt: photo.alt,
        loading: "eager",
        decoding: "sync"
      }
    ),
    /* @__PURE__ */ jsx6("figcaption", { className: "report-photo-grid__caption", children: /* @__PURE__ */ jsx6(ReportMixedText, { text: photo.alt }) })
  ] }) }, photo.id)) });
}

// server/pdf/components/ReportFooter.tsx
import { jsx as jsx7, jsxs as jsxs4 } from "react/jsx-runtime";
function ReportFooter({ footerText, generatedAt }) {
  return /* @__PURE__ */ jsxs4("footer", { className: "report-footer", dir: "ltr", children: [
    /* @__PURE__ */ jsx7("p", { className: "report-footer__text", children: footerText }),
    /* @__PURE__ */ jsxs4("p", { className: "report-footer__generated", children: [
      "Generated at:",
      " ",
      /* @__PURE__ */ jsx7(ReportDirectionalText, { text: generatedAt, direction: "ltr" })
    ] })
  ] });
}

// server/pdf/components/ReportHeader.tsx
import { jsx as jsx8, jsxs as jsxs5 } from "react/jsx-runtime";
function ReportHeader({
  appName,
  tagline,
  reportTitle,
  logoSrc,
  logoAlt,
  visitNumber,
  visitDate
}) {
  return /* @__PURE__ */ jsxs5("header", { className: "report-header", children: [
    /* @__PURE__ */ jsxs5("div", { className: "report-header__brand", children: [
      logoSrc ? /* @__PURE__ */ jsx8(
        "img",
        {
          className: "report-header__logo-image",
          src: logoSrc,
          alt: logoAlt
        }
      ) : /* @__PURE__ */ jsx8("div", { className: "report-header__logo", "aria-hidden": "true", children: /* @__PURE__ */ jsx8("span", { className: "report-header__logo-label", children: "Logo" }) }),
      /* @__PURE__ */ jsxs5("div", { className: "report-header__brand-copy", dir: "ltr", children: [
        /* @__PURE__ */ jsx8("p", { className: "report-header__app-name", children: appName }),
        /* @__PURE__ */ jsx8("p", { className: "report-header__tagline", children: tagline }),
        /* @__PURE__ */ jsx8("p", { className: "report-header__report-title", children: reportTitle })
      ] })
    ] }),
    /* @__PURE__ */ jsxs5("dl", { className: "report-header__meta", children: [
      /* @__PURE__ */ jsxs5("div", { className: "report-header__meta-item", children: [
        /* @__PURE__ */ jsx8("dt", { className: "report-header__meta-label", children: "Visit Number" }),
        /* @__PURE__ */ jsx8("dd", { className: "report-header__meta-value report-header__meta-value--primary", children: /* @__PURE__ */ jsx8(ReportMixedText, { text: visitNumber }) })
      ] }),
      /* @__PURE__ */ jsxs5("div", { className: "report-header__meta-item", children: [
        /* @__PURE__ */ jsx8("dt", { className: "report-header__meta-label", children: "Visit Date" }),
        /* @__PURE__ */ jsx8("dd", { className: "report-header__meta-value", children: /* @__PURE__ */ jsx8(ReportDirectionalText, { text: visitDate, direction: "ltr" }) })
      ] })
    ] })
  ] });
}

// server/pdf/components/ReportInfoField.tsx
import { jsx as jsx9, jsxs as jsxs6 } from "react/jsx-runtime";
function renderFieldValue(value) {
  if (typeof value === "string") {
    return /* @__PURE__ */ jsx9(ReportMixedText, { text: value });
  }
  return value;
}
function ReportInfoField({ label, value }) {
  return /* @__PURE__ */ jsxs6("div", { className: "report-info-grid__item", children: [
    /* @__PURE__ */ jsx9("dt", { className: "report-info-grid__label", children: label }),
    /* @__PURE__ */ jsx9("dd", { className: "report-info-grid__value", children: renderFieldValue(value) })
  ] });
}

// server/pdf/components/SectionTitle.tsx
import { jsx as jsx10, jsxs as jsxs7 } from "react/jsx-runtime";
function SectionTitle({ title, icon }) {
  const className = icon ? `report-section__title report-section__title--${icon}` : "report-section__title";
  return /* @__PURE__ */ jsxs7("h2", { className, children: [
    icon ? /* @__PURE__ */ jsx10("span", { className: "report-section__icon", "aria-hidden": "true" }) : null,
    /* @__PURE__ */ jsx10("span", { className: "report-section__title-text", children: title })
  ] });
}

// server/pdf/components/SectionCard.tsx
import { jsx as jsx11, jsxs as jsxs8 } from "react/jsx-runtime";
function SectionCard({
  title,
  icon,
  children,
  className
}) {
  return /* @__PURE__ */ jsxs8(
    "section",
    {
      className: className ? `report-section ${className}` : "report-section",
      children: [
        /* @__PURE__ */ jsx11(SectionTitle, { title, icon }),
        /* @__PURE__ */ jsx11("div", { className: "report-section__body", children })
      ]
    }
  );
}

// server/pdf/components/VisitInformationCard.tsx
import { jsx as jsx12, jsxs as jsxs9 } from "react/jsx-runtime";
function VisitInformationCard({
  branchName,
  brandName,
  visitorName,
  visitType,
  visitStatus,
  visitStatusTone,
  createdDate
}) {
  return /* @__PURE__ */ jsxs9("dl", { className: "report-info-grid", children: [
    /* @__PURE__ */ jsx12(ReportInfoField, { label: "Branch", value: branchName }),
    /* @__PURE__ */ jsx12(ReportInfoField, { label: "Brand", value: brandName }),
    /* @__PURE__ */ jsx12(ReportInfoField, { label: "Visitor", value: visitorName }),
    /* @__PURE__ */ jsx12(ReportInfoField, { label: "Visit Type", value: visitType }),
    /* @__PURE__ */ jsx12(
      ReportInfoField,
      {
        label: "Visit Status",
        value: /* @__PURE__ */ jsx12(ReportBadge, { label: visitStatus, tone: visitStatusTone })
      }
    ),
    /* @__PURE__ */ jsx12(ReportInfoField, { label: "Created Date", value: createdDate })
  ] });
}

// server/pdf/template.tsx
import { jsx as jsx13, jsxs as jsxs10 } from "react/jsx-runtime";
function VisitReportTemplate({ data }) {
  return /* @__PURE__ */ jsx13("div", { className: "report-engine", children: /* @__PURE__ */ jsxs10("article", { className: "report-page", children: [
    /* @__PURE__ */ jsx13(
      ReportHeader,
      {
        appName: data.appName,
        tagline: data.tagline,
        reportTitle: data.reportTitle,
        logoSrc: data.logoSrc,
        logoAlt: data.logoAlt,
        visitNumber: data.visitNumber,
        visitDate: data.visitDate
      }
    ),
    /* @__PURE__ */ jsx13(SectionCard, { title: "Visit Information", children: /* @__PURE__ */ jsx13(
      VisitInformationCard,
      {
        branchName: data.branchName,
        brandName: data.brandName,
        visitorName: data.visitorName,
        visitType: data.visitType,
        visitStatus: data.visitStatus,
        visitStatusTone: data.visitStatusTone,
        createdDate: data.createdDate
      }
    ) }),
    /* @__PURE__ */ jsx13(SectionCard, { title: "Branch Performance", icon: "performance", children: /* @__PURE__ */ jsx13(BranchPerformanceTable, { rows: data.performance }) }),
    /* @__PURE__ */ jsx13(SectionCard, { title: "Inspection Items", icon: "inspection", children: /* @__PURE__ */ jsx13(InspectionTable, { items: data.inspectionItems }) }),
    /* @__PURE__ */ jsx13(SectionCard, { title: "Visit Photos", icon: "photos", children: /* @__PURE__ */ jsx13(PhotoGrid, { photos: data.photos }) }),
    /* @__PURE__ */ jsx13(SectionCard, { title: "General Notes", children: /* @__PURE__ */ jsx13(GeneralNotesCard, { html: data.generalNotesHtml }) }),
    /* @__PURE__ */ jsx13(
      ReportFooter,
      {
        footerText: data.footerText,
        generatedAt: data.generatedAt
      }
    )
  ] }) });
}

// server/pdf/renderer.ts
var serverDir = dirname(fileURLToPath(import.meta.url));
var projectRoot = join(serverDir, "../..");
function toDataUrl(buffer, mimeType) {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}
function enrichReportViewModel(data) {
  let logoSrc = data.logoSrc;
  try {
    const logoBuffer = readFileSync(join(serverDir, "logo.png"));
    console.log("====================================");
    console.log("Logo loaded successfully");
    console.log("Logo path:", join(serverDir, "logo.png"));
    console.log("Logo size:", logoBuffer.length);
    console.log("====================================");
    logoSrc = toDataUrl(logoBuffer, "image/png");
  } catch (error) {
    console.error("====================================");
    console.error("Logo loading failed");
    console.error(error);
    console.error("====================================");
    logoSrc = data.logoSrc;
  }
  return {
    ...data,
    logoSrc,
    photos: data.photos.map((photo) => ({
      ...photo,
      src: photo.src.startsWith("http") ? photo.src : logoSrc
    }))
  };
}
function buildFontFaceCss() {
  const cairoBase64 = readFileSync(
    join(serverDir, "Cairo-Regular.ttf")
  ).toString("base64");
  return `
@font-face {
  font-family: 'Cairo';
  src: url('data:font/ttf;base64,${cairoBase64}') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
`;
}
function renderVisitReportHtml(data) {
  const reportData = enrichReportViewModel(data);
  const markup = renderToStaticMarkup(
    createElement(VisitReportTemplate, { data: reportData })
  );
  const reportCss = readFileSync(join(serverDir, "styles.css"), "utf8");
  const fontFaceCss = buildFontFaceCss();
  return `<!DOCTYPE html>
<html lang="ar" dir="auto">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${reportData.reportTitle} \u2014 ${reportData.visitNumber}</title>
    <style>
${fontFaceCss}
.report-engine {
  font-family: 'Cairo', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
${reportCss}
    </style>
  </head>
  <body>
    ${markup}
  </body>
</html>`;
}
async function generateVisitReportPdfBuffer(reportViewModel) {
  const html = renderVisitReportHtml(reportViewModel);
  return generatePdfFromHtml(html);
}
export {
  generateVisitReportPdfBuffer,
  renderVisitReportHtml
};
