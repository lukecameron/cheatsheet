import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { extname, basename, join } from "path";
import { parse } from "toml";

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

// For monospace fonts at 384px width with larger pixels
// Using 35 chars for comfortable spacing with 11-12px font
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

function formatLine(text: string, width: number): string {
  if (text.length <= width) {
    return padRight(text, width);
  }
  // Truncate with ellipsis if too long
  return text.substring(0, width - 3) + "...";
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
        if (i === 0) {
          lines.push(formattedKeys + padRight(wrappedDescs[i], descCol));
        } else {
          lines.push(padRight("", keysCol) + padRight(wrappedDescs[i], descCol));
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
  headerLines.push(padRight(metadata.title, LINE_WIDTH));
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
        padRight(metadata.title + " (continued)", LINE_WIDTH),
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

    try {
      const { files: textFiles, count } = await generateText(tomlPath);
      
      if (count === 1) {
        const outputPath = join(outputDir, `${baseName}.txt`);
        await writeFile(outputPath, textFiles[0].content, "utf-8");
        console.log(`✓ Generated: ${outputPath} (${textFiles[0].lineCount} lines)`);
      } else {
        for (let i = 0; i < textFiles.length; i++) {
          const fileNum = i + 1;
          const outputPath = join(outputDir, `${baseName}_part${fileNum}.txt`);
          await writeFile(outputPath, textFiles[i].content, "utf-8");
          console.log(`✓ Generated: ${outputPath} (${textFiles[i].lineCount} lines)`);
        }
      }
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error);
    }
  }
}

main();
