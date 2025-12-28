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

async function generateMarkdown(tomlPath: string): Promise<string> {
  const content = await readFile(tomlPath, "utf-8");
  const data = parse(content) as CheatsheetData;

  const { metadata, sections } = data;

  let markdown = `# ${metadata.title}\n\n`;

  if (metadata.url) {
    markdown += `> [Source](${metadata.url})\n\n`;
  }

  for (const section of sections) {
    markdown += `## ${section.name}\n\n`;

    if (section.note) {
      markdown += `> ${section.note}\n\n`;
    }

    if (section.hotkeys && section.hotkeys.length > 0) {
      markdown += `| Hotkey | Function |\n`;
      markdown += `| --- | --- |\n`;

      for (const hotkey of section.hotkeys) {
        // Format the keys with backticks for monospace
        const formattedKeys = hotkey.keys
          .split(" / ")
          .map((k) => `\`${k.trim()}\``)
          .join(" / ");

        markdown += `| ${formattedKeys} | ${hotkey.description} |\n`;
      }
    }

    markdown += `\n`;
  }

  return markdown;
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
    const outputPath = join(outputDir, `${baseName}.md`);

    try {
      const markdown = await generateMarkdown(tomlPath);
      await writeFile(outputPath, markdown, "utf-8");
      console.log(`✓ Generated: ${outputPath}`);
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error);
    }
  }
}

main();
