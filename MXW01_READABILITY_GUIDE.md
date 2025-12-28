# MXW01 Thermal Printer Readability Guide

Best practices for generating images with legible text and graphics for the MXW01 thermal printer.

## Image Dimensions

| Guideline | Recommendation |
|-----------|----------------|
| **Width** | Exactly **384 pixels** (images wider than this will be cropped) |
| **Height** | Any height, but keep reasonable for paper usage |
| **Aspect ratio** | Portrait orientation works best for receipts/labels |

## Font Recommendations

### Minimum Sizes

| Font Type | Minimum Size | Recommended Size |
|-----------|--------------|------------------|
| Sans-serif (Arial, Helvetica) | 12px | 16–24px |
| Serif (Times, Georgia) | 14px | 18–24px |
| Monospace (Courier, Consolas) | 12px | 14–18px |
| Bold text | 10px | 14–20px |

### Best Font Choices

**Recommended:**
- **Arial / Helvetica** — Clean, excellent readability
- **Verdana** — Designed for screens, works great at small sizes
- **Roboto** — Modern, consistent stroke width
- **Liberation Sans** — Good open-source option
- **Consolas / Monaco** — Best for monospace/code

**Avoid:**
- Thin/light font weights
- Script or decorative fonts
- Fonts with fine serifs at small sizes
- Condensed fonts below 14px

### Font Rendering

```
✓ Use anti-aliasing when rendering text
✓ Render at final size (don't scale down)
✓ Use black (#000000) text on white (#FFFFFF) background
✓ Prefer bold weights for headers
```

## Color & Contrast

The printer outputs 1-bit (black/white only). Design with this in mind:

| Element | Recommendation |
|---------|----------------|
| Text | Pure black `#000000` |
| Background | Pure white `#FFFFFF` |
| Lines/borders | Minimum 2px thick |
| Minimum contrast ratio | 4.5:1 (aim for maximum) |

### Grayscale Considerations

If your source has grayscale:
- Text should be **darker than 50% gray** (`#808080`)
- Avoid gray text — it may disappear or become spotty
- Use the `steinberg` dithering for photos with gradients

## Layout Guidelines

### Edge-to-Edge Printing

The printer supports full-bleed printing — all 384 pixels can be used with no hardware-enforced margins.

### Margins & Padding (Optional)

Margins are purely aesthetic. Use them for readability if desired:

| Area | Suggestion |
|------|------------|
| Page margins | 0–16px (your preference) |
| Line spacing | 1.2–1.4× font size |
| Paragraph spacing | 8–16px |

### Line Length

- **Full width**: ~24 characters at 16px font, ~32 at 12px
- For long text, consider padding for easier reading

## Print Settings by Use Case

### Text Documents / Receipts

```javascript
{
  dither: 'threshold',  // Crisp text edges
  brightness: 128,      // Normal
  intensity: 93         // Default
}
```

### QR Codes / Barcodes

```javascript
{
  dither: 'threshold',  // No dithering artifacts
  brightness: 128,
  intensity: 110        // Slightly darker for scanning
}
```

- QR codes: Minimum 2px per module, recommend 3–4px
- Barcodes: Minimum bar width 2px
- Include quiet zone (white margin) around codes

### Photos / Images with Gradients

```javascript
{
  dither: 'steinberg',  // Best for photos
  brightness: 140,      // Slightly lighter (thermal tends dark)
  intensity: 100
}
```

### High Contrast Graphics / Logos

```javascript
{
  dither: 'threshold',
  brightness: 128,
  intensity: 100
}
```

## Text Rendering Code Examples

### Node.js with Canvas

```javascript
import { createCanvas } from 'canvas';

const PRINTER_WIDTH = 384;

function createTextImage(text, options = {}) {
  const {
    fontSize = 20,
    fontFamily = 'Arial',
    fontWeight = 'normal',
    padding = 16,
    lineHeight = 1.4
  } = options;

  // Create temporary canvas to measure text
  const tempCanvas = createCanvas(1, 1);
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  
  const contentWidth = PRINTER_WIDTH - (padding * 2);
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  // Word wrap
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = tempCtx.measureText(testLine);
    if (metrics.width > contentWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Calculate height
  const lineHeightPx = fontSize * lineHeight;
  const height = Math.ceil(lines.length * lineHeightPx + padding * 2);

  // Create final canvas
  const canvas = createCanvas(PRINTER_WIDTH, height);
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, PRINTER_WIDTH, height);

  // Black text
  ctx.fillStyle = '#000000';
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'top';

  // Render lines
  lines.forEach((line, i) => {
    ctx.fillText(line, padding, padding + i * lineHeightPx);
  });

  return ctx.getImageData(0, 0, PRINTER_WIDTH, height);
}
```

### Browser with HTML/CSS

```javascript
async function htmlToImageData(html) {
  const container = document.createElement('div');
  container.style.cssText = `
    width: 384px;
    background: white;
    color: black;
    font-family: Arial, sans-serif;
    font-size: 16px;
    line-height: 1.4;
    padding: 16px;
    box-sizing: border-box;
  `;
  container.innerHTML = html;
  document.body.appendChild(container);

  // Use html2canvas or similar library
  const canvas = await html2canvas(container, {
    width: 384,
    backgroundColor: '#FFFFFF'
  });

  document.body.removeChild(container);
  return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
}
```

## Common Pitfalls

| Problem | Cause | Solution |
|---------|-------|----------|
| Text too faint | Low intensity or gray text | Use pure black, increase intensity to 100–110 |
| Text edges fuzzy | Wrong dithering for text | Use `threshold` dithering for text |
| Small text unreadable | Font too small or thin | Minimum 12px, prefer bold weights |
| Barcodes won't scan | Dithering artifacts | Use `threshold`, increase intensity |
| Image too dark | Thermal printing darkens | Increase brightness to 140–150 |
| Lines disappearing | Lines too thin | Minimum 2px stroke width |
| Gradient banding | Wrong dithering | Use `steinberg` or `atkinson` |

## Quick Reference Card

```
┌─────────────────────────────────────────┐
│  MXW01 QUICK REFERENCE                  │
├─────────────────────────────────────────┤
│  Width:        384 pixels (edge-to-edge)│
│  Min font:     12px (16px recommended)  │
│  Min line:     2px thick                │
├─────────────────────────────────────────┤
│  TEXT/RECEIPTS                          │
│    dither: threshold                    │
│    brightness: 128, intensity: 93       │
├─────────────────────────────────────────┤
│  QR/BARCODES                            │
│    dither: threshold                    │
│    brightness: 128, intensity: 110      │
├─────────────────────────────────────────┤
│  PHOTOS                                 │
│    dither: steinberg                    │
│    brightness: 140, intensity: 100      │
└─────────────────────────────────────────┘
```
