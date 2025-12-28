import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { extname, basename, join } from "path";
import { parse } from "toml";
import { createCanvas } from "canvas";

interface Hotkey {
  keys: string;
  description: string;
}

interface Section {
  name: string;
  note?: string;
  hotkeys: Hotkey[];
}

interface CheatsheetData {
  metadata: Record<string, string>;
  sections: Section[];
}

// Font configurations to test
const FONTS_TO_TEST = [
  { name: "Noto Sans (baseline)", family: "Noto Sans", weight: "normal" },
  { name: "Liberation Mono", family: "Liberation Mono", weight: "normal" },
  { name: "Noto Sans Mono", family: "Noto Sans Mono", weight: "normal" },
  { name: "JetBrains Mono", family: "JetBrainsMono Nerd Font Mono", weight: "normal" },
  { name: "Adwaita Mono", family: "Adwaita Mono", weight: "normal" },
];

// Constants from MXW01_READABILITY_GUIDE
const PRINTER_WIDTH = 384;
const PADDING = 16;
const FONT_SIZE_TITLE = 36;
const FONT_SIZE_HEADING = 30;
const FONT_SIZE_TEXT = 26;
const FONT_SIZE_KEYS = 24;
const LINE_HEIGHT = 1.5;
const COL_SPACING = 10;

function abbreviateKeys(keys: string): string {
  return keys
    .replace(/Super\s*\+\s*/g, "S-")
    .replace(/Ctrl\s*\+\s*/g, "C-")
    .replace(/Alt\s*\+\s*/g, "A-")
    .replace(/Shift\s*\+\s*/g, "Sh-")
    .replace(/CapsLock\s*\+\s*/g, "CL-")
    .replace(/\s+/g, "");
}

interface TextMetrics {
  width: number;
  height: number;
}

function measureText(
  ctx: any,
  text: string,
  fontSize: number,
  fontWeight: string = "normal",
  fontFamily: string = "Arial"
): TextMetrics {
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  return {
    width: metrics.width,
    height: fontSize * LINE_HEIGHT,
  };
}

function wrapText(
  ctx: any,
  text: string,
  maxWidth: number,
  fontSize: number,
  fontWeight: string = "normal",
  fontFamily: string = "Arial"
): string[] {
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

async function generatePNGForFont(
  sections: Section[],
  metadata: Record<string, string>,
  fontName: string,
  fontFamily: string,
  fontWeight: string
): Promise<{ buffer: Buffer; height: number }> {
  // First pass: calculate dimensions
  const tempCanvas = createCanvas(PRINTER_WIDTH, 1);
  const ctx = tempCanvas.getContext("2d");

  let totalHeight = PADDING;
  const contentWidth = PRINTER_WIDTH - PADDING * 2;

  // Title
  totalHeight += FONT_SIZE_TITLE * LINE_HEIGHT + 12;

  // Only render first section for test
  const section = sections[0];
  totalHeight += FONT_SIZE_HEADING * LINE_HEIGHT + 8; // Section heading

  if (section.note) {
    const noteLines = wrapText(
      ctx,
      section.note,
      contentWidth,
      FONT_SIZE_TEXT - 1,
      "normal",
      fontFamily
    );
    totalHeight += noteLines.length * (FONT_SIZE_TEXT * LINE_HEIGHT) + 8;
  }

  if (section.hotkeys && section.hotkeys.length > 3) {
    // Only render first 3 hotkeys for test
    const keyColWidth = Math.floor(contentWidth * 0.35);
    const funcColWidth = contentWidth - keyColWidth - COL_SPACING;

    totalHeight += FONT_SIZE_KEYS * LINE_HEIGHT + 8;

    for (let i = 0; i < Math.min(3, section.hotkeys.length); i++) {
      const hotkey = section.hotkeys[i];
      const keyLines = wrapText(
        ctx,
        hotkey.keys,
        keyColWidth,
        FONT_SIZE_KEYS,
        "normal",
        fontFamily
      );
      const descLines = wrapText(
        ctx,
        hotkey.description,
        funcColWidth,
        FONT_SIZE_TEXT,
        "normal",
        fontFamily
      );
      const rowHeight =
        Math.max(keyLines.length, descLines.length) *
          FONT_SIZE_TEXT *
          LINE_HEIGHT +
        4;
      totalHeight += rowHeight + 4;
    }

    totalHeight += 8;
  }

  totalHeight += PADDING;

  // Second pass: render to actual canvas
  const canvas = createCanvas(PRINTER_WIDTH, totalHeight);
  const renderCtx = canvas.getContext("2d");

  // White background
  renderCtx.fillStyle = "#FFFFFF";
  renderCtx.fillRect(0, 0, PRINTER_WIDTH, totalHeight);

  // Black text
  renderCtx.fillStyle = "#000000";
  renderCtx.strokeStyle = "#000000";
  renderCtx.lineWidth = 1;

  let y = PADDING;

  // Title
  renderCtx.font = `bold ${FONT_SIZE_TITLE}px ${fontFamily}`;
  renderCtx.fillText(`${metadata.title}`, PADDING, y + FONT_SIZE_TITLE);
  y += FONT_SIZE_TITLE * LINE_HEIGHT + 12;

  // Section
  renderCtx.font = `bold ${FONT_SIZE_HEADING}px ${fontFamily}`;
  renderCtx.fillText(section.name, PADDING, y + FONT_SIZE_HEADING);
  y += FONT_SIZE_HEADING * LINE_HEIGHT + 4;

  if (section.note) {
    renderCtx.font = `${FONT_SIZE_TEXT - 1}px ${fontFamily}`;
    const noteLines = wrapText(
      renderCtx,
      section.note,
      contentWidth,
      FONT_SIZE_TEXT - 1,
      "normal",
      fontFamily
    );

    for (let i = 0; i < noteLines.length; i++) {
      renderCtx.fillText(
        noteLines[i],
        PADDING + 12,
        y + (i + 1) * FONT_SIZE_TEXT * LINE_HEIGHT
      );
    }
    y += noteLines.length * (FONT_SIZE_TEXT * LINE_HEIGHT) + 8;
  }

  if (section.hotkeys && section.hotkeys.length > 0) {
    const keyColWidth = Math.floor(contentWidth * 0.35);
    const funcColWidth = contentWidth - keyColWidth - COL_SPACING;
    const tableStartX = PADDING;

    // Header
    renderCtx.font = `bold ${FONT_SIZE_KEYS}px ${fontFamily}`;
    renderCtx.fillText("Hotkey", tableStartX, y + FONT_SIZE_KEYS);
    renderCtx.fillText(
      "Function",
      tableStartX + keyColWidth + COL_SPACING,
      y + FONT_SIZE_KEYS
    );
    y += FONT_SIZE_KEYS * LINE_HEIGHT + 8;

    // Data rows (first 3 only)
    for (let idx = 0; idx < Math.min(3, section.hotkeys.length); idx++) {
      const hotkey = section.hotkeys[idx];
      const abbreviatedKeys = abbreviateKeys(hotkey.keys);
      const keyLines = wrapText(
        renderCtx,
        abbreviatedKeys,
        keyColWidth,
        FONT_SIZE_KEYS,
        "normal",
        fontFamily
      );
      const descLines = wrapText(
        renderCtx,
        hotkey.description,
        funcColWidth,
        FONT_SIZE_TEXT,
        "normal",
        fontFamily
      );
      const rowHeight =
        Math.max(keyLines.length, descLines.length) *
          FONT_SIZE_TEXT *
          LINE_HEIGHT +
        4;

      renderCtx.font = `bold ${FONT_SIZE_KEYS}px ${fontFamily}`;
      for (let i = 0; i < keyLines.length; i++) {
        renderCtx.fillText(
          keyLines[i],
          tableStartX,
          y + (i + 1) * FONT_SIZE_KEYS * LINE_HEIGHT
        );
      }

      renderCtx.font = `${FONT_SIZE_TEXT}px ${fontFamily}`;
      for (let i = 0; i < descLines.length; i++) {
        renderCtx.fillText(
          descLines[i],
          tableStartX + keyColWidth + COL_SPACING,
          y + (i + 1) * FONT_SIZE_TEXT * LINE_HEIGHT
        );
      }

      y += rowHeight + 4;
    }

    y += 8;
  }

  // Get image data and apply 1-bit threshold
  const imageData = renderCtx.getImageData(
    0,
    0,
    PRINTER_WIDTH,
    totalHeight
  );
  const data = imageData.data;

  // Apply threshold to convert to pure black and white (1-bit)
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Calculate luminance using standard formula
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    // Threshold: > 127.5 = white (255), else black (0)
    const bw = luminance > 127.5 ? 255 : 0;
    data[i] = bw;
    data[i + 1] = bw;
    data[i + 2] = bw;
    data[i + 3] = 255; // Alpha = opaque
  }

  // Create a new canvas with the thresholded image data
  const bwCanvas = createCanvas(PRINTER_WIDTH, totalHeight);
  const bwCtx = bwCanvas.getContext("2d");
  bwCtx.putImageData(imageData, 0, 0);

  // Save as PNG
  const buffer = bwCanvas.toBuffer("image/png");

  return { buffer, height: totalHeight };
}

async function main() {
  const tomlPath = "./data/hotkeys/omarchy_hotkeys.toml";
  const content = await readFile(tomlPath, "utf-8");
  const data = parse(content) as CheatsheetData;
  const { metadata, sections } = data;

  const outputDir = "./cheatsheets/font-tests";
  await mkdir(outputDir, { recursive: true });

  console.log(`Testing ${FONTS_TO_TEST.length} fonts...\n`);

  for (const fontConfig of FONTS_TO_TEST) {
    try {
      console.log(`Generating: ${fontConfig.name}...`);
      const { buffer, height } = await generatePNGForFont(
        sections,
        metadata,
        fontConfig.name,
        fontConfig.family,
        fontConfig.weight
      );

      const safeFileName = fontConfig.name.replace(/\s+/g, "-").toLowerCase();
      const outputPath = join(
        outputDir,
        `font-test-${safeFileName}.png`
      );
      await writeFile(outputPath, buffer);

      console.log(
        `✓ ${fontConfig.name.padEnd(20)} → ${safeFileName.padEnd(20)} (${PRINTER_WIDTH}x${Math.round(height)})`
      );
    } catch (error) {
      console.error(`✗ Error with ${fontConfig.name}:`, error);
    }
  }

  console.log("\n✓ Font test complete!");
  console.log(`All test images saved to: ${outputDir}`);
}

main();
