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

// Constants from MXW01_READABILITY_GUIDE
const PRINTER_WIDTH = 384;
const PADDING = 16;
const FONT_SIZE_TITLE = 20;
const FONT_SIZE_HEADING = 16;
const FONT_SIZE_TEXT = 13;
const FONT_SIZE_KEYS = 12;
const FONT_FAMILY = "Arial";
const LINE_HEIGHT = 1.3;
const COL_SPACING = 8;

interface TextMetrics {
  width: number;
  height: number;
}

function measureText(
  ctx: any,
  text: string,
  fontSize: number,
  fontWeight: string = "normal"
): TextMetrics {
  ctx.font = `${fontWeight} ${fontSize}px ${FONT_FAMILY}`;
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
  fontWeight: string = "normal"
): string[] {
  ctx.font = `${fontWeight} ${fontSize}px ${FONT_FAMILY}`;
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

async function generateCheatsheetPNG(
  tomlPath: string,
  outputPath: string
): Promise<number> {
  const content = await readFile(tomlPath, "utf-8");
  const data = parse(content) as CheatsheetData;
  const { metadata, sections } = data;

  // First pass: calculate dimensions
  const tempCanvas = createCanvas(PRINTER_WIDTH, 1);
  const ctx = tempCanvas.getContext("2d");

  let totalHeight = PADDING;
  const contentWidth = PRINTER_WIDTH - PADDING * 2;

  // Title
  totalHeight += FONT_SIZE_TITLE * LINE_HEIGHT + 8;

  // Sections
  for (const section of sections) {
    totalHeight += FONT_SIZE_HEADING * LINE_HEIGHT + 8; // Section heading

    if (section.note) {
      const noteLines = wrapText(
        ctx,
        section.note,
        contentWidth - 8,
        FONT_SIZE_TEXT - 1
      );
      totalHeight += noteLines.length * (FONT_SIZE_TEXT * LINE_HEIGHT) + 8;
    }

    if (section.hotkeys && section.hotkeys.length > 0) {
      // Calculate table dimensions
      const keyColWidth = Math.floor(contentWidth * 0.35);
      const funcColWidth = contentWidth - keyColWidth - COL_SPACING;

      // Header row
      totalHeight += FONT_SIZE_KEYS * LINE_HEIGHT + 8 + 2; // 2px border

      // Data rows
      for (const hotkey of section.hotkeys) {
        const keyLines = wrapText(ctx, hotkey.keys, keyColWidth, FONT_SIZE_KEYS);
        const descLines = wrapText(
          ctx,
          hotkey.description,
          funcColWidth,
          FONT_SIZE_TEXT
        );
        const rowHeight = Math.max(keyLines.length, descLines.length) *
          FONT_SIZE_TEXT *
          LINE_HEIGHT + 6;
        totalHeight += rowHeight + 1; // 1px border
      }

      totalHeight += 12; // Space after table
    }
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
  renderCtx.font = `bold ${FONT_SIZE_TITLE}px ${FONT_FAMILY}`;
  renderCtx.fillText(metadata.title, PADDING, y + FONT_SIZE_TITLE);
  y += FONT_SIZE_TITLE * LINE_HEIGHT + 12;

  // Sections
  for (const section of sections) {
    // Section heading
    renderCtx.font = `bold ${FONT_SIZE_HEADING}px ${FONT_FAMILY}`;
    renderCtx.fillText(section.name, PADDING, y + FONT_SIZE_HEADING);
    y += FONT_SIZE_HEADING * LINE_HEIGHT + 4;

    if (section.note) {
      renderCtx.font = `${FONT_SIZE_TEXT - 1}px ${FONT_FAMILY}`;
      const noteLines = wrapText(
        renderCtx,
        section.note,
        contentWidth,
        FONT_SIZE_TEXT - 1
      );

      // Draw note text with left indent for visual hierarchy
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
      renderCtx.font = `bold ${FONT_SIZE_KEYS}px ${FONT_FAMILY}`;
      renderCtx.fillText("Hotkey", tableStartX, y + FONT_SIZE_KEYS);
      renderCtx.fillText(
        "Function",
        tableStartX + keyColWidth + COL_SPACING,
        y + FONT_SIZE_KEYS
      );
      y += FONT_SIZE_KEYS * LINE_HEIGHT + 8;

      // Data rows
      for (const hotkey of section.hotkeys) {
        const keyLines = wrapText(
          renderCtx,
          hotkey.keys,
          keyColWidth,
          FONT_SIZE_KEYS
        );
        const descLines = wrapText(
          renderCtx,
          hotkey.description,
          funcColWidth,
          FONT_SIZE_TEXT
        );
        const rowHeight = Math.max(keyLines.length, descLines.length) *
          FONT_SIZE_TEXT *
          LINE_HEIGHT + 4;

        renderCtx.font = `bold ${FONT_SIZE_KEYS}px ${FONT_FAMILY}`;
        for (let i = 0; i < keyLines.length; i++) {
          renderCtx.fillText(
            keyLines[i],
            tableStartX,
            y + (i + 1) * FONT_SIZE_KEYS * LINE_HEIGHT
          );
        }

        renderCtx.font = `${FONT_SIZE_TEXT}px ${FONT_FAMILY}`;
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
  }

  // Write PNG
  const buffer = canvas.toBuffer("image/png");
  await writeFile(outputPath, buffer);

  return totalHeight;
}

async function main() {
  const dataDir = "./data/hotkeys";
  const outputDir = "./cheatsheets";

  // Create output directory
  await mkdir(outputDir, { recursive: true });

  // Read all TOML files
  const files = await readdir(dataDir);
  const tomlFiles = files.filter((f) => extname(f) === ".toml");

  console.log(`Found ${tomlFiles.length} TOML file(s)`);

  for (const file of tomlFiles) {
    const tomlPath = join(dataDir, file);
    const baseName = basename(file, ".toml");
    const outputPath = join(outputDir, `${baseName}.png`);

    try {
      const height = await generateCheatsheetPNG(tomlPath, outputPath);
      console.log(`✓ Generated: ${outputPath} (${PRINTER_WIDTH}x${Math.round(height)})`);
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error);
    }
  }
}

main();
