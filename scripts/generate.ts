import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { extname, basename, join } from "path";
import { parse } from "toml";
import { createCanvas } from "canvas";

// ============================================================================
// Type Definitions
// ============================================================================

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

interface TextFile {
  content: string;
  lineCount: number;
}

// ============================================================================
// Text Generation Configuration
// ============================================================================

// For monospace fonts at 384px width with larger pixels
// Using 35 chars for comfortable spacing with derived font size
const LINE_WIDTH = 35;
const MAX_LINES = 60;

function countLines(text: string): number {
  return text.split("\n").length;
}

function abbreviateKeys(keys: string): string {
  return keys
    .replace(/Super\s*\+\s*/g, "S-")
    .replace(/Ctrl\s*\+\s*/g, "C-")
    .replace(/Alt\s*\+\s*/g, "A-")
    .replace(/Shift\s*\+\s*/g, "Sh-")
    .replace(/CapsLock\s*\+\s*/g, "CL-")
    .replace(/\s+/g, "");
}

function padRight(text: string, width: number): string {
  return text.padEnd(width, " ");
}

function wrapText(text: string, width: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

function generateSectionText(section: Section): string[] {
  const lines: string[] = [];

  // Section header
  lines.push("");
  lines.push("─".repeat(LINE_WIDTH));
  lines.push(padRight(section.name, LINE_WIDTH));
  lines.push("─".repeat(LINE_WIDTH));

  // Section note
  if (section.note) {
    lines.push("");
    const wrappedNote = wrapText(section.note, LINE_WIDTH);
    lines.push(...wrappedNote);
  }

  // Hotkeys table
  if (section.hotkeys && section.hotkeys.length > 0) {
    lines.push("");

    for (const hotkey of section.hotkeys) {
      const abbreviatedKeys = abbreviateKeys(hotkey.keys);

      // Calculate column positions: keys take 13 chars, description takes the rest
      const keysCol = 13;
      const descCol = LINE_WIDTH - keysCol;

      const formattedKeys = padRight(abbreviatedKeys, keysCol);
      const wrappedDescs = wrapText(hotkey.description, descCol);

      for (let i = 0; i < wrappedDescs.length; i++) {
        const desc = wrappedDescs[i] ?? "";
        if (i === 0) {
          lines.push(formattedKeys + padRight(desc, descCol));
        } else {
          lines.push(padRight("", keysCol) + padRight(desc, descCol));
        }
      }
    }
  }

  return lines;
}

async function generateText(
  tomlPath: string
): Promise<{ files: TextFile[]; count: number }> {
  const content = await readFile(tomlPath, "utf-8");
  const data = parse(content) as CheatsheetData;

  const { metadata, sections } = data;

  const files: TextFile[] = [];

  // Create header
  const headerLines: string[] = [];
  headerLines.push("═".repeat(LINE_WIDTH));
  headerLines.push(padRight(metadata.title ?? "Cheatsheet", LINE_WIDTH));
  headerLines.push("═".repeat(LINE_WIDTH));

  let currentText = headerLines.join("\n") + "\n";
  let currentLineCount = countLines(currentText);

  for (const section of sections) {
    const sectionLines = generateSectionText(section);
    const sectionText = sectionLines.join("\n") + "\n";
    const sectionLineCount = countLines(sectionText);

    // Check if adding this section would exceed the limit
    if (currentLineCount + sectionLineCount > MAX_LINES && currentLineCount > 10) {
      // Save current file and start a new one
      files.push({ content: currentText, lineCount: currentLineCount });

      const contHeaderLines = [
        "═".repeat(LINE_WIDTH),
        padRight((metadata.title ?? "Cheatsheet") + " (continued)", LINE_WIDTH),
        "═".repeat(LINE_WIDTH),
        ""
      ];
      currentText = contHeaderLines.join("\n");
      currentLineCount = countLines(currentText);
    }

    currentText += sectionText;
    currentLineCount += sectionLineCount;
  }

  // Add the last file
  if (currentText.trim().length > 0) {
    files.push({ content: currentText, lineCount: currentLineCount });
  }

  return { files, count: files.length };
}

// ============================================================================
// PNG Generation Configuration
// ============================================================================

const PRINTER_WIDTH = 384;
const PADDING = 8;
const FONT_FAMILY = "Liberation Mono";

// Monospace font width ratio: character width is typically 60-65% of font size
// For Liberation Mono at rendering size, we use 0.625 (5/8) as a reliable ratio
const CHAR_WIDTH_TO_FONT_RATIO = 0.625;

// Calculate usable width and derive font size
const USABLE_WIDTH = PRINTER_WIDTH - PADDING * 2;
const DESIRED_CHAR_WIDTH = USABLE_WIDTH / LINE_WIDTH;
const FONT_SIZE_PX = Math.round(DESIRED_CHAR_WIDTH / CHAR_WIDTH_TO_FONT_RATIO);
const FONT_SIZE = `${FONT_SIZE_PX}px`;

// Line height is typically 1.3x the font size for comfortable spacing
const CHAR_HEIGHT = Math.ceil(FONT_SIZE_PX * 1.3);

function renderTextToCanvas(lines: string[]): { buffer: Buffer; height: number } {
  // Calculate canvas dimensions
  const height = PADDING * 2 + lines.length * CHAR_HEIGHT;
  const canvas = createCanvas(PRINTER_WIDTH, height);
  const ctx = canvas.getContext("2d");

  // White background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, PRINTER_WIDTH, height);

  // Black text
  ctx.fillStyle = "#000000";
  ctx.font = `${FONT_SIZE} ${FONT_FAMILY}`;
  ctx.textBaseline = "top";

  // Render each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const y = PADDING + i * CHAR_HEIGHT;
    ctx.fillText(line, PADDING, y);
  }

  // Get image data and apply 1-bit threshold
  const imageData = ctx.getImageData(0, 0, PRINTER_WIDTH, height);
  const data = imageData.data;

  // Apply threshold to convert to pure black and white (1-bit)
  // Any pixel with luminance > 127.5 becomes white (255), else black (0)
  for (let i = 0; i < data.length; i += 4) {
    const r = (data[i] ?? 0) as number;
    const g = (data[i + 1] ?? 0) as number;
    const b = (data[i + 2] ?? 0) as number;

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
  const bwCanvas = createCanvas(PRINTER_WIDTH, height);
  const bwCtx = bwCanvas.getContext("2d");
  bwCtx.putImageData(imageData, 0, 0);

  // Save as PNG (canvas outputs 8-bit, but our image is pure B&W)
  const buffer = bwCanvas.toBuffer("image/png");

  return { buffer, height };
}

// ============================================================================
// Main Pipeline
// ============================================================================

async function main() {
  const dataDir = "./data/hotkeys";
  const outputDir = "./cheatsheets";

  // Create output directory
  await mkdir(outputDir, { recursive: true });

  // Read all TOML files
  const files = await readdir(dataDir);
  const tomlFiles = files.filter((f) => extname(f) === ".toml");

  console.log(`Found ${tomlFiles.length} TOML file(s)`);
  console.log(
    `Using font size: ${FONT_SIZE} (${DESIRED_CHAR_WIDTH.toFixed(2)}px per char, ${LINE_WIDTH} chars per line)`
  );

  for (const file of tomlFiles) {
    const tomlPath = join(dataDir, file);
    const baseName = basename(file, ".toml");

    try {
      // Generate text files
      const { files: textFiles, count: textCount } = await generateText(tomlPath);

      console.log(`\nProcessing ${baseName}:`);

      if (textCount === 1) {
        const outputPath = join(outputDir, `${baseName}.txt`);
        const file0 = textFiles[0];
        if (file0) {
          await writeFile(outputPath, file0.content, "utf-8");
          console.log(`  ✓ Text: ${outputPath} (${file0.lineCount} lines)`);
        }
      } else {
        for (let i = 0; i < textFiles.length; i++) {
          const fileNum = i + 1;
          const outputPath = join(outputDir, `${baseName}_part${fileNum}.txt`);
          const fileI = textFiles[i];
          if (fileI) {
            await writeFile(outputPath, fileI.content, "utf-8");
            console.log(
              `  ✓ Text: ${outputPath} (${fileI.lineCount} lines)`
            );
          }
        }
      }

      // Generate PNG files from text files
      const generatedTxtFiles = await readdir(outputDir);
      const relatedTxtFiles = generatedTxtFiles.filter(
        (f) => f.startsWith(baseName) && extname(f) === ".txt"
      );

      for (const txtFile of relatedTxtFiles) {
        const txtPath = join(outputDir, txtFile);
        const content = await readFile(txtPath, "utf-8");
        const lines = content.split("\n");

        const { buffer, height } = renderTextToCanvas(lines);

        const pngBaseName = basename(txtFile, ".txt");
        const outputPath = join(outputDir, `${pngBaseName}.png`);
        await writeFile(outputPath, buffer);
        console.log(`  ✓ PNG: ${outputPath} (${PRINTER_WIDTH}x${height}px)`);
      }
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error);
    }
  }
}

main();
