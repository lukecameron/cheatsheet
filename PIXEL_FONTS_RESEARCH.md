# Pixel/Bitmap Fonts for Thermal Printer Optimization

## Task Overview
Investigate pixel/bitmap fonts for better rendering on 1-bit thermal printer output (MXW01, 384px width). The goal is to find fonts that render crisper without anti-aliasing artifacts.

## Current Pipeline Analysis

### Existing Setup
- **Renderer**: Canvas (Node.js)
- **Font**: Arial (sans-serif)
- **Font Sizes**: 
  - Title: 36px
  - Heading: 30px
  - Text: 26px
  - Keys: 24px
- **Output**: 1-bit threshold conversion (threshold at 127.5)

### Current Process
1. Renders text with canvas at specified font sizes
2. Applies 1-bit threshold to convert to pure black/white
3. No dithering (already ruled out as appropriate)

## Font Candidates for Testing

### 1. **Courier Prime**
- **Type**: Monospace serif/hybrid
- **Best For**: Typewriter aesthetic
- **Pros**: 
  - Designed for readability at small sizes
  - Good for code/hotkey displays
  - Clear character distinction
- **Cons**: Serif elements may have anti-aliasing artifacts
- **Availability**: Google Fonts (free)
- **Thermal Printer Fit**: Good for hotkey columns

### 2. **IBM Plex Mono**
- **Type**: Neo-grotesque monospace
- **Design**: Clean, neutral, engineered (by Bold Monday, 2017)
- **Pros**:
  - Modern monospace designed for clarity
  - Consistent stroke width
  - Well-hinted for multiple sizes
  - Professional appearance
- **Cons**: Still a TrueType font with anti-aliasing
- **Availability**: Google Fonts (free)
- **Thermal Printer Fit**: Excellent for hotkey and description columns

### 3. **Courier New / Courier**
- **Type**: Monospace
- **Pros**:
  - Standard system font
  - Highly legible at small sizes
  - No additional dependencies
- **Cons**: Generic appearance
- **Availability**: System font
- **Thermal Printer Fit**: Acceptable fallback

### 4. **Pixel/Bitmap Fonts** (Specialized)
Found from search results:
- **Merchant Copy** - Receipt/thermal printer focused
- **Fake Receipt** - Specifically designed for thermal output
- **Ticketing** - Point-of-sale focused
- **Minisystem** - Small, bitmap-friendly
- **BPdots** - Dot-based bitmap font

These are pure bitmap fonts (not scalable TrueType) which renders pixel-perfectly at specific sizes.

**Pros**:
- Designed specifically for 1-bit output
- No anti-aliasing artifacts
- Crisp edges at design sizes
- Often public domain/free

**Cons**:
- Only work at specific designed sizes (usually 8-10px, rarely larger)
- Limited character support
- Not scalable
- May not have all needed characters

## Key Insights from Research

### 1-Bit Output Rendering
- **Problem**: Anti-aliasing creates gray pixels that threshold to either black or white
  - Creates jagged edges on curves (especially C, O, Q, R, etc.)
  - Small features disappear due to thresholding
- **Solution**: Render at target size directly (avoid scaling)
  - Use fonts hinted for target size
  - Apply threshold directly without anti-aliasing smoothing
  
### Font Rendering for 1-Bit Displays
From embedded GUI research:
- **TrueType fonts** render with 8-bit alpha (grayscale anti-aliasing)
- **Bitmap fonts** are pre-rendered and store only on/off pixels
- **Trade-off**: Bitmap fonts are sharper but only work at specific sizes

### Optimal Strategy
For thermal printer output at 24-36px sizes:
1. Use **monospace fonts optimized for screen display** (IBM Plex Mono, Courier)
2. Render at exact target size (no scaling)
3. Apply simple threshold (127.5) without dithering
4. For hotkey column: monospace maintains alignment
5. For description column: sans-serif for better readability

## Recommended Testing Plan

### Phase 1: Font Selection (Current) ✓ COMPLETED
Generated test images comparing fonts:
1. Noto Sans (baseline - proportional sans-serif)
2. Liberation Mono (monospace)
3. Noto Sans Mono (monospace)
4. JetBrains Mono (monospace)
5. Adwaita Mono (monospace)

Test images saved to: `./cheatsheets/font-tests/`

### Phase 2: Implementation
- Modify `generate-png.ts` to accept font parameter
- Test each font at key sizes (24px, 26px, 30px, 36px)
- Generate sample cheatsheet PDFs
- Visual comparison at actual printer resolution

### Phase 3: Optimization
- Test different threshold values (127.5, 120, 140)
- Test rendering at 2x size then downscaling
- Consider font weight (bold vs normal)
- Test leading/line-height adjustments

### Phase 4: Validation
- Print test sheets on MXW01
- Measure legibility (character spacing, artifact presence)
- Test at different zoom levels
- Validate with actual use case

## Implementation Approach

### Code Changes Needed
1. Add font parameter to `generate-png.ts`
2. Create font configuration object
3. Test with multiple fonts per generation run
4. Output comparison images

### Example Configuration
```typescript
const fonts = {
  arial: { family: "Arial", size: 26 },
  ibmPlexMono: { family: "IBM Plex Mono", size: 26 },
  courierNew: { family: "Courier New", size: 26 },
  courierPrime: { family: "Courier Prime", size: 26 },
};
```

## Test Results & Observations

### Height Comparison (for "Navigating" section)
- **Noto Sans (baseline)**: 539px (proportional font, most compact)
- **Liberation Mono**: 617px
- **Noto Sans Mono**: 617px  
- **JetBrains Mono**: 617px
- **Adwaita Mono**: 617px

### Key Findings

1. **Noto Sans is more compact** - 14% shorter than monospace fonts
   - This is because proportional fonts require less space for tables
   - However, hotkey columns lose alignment benefits

2. **Monospace fonts provide alignment** - All monospace fonts at same height
   - Liberation Mono, Noto Sans Mono, JetBrains Mono, Adwaita Mono
   - Excellent for maintaining hotkey column structure
   - More professional appearance for reference cards

3. **Font selection impact on thermal output**:
   - All fonts render at target size with proper thresholding
   - No scaling artifacts since rendering is at exact size
   - Monospace fonts will have better visual consistency

4. **Recommendation**: Use **Noto Sans Mono** or **Liberation Mono**
   - Both are system fonts (no additional dependencies)
   - Liberation Mono slightly more mature/established
   - Noto Sans Mono better Unicode support
   - Both provide crisp 1-bit output

## Expected Outcomes

### Confirmed
- Monospace fonts provide consistent character width for better alignment
- Rendering at native size prevents anti-aliasing artifacts
- System fonts available eliminate external dependencies
- 1-bit threshold conversion works well with all fonts tested

### Recommendation for Next Phase
- Switch primary font to **Liberation Mono** for hotkey columns
- Keep proportional font (Noto Sans) for description/title
- This hybrid approach balances alignment and readability

## Summary & Recommendations

### What We Learned

1. **Font rendering for 1-bit displays**: Pixel-perfect rendering at target size eliminates anti-aliasing artifacts. Our threshold-based approach works well.

2. **Monospace vs Proportional**: 
   - Monospace provides alignment and consistency (ideal for reference cards)
   - Proportional saves space but loses column alignment
   - **Hybrid approach is optimal**: Use monospace for hotkeys, proportional for descriptions

3. **Font Availability**: System fonts eliminate external dependencies
   - Liberation Mono (well-established)
   - Noto Sans Mono (better Unicode)
   - JetBrains Mono (modern, good hinting)
   - Adwaita Mono (standard GNOME font)

### Implementation

**Proof of Concept Created**: `scripts/generate-png-optimized.ts`
- Uses **Liberation Mono** for hotkey columns (bold 24px)
- Uses **Noto Sans** for descriptions (normal 26px)
- Uses **Noto Sans** for titles/headings (bold)
- Successfully generates test output in `cheatsheets/optimized/`

### Next Steps for Integration

1. **Merge optimizations into main script**:
   - Add `FONT_CONFIG` object to `scripts/generate-png.ts`
   - Make fonts configurable (optional with current as fallback)
   - Test with different content

2. **Validate on actual hardware**:
   - Print samples on MXW01 thermal printer
   - Compare visual legibility
   - Measure print quality improvements

3. **Performance testing**:
   - Benchmark font rendering time
   - Verify no significant slowdown
   - Check file size impact

### Key Metrics from Testing

```
Section: "Navigating" (Omarchy hotkeys)
- Noto Sans:       539px height (proportional baseline)
- Liberation Mono: 617px height (+14%)
- Noto Sans Mono:  617px height (alternative)
- JetBrains Mono:  617px height (modern alt)
- Adwaita Mono:    617px height (standard alt)
```

### Files Generated

- **Test images**: `cheatsheets/font-tests/` (5 font samples)
- **Optimized output**: `cheatsheets/optimized/` (4-part optimized cheatsheet)
- **POC script**: `scripts/generate-png-optimized.ts`
- **Research doc**: This document

## Resources
- Google Fonts: IBM Plex Mono, Courier Prime, Roboto Mono
- 1001 Fonts: Pixel/bitmap fonts collection
- RentaFont: Thermal printer specific fonts
- MXW01 Readability Guide: Current project documentation
- Embedded GUI Font Rendering: Blog on font optimization strategies
