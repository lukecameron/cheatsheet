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

interface MarkdownFile {
  content: string;
  lineCount: number;
}

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

function generateSectionMarkdown(section: Section): string {
  let markdown = `## ${section.name}\n\n`;

  if (section.note) {
    markdown += `> ${section.note}\n\n`;
  }

  if (section.hotkeys && section.hotkeys.length > 0) {
    markdown += `| Hotkey | Function |\n`;
    markdown += `| --- | --- |\n`;

    for (const hotkey of section.hotkeys) {
      // Use abbreviated keys for consistency
      const abbreviatedKeys = abbreviateKeys(hotkey.keys);
      const formattedKeys = `\`${abbreviatedKeys}\``;

      markdown += `| ${formattedKeys} | ${hotkey.description} |\n`;
    }
  }

  markdown += `\n`;
  return markdown;
}

async function generateMarkdown(
  tomlPath: string
): Promise<{ files: MarkdownFile[]; count: number }> {
  const content = await readFile(tomlPath, "utf-8");
  const data = parse(content) as CheatsheetData;

  const { metadata, sections } = data;

  const MAX_LINES = 60;
  const files: MarkdownFile[] = [];

  let currentMarkdown = `# ${metadata.title}\n\n`;

  if (metadata.url) {
    currentMarkdown += `> [Source](${metadata.url})\n\n`;
  }

  let currentLineCount = countLines(currentMarkdown);

  for (const section of sections) {
    const sectionMarkdown = generateSectionMarkdown(section);
    const sectionLineCount = countLines(sectionMarkdown);

    // Check if adding this section would exceed the limit
    if (currentLineCount + sectionLineCount > MAX_LINES && currentLineCount > 10) {
      // Save current file and start a new one
      files.push({ content: currentMarkdown, lineCount: currentLineCount });
      currentMarkdown = `# ${metadata.title} (continued)\n\n`;
      currentLineCount = countLines(currentMarkdown);
    }

    currentMarkdown += sectionMarkdown;
    currentLineCount += sectionLineCount;
  }

  // Add the last file
  if (currentMarkdown.trim().length > 0) {
    files.push({ content: currentMarkdown, lineCount: currentLineCount });
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
      const { files: markdownFiles, count } = await generateMarkdown(tomlPath);
      
      if (count === 1) {
        const outputPath = join(outputDir, `${baseName}.md`);
        await writeFile(outputPath, markdownFiles[0].content, "utf-8");
        console.log(`✓ Generated: ${outputPath} (${markdownFiles[0].lineCount} lines)`);
      } else {
        for (let i = 0; i < markdownFiles.length; i++) {
          const fileNum = i + 1;
          const outputPath = join(outputDir, `${baseName}_part${fileNum}.md`);
          await writeFile(outputPath, markdownFiles[i].content, "utf-8");
          console.log(`✓ Generated: ${outputPath} (${markdownFiles[i].lineCount} lines)`);
        }
      }
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error);
    }
  }
}

main();
