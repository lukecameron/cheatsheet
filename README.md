# Cheatsheet

Generate printer-optimized text and PNG files from keyboard shortcut reference data.

This tool converts TOML hotkey data into:
- **Text files** (monospace, 35 chars/line, 17px font) for direct reading
- **PNG images** (384px × variable height) optimized for thermal printer output (MXW01)

Perfect for creating physical reference cards and cheatsheets.

## Setup

Install tools:

```bash
mise install
```

## Usage

Generate all cheatsheets from TOML data in `data/hotkeys/`:

```bash
mise run generate
```

This creates:
- `cheatsheets/*.txt` - Monospace text files
- `cheatsheets/*.png` - PNG images for printing

## Data Format

Create a TOML file in `data/hotkeys/` with this structure:

```toml
[metadata]
title = "App Name"

[[sections]]
name = "Section Title"
note = "Optional note about this section"
hotkeys = [
  { keys = "Super + Space", description = "Action description" },
  { keys = "Ctrl + Alt + X", description = "Another action" },
]
```

## Output

For content > 60 lines, output is split across multiple files:
- Single section: `name.txt` and `name.png`
- Multiple sections: `name_part1.txt`, `name_part2.txt`, etc.

The generator automatically:
- Abbreviates key names (Super→S, Ctrl→C, Alt→A, Shift→Sh)
- Wraps long descriptions
- Fills the full 384px width with properly sized fonts
- Applies 1-bit threshold for crisp printing
