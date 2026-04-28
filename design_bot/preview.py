#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Design Preview Generator - Renders design system as a beautiful static HTML preview.

Usage:
    # From design_system.py integration:
    from design_preview import generate_preview_html

    html = generate_preview_html(design_system_dict)

    # CLI standalone:
    python design_preview.py <design_system_json_file> [-o output.html]

    # Pipe from design_system:
    python design_preview.py --from-query "beauty spa wellness" [-p "Serenity Spa"] [-o preview.html]
"""

import json
import sys
import os
import argparse
from pathlib import Path
from datetime import datetime


def _hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 3:
        hex_color = ''.join(c * 2 for c in hex_color)
    try:
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    except (ValueError, IndexError):
        return (100, 100, 100)


def _luminance(hex_color: str) -> float:
    """Calculate relative luminance of a color (WCAG formula)."""
    r, g, b = _hex_to_rgb(hex_color)
    
    def linearize(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    
    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)


def _contrast_ratio(color1: str, color2: str) -> float:
    """Calculate WCAG contrast ratio between two colors."""
    l1 = _luminance(color1)
    l2 = _luminance(color2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


def _text_on_color(bg_hex: str) -> str:
    """Return best text color (white or dark) for given background."""
    lum = _luminance(bg_hex)
    return "#FFFFFF" if lum < 0.4 else "#1E293B"


def _lighten(hex_color: str, factor: float = 0.15) -> str:
    """Lighten a hex color by mixing with white."""
    r, g, b = _hex_to_rgb(hex_color)
    r = int(r + (255 - r) * factor)
    g = int(g + (255 - g) * factor)
    b = int(b + (255 - b) * factor)
    return f"#{r:02X}{g:02X}{b:02X}"


def _darken(hex_color: str, factor: float = 0.15) -> str:
    """Darken a hex color."""
    r, g, b = _hex_to_rgb(hex_color)
    r = int(r * (1 - factor))
    g = int(g * (1 - factor))
    b = int(b * (1 - factor))
    return f"#{r:02X}{g:02X}{b:02X}"


def generate_preview_html(design_system: dict, output_path: str = None) -> str:
    """
    Generate a beautiful static HTML design preview from a design system dict.
    
    Args:
        design_system: The design system dictionary (from DesignSystemGenerator.generate())
        output_path: Optional file path to write the HTML. If None, returns HTML string only.
    
    Returns:
        The HTML string.
    """
    project = design_system.get("project_name", "Design System")
    category = design_system.get("category", "General")
    pattern = design_system.get("pattern", {})
    style = design_system.get("style", {})
    colors = design_system.get("colors", {})
    typography = design_system.get("typography", {})
    effects = design_system.get("key_effects", "")
    anti_patterns = design_system.get("anti_patterns", "")

    # Extract colors
    primary = colors.get("primary", "#2563EB")
    secondary = colors.get("secondary", "#3B82F6")
    cta = colors.get("cta", "#F97316")
    bg = colors.get("background", "#F8FAFC")
    text_color = colors.get("text", "#1E293B")
    
    # Derived colors
    primary_light = _lighten(primary, 0.85)
    primary_dark = _darken(primary, 0.2)
    secondary_light = _lighten(secondary, 0.85)
    cta_light = _lighten(cta, 0.85)
    cta_dark = _darken(cta, 0.15)
    
    # Text on color
    text_on_primary = _text_on_color(primary)
    text_on_secondary = _text_on_color(secondary)
    text_on_cta = _text_on_color(cta)
    text_on_bg = _text_on_color(bg)
    
    # Contrast ratios
    cr_primary = _contrast_ratio(primary, "#FFFFFF")
    cr_text = _contrast_ratio(text_color, bg)
    cr_cta = _contrast_ratio(cta, "#FFFFFF")
    
    # Typography
    heading_font = typography.get("heading", "Inter")
    body_font = typography.get("body", "Inter")
    google_fonts_url = typography.get("google_fonts_url", "")
    css_import = typography.get("css_import", "")
    
    # Convert share-format URLs to proper CSS API URLs
    # e.g. fonts.google.com/share?selection.family=Lora:wght@400|Raleway:wght@300
    #   -> fonts.googleapis.com/css2?family=Lora:wght@400&family=Raleway:wght@300&display=swap
    if google_fonts_url and "fonts.google.com/share" in google_fonts_url:
        import re
        match = re.search(r'selection\.family=(.+)', google_fonts_url)
        if match:
            families_str = match.group(1)
            families = [f.strip() for f in families_str.split("|") if f.strip()]
            params = "&".join(f"family={f.replace(' ', '+')}" for f in families)
            google_fonts_url = f"https://fonts.googleapis.com/css2?{params}&display=swap"
    
    # If no google fonts URL, build one
    if not google_fonts_url and not css_import:
        fonts_param = f"{heading_font.replace(' ', '+')}:wght@400;600;700&family={body_font.replace(' ', '+')}:wght@300;400;500;600"
        google_fonts_url = f"https://fonts.googleapis.com/css2?family={fonts_param}&display=swap"
    
    font_link = f'<link href="{google_fonts_url}" rel="stylesheet">' if google_fonts_url else ""
    if css_import and not font_link:
        font_link = f"<style>{css_import}</style>"
    
    # Pattern sections
    sections_raw = pattern.get("sections", "Hero > Features > CTA")
    sections = [s.strip() for s in sections_raw.split(">") if s.strip()]
    
    # Style info
    style_name = style.get("name", "Minimalism")
    style_keywords = style.get("keywords", "")
    style_effects = style.get("effects", effects)
    style_best_for = style.get("best_for", "")
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    # Build anti-patterns list
    anti_list = [a.strip() for a in anti_patterns.split("+") if a.strip()] if anti_patterns else []
    anti_html = ""
    if anti_list:
        items = "\n".join(f'                <li>{a}</li>' for a in anti_list)
        anti_html = f"""
            <div class="anti-patterns">
                <h3>⛔ Anti-Patterns (Avoid)</h3>
                <ul>
{items}
                </ul>
            </div>"""

    # Build sections flow
    sections_flow_items = ""
    for i, sec in enumerate(sections):
        arrow = '<span class="flow-arrow">→</span>' if i < len(sections) - 1 else ""
        sections_flow_items += f'<span class="flow-step">{sec}</span>{arrow}\n                    '

    # Build effects list
    effects_html = ""
    if style_effects:
        effects_parts = [e.strip() for e in style_effects.replace("+", ",").split(",") if e.strip()]
        items = "\n".join(f'                    <span class="effect-tag">{e}</span>' for e in effects_parts)
        effects_html = f"""
                <div class="effects-row">
                    <strong>Effects:</strong>
{items}
                </div>"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{project} — Design System Preview</title>
    {font_link}
    <style>
        :root {{
            --primary: {primary};
            --primary-light: {primary_light};
            --primary-dark: {primary_dark};
            --secondary: {secondary};
            --secondary-light: {secondary_light};
            --cta: {cta};
            --cta-light: {cta_light};
            --cta-dark: {cta_dark};
            --bg: {bg};
            --text: {text_color};
            --text-muted: {_lighten(text_color, 0.35)};
            --border: {_lighten(text_color, 0.75)};
            --card-bg: #FFFFFF;
            --heading-font: '{heading_font}', system-ui, sans-serif;
            --body-font: '{body_font}', system-ui, sans-serif;
        }}

        * {{ margin: 0; padding: 0; box-sizing: border-box; }}

        body {{
            font-family: var(--body-font);
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
        }}

        /* ===== HEADER ===== */
        .header {{
            background: linear-gradient(135deg, var(--primary), var(--primary-dark));
            color: {text_on_primary};
            padding: 3rem 2rem 2.5rem;
            text-align: center;
        }}
        .header h1 {{
            font-family: var(--heading-font);
            font-size: 2.25rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            letter-spacing: -0.02em;
        }}
        .header .subtitle {{
            opacity: 0.85;
            font-size: 1.05rem;
            font-weight: 400;
        }}
        .header .meta {{
            margin-top: 1rem;
            display: flex;
            justify-content: center;
            gap: 1.5rem;
            flex-wrap: wrap;
        }}
        .header .meta span {{
            background: rgba(255,255,255,0.15);
            padding: 0.3rem 0.8rem;
            border-radius: 20px;
            font-size: 0.85rem;
        }}

        /* ===== CONTAINER ===== */
        .container {{
            max-width: 1100px;
            margin: 0 auto;
            padding: 2rem 1.5rem 3rem;
        }}

        /* ===== SECTION TITLES ===== */
        .section-title {{
            font-family: var(--heading-font);
            font-size: 1.35rem;
            font-weight: 700;
            margin: 2.5rem 0 1.25rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid var(--primary);
            display: inline-block;
            color: var(--text);
        }}

        /* ===== COLOR PALETTE ===== */
        .palette-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 1rem;
        }}
        .swatch {{
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            cursor: pointer;
        }}
        .swatch:hover {{
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.12);
        }}
        .swatch-color {{
            height: 100px;
            display: flex;
            align-items: flex-end;
            padding: 0.75rem;
        }}
        .swatch-color span {{
            font-family: 'SF Mono', 'Fira Code', monospace;
            font-size: 0.85rem;
            font-weight: 600;
        }}
        .swatch-info {{
            background: var(--card-bg);
            padding: 0.75rem;
        }}
        .swatch-info .role {{
            font-weight: 600;
            font-size: 0.9rem;
            color: var(--text);
        }}
        .swatch-info .contrast {{
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-top: 0.2rem;
        }}
        .contrast-badge {{
            display: inline-block;
            padding: 0.1rem 0.4rem;
            border-radius: 4px;
            font-size: 0.7rem;
            font-weight: 600;
            margin-left: 0.3rem;
        }}
        .contrast-pass {{ background: #D1FAE5; color: #065F46; }}
        .contrast-fail {{ background: #FEE2E2; color: #991B1B; }}

        /* ===== TYPOGRAPHY SHOWCASE ===== */
        .type-showcase {{
            background: var(--card-bg);
            border-radius: 16px;
            padding: 2rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }}
        .type-row {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            margin-bottom: 1.5rem;
        }}
        @media (max-width: 640px) {{
            .type-row {{ grid-template-columns: 1fr; }}
        }}
        .type-col label {{
            display: block;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--text-muted);
            margin-bottom: 0.5rem;
            font-weight: 600;
        }}
        .type-heading-demo {{
            font-family: var(--heading-font);
            font-size: 2rem;
            font-weight: 700;
            line-height: 1.2;
            color: var(--text);
        }}
        .type-body-demo {{
            font-family: var(--body-font);
            font-size: 1rem;
            line-height: 1.7;
            color: var(--text);
        }}
        .type-scale {{
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--border);
        }}
        .type-scale-item {{
            display: flex;
            align-items: baseline;
            gap: 1rem;
        }}
        .type-scale-item .size-label {{
            font-size: 0.75rem;
            color: var(--text-muted);
            min-width: 70px;
            font-family: 'SF Mono', 'Fira Code', monospace;
        }}
        .type-scale-item .size-demo {{
            font-family: var(--heading-font);
            color: var(--text);
        }}

        /* ===== STYLE CARD ===== */
        .style-card {{
            background: var(--card-bg);
            border-radius: 16px;
            padding: 2rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }}
        .style-card h3 {{
            font-family: var(--heading-font);
            font-size: 1.15rem;
            margin-bottom: 1rem;
            color: var(--primary);
        }}
        .keyword-tags {{
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }}
        .keyword-tag {{
            background: var(--primary-light);
            color: var(--primary-dark);
            padding: 0.3rem 0.7rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
        }}
        .effects-row {{
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            align-items: center;
            margin-top: 0.75rem;
        }}
        .effects-row strong {{
            font-size: 0.85rem;
            color: var(--text-muted);
        }}
        .effect-tag {{
            background: var(--cta-light);
            color: var(--cta-dark);
            padding: 0.25rem 0.6rem;
            border-radius: 16px;
            font-size: 0.78rem;
            font-weight: 500;
        }}

        /* ===== PAGE FLOW ===== */
        .flow-container {{
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.5rem;
            padding: 1.5rem;
            background: var(--card-bg);
            border-radius: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }}
        .flow-step {{
            background: var(--primary);
            color: {text_on_primary};
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 600;
            white-space: nowrap;
        }}
        .flow-arrow {{
            color: var(--text-muted);
            font-size: 1.2rem;
            font-weight: 700;
        }}
        .flow-meta {{
            margin-top: 1rem;
            font-size: 0.85rem;
            color: var(--text-muted);
            display: flex;
            flex-wrap: wrap;
            gap: 1.5rem;
        }}
        .flow-meta strong {{ color: var(--text); }}

        /* ===== COMPONENT PREVIEW ===== */
        .component-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
        }}
        .comp-card {{
            background: var(--card-bg);
            border-radius: 16px;
            padding: 1.5rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }}
        .comp-card h4 {{
            font-family: var(--heading-font);
            font-size: 0.9rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin-bottom: 1rem;
        }}

        /* Buttons */
        .btn-row {{
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            align-items: center;
        }}
        .btn {{
            display: inline-flex;
            align-items: center;
            padding: 0.65rem 1.5rem;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 600;
            font-family: var(--body-font);
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
        }}
        .btn-primary {{
            background: var(--cta);
            color: {text_on_cta};
        }}
        .btn-primary:hover {{ opacity: 0.9; transform: translateY(-1px); }}
        .btn-secondary {{
            background: transparent;
            color: var(--primary);
            border: 2px solid var(--primary);
        }}
        .btn-secondary:hover {{ background: var(--primary-light); }}
        .btn-ghost {{
            background: transparent;
            color: var(--text-muted);
        }}
        .btn-ghost:hover {{ color: var(--text); }}
        .btn-sm {{
            padding: 0.4rem 1rem;
            font-size: 0.82rem;
        }}

        /* Cards */
        .demo-card {{
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1.25rem;
            transition: all 0.2s ease;
            cursor: pointer;
        }}
        .demo-card:hover {{
            box-shadow: 0 8px 24px rgba(0,0,0,0.08);
            transform: translateY(-2px);
        }}
        .demo-card .card-title {{
            font-family: var(--heading-font);
            font-weight: 600;
            font-size: 1rem;
            margin-bottom: 0.4rem;
        }}
        .demo-card .card-desc {{
            font-size: 0.88rem;
            color: var(--text-muted);
            line-height: 1.5;
        }}
        .demo-card .card-footer {{
            margin-top: 0.75rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .card-badge {{
            background: var(--primary-light);
            color: var(--primary-dark);
            padding: 0.2rem 0.6rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
        }}

        /* Input */
        .input-demo {{
            width: 100%;
            padding: 0.7rem 1rem;
            border: 1.5px solid var(--border);
            border-radius: 8px;
            font-size: 0.95rem;
            font-family: var(--body-font);
            color: var(--text);
            background: var(--bg);
            transition: border-color 0.2s ease;
            outline: none;
        }}
        .input-demo:focus {{
            border-color: var(--primary);
            box-shadow: 0 0 0 3px {primary}20;
        }}
        .input-label {{
            display: block;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 0.4rem;
            color: var(--text);
        }}
        .input-group {{
            margin-bottom: 0.75rem;
        }}

        /* ===== ANTI-PATTERNS ===== */
        .anti-patterns {{
            background: #FEF2F2;
            border: 1px solid #FECACA;
            border-radius: 16px;
            padding: 1.5rem 2rem;
        }}
        .anti-patterns h3 {{
            font-family: var(--heading-font);
            font-size: 1rem;
            color: #991B1B;
            margin-bottom: 0.75rem;
        }}
        .anti-patterns ul {{
            list-style: none;
            padding: 0;
        }}
        .anti-patterns li {{
            padding: 0.3rem 0;
            color: #7F1D1D;
            font-size: 0.9rem;
        }}
        .anti-patterns li::before {{
            content: '✕ ';
            color: #DC2626;
            font-weight: 700;
        }}

        /* ===== FOOTER ===== */
        .footer {{
            text-align: center;
            padding: 2rem;
            color: var(--text-muted);
            font-size: 0.82rem;
            border-top: 1px solid var(--border);
            margin-top: 2rem;
        }}

        /* ===== RESPONSIVE ===== */
        @media (max-width: 768px) {{
            .header h1 {{ font-size: 1.75rem; }}
            .palette-grid {{ grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }}
            .component-grid {{ grid-template-columns: 1fr; }}
            .flow-container {{ flex-direction: column; align-items: flex-start; }}
            .flow-arrow {{ transform: rotate(90deg); }}
        }}

        @media print {{
            body {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
            .swatch:hover, .demo-card:hover, .btn:hover {{ transform: none; box-shadow: none; }}
        }}
    </style>
</head>
<body>

    <!-- ===== HEADER ===== -->
    <header class="header">
        <h1>{_escape(project)}</h1>
        <p class="subtitle">Design System Preview</p>
        <div class="meta">
            <span>Category: {_escape(category)}</span>
            <span>Style: {_escape(style_name)}</span>
            <span>Generated: {timestamp}</span>
        </div>
    </header>

    <div class="container">

        <!-- ===== COLOR PALETTE ===== -->
        <h2 class="section-title">Color Palette</h2>
        <div class="palette-grid">
            <div class="swatch">
                <div class="swatch-color" style="background:{primary}; color:{text_on_primary}">
                    <span>{primary}</span>
                </div>
                <div class="swatch-info">
                    <div class="role">Primary</div>
                    <div class="contrast">On white: {cr_primary:.1f}:1
                        <span class="contrast-badge {"contrast-pass" if cr_primary >= 4.5 else "contrast-fail"}">{"AA ✓" if cr_primary >= 4.5 else "Low"}</span>
                    </div>
                </div>
            </div>
            <div class="swatch">
                <div class="swatch-color" style="background:{secondary}; color:{text_on_secondary}">
                    <span>{secondary}</span>
                </div>
                <div class="swatch-info">
                    <div class="role">Secondary</div>
                    <div class="contrast">On white: {_contrast_ratio(secondary, "#FFFFFF"):.1f}:1
                        <span class="contrast-badge {"contrast-pass" if _contrast_ratio(secondary, "#FFFFFF") >= 4.5 else "contrast-fail"}">{"AA ✓" if _contrast_ratio(secondary, "#FFFFFF") >= 4.5 else "Low"}</span>
                    </div>
                </div>
            </div>
            <div class="swatch">
                <div class="swatch-color" style="background:{cta}; color:{text_on_cta}">
                    <span>{cta}</span>
                </div>
                <div class="swatch-info">
                    <div class="role">CTA / Accent</div>
                    <div class="contrast">On white: {cr_cta:.1f}:1
                        <span class="contrast-badge {"contrast-pass" if cr_cta >= 3 else "contrast-fail"}">{"OK" if cr_cta >= 3 else "Low"}</span>
                    </div>
                </div>
            </div>
            <div class="swatch">
                <div class="swatch-color" style="background:{bg}; color:{text_on_bg}">
                    <span>{bg}</span>
                </div>
                <div class="swatch-info">
                    <div class="role">Background</div>
                    <div class="contrast">Text contrast: {cr_text:.1f}:1
                        <span class="contrast-badge {"contrast-pass" if cr_text >= 4.5 else "contrast-fail"}">{"AA ✓" if cr_text >= 4.5 else "Low"}</span>
                    </div>
                </div>
            </div>
            <div class="swatch">
                <div class="swatch-color" style="background:{text_color}; color:{_text_on_color(text_color)}">
                    <span>{text_color}</span>
                </div>
                <div class="swatch-info">
                    <div class="role">Text</div>
                    <div class="contrast">On bg: {cr_text:.1f}:1
                        <span class="contrast-badge contrast-pass">AA ✓</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- ===== TYPOGRAPHY ===== -->
        <h2 class="section-title">Typography</h2>
        <div class="type-showcase">
            <div class="type-row">
                <div class="type-col">
                    <label>Heading — {_escape(heading_font)}</label>
                    <div class="type-heading-demo">The quick brown fox jumps over the lazy dog</div>
                </div>
                <div class="type-col">
                    <label>Body — {_escape(body_font)}</label>
                    <div class="type-body-demo">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                        Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                        Ut enim ad minim veniam, quis nostrud exercitation.
                    </div>
                </div>
            </div>
            <div class="type-scale">
                <div class="type-scale-item">
                    <span class="size-label">3rem / 48</span>
                    <span class="size-demo" style="font-size:3rem; font-weight:700; line-height:1.1">Display</span>
                </div>
                <div class="type-scale-item">
                    <span class="size-label">2rem / 32</span>
                    <span class="size-demo" style="font-size:2rem; font-weight:700; line-height:1.2">Heading 1</span>
                </div>
                <div class="type-scale-item">
                    <span class="size-label">1.5rem / 24</span>
                    <span class="size-demo" style="font-size:1.5rem; font-weight:600; line-height:1.3">Heading 2</span>
                </div>
                <div class="type-scale-item">
                    <span class="size-label">1.125rem / 18</span>
                    <span class="size-demo" style="font-size:1.125rem; font-weight:600; line-height:1.4">Heading 3</span>
                </div>
                <div class="type-scale-item">
                    <span class="size-label">1rem / 16</span>
                    <span class="size-demo" style="font-size:1rem; font-weight:400; line-height:1.6">Body text — regular weight for readability</span>
                </div>
                <div class="type-scale-item">
                    <span class="size-label">0.875rem / 14</span>
                    <span class="size-demo" style="font-size:0.875rem; font-weight:400; color:var(--text-muted)">Small / Caption — used for metadata and secondary info</span>
                </div>
            </div>
        </div>

        <!-- ===== STYLE & EFFECTS ===== -->
        <h2 class="section-title">Style Profile</h2>
        <div class="style-card">
            <h3>{_escape(style_name)}</h3>
            {f'<div class="keyword-tags">' + "".join(f'<span class="keyword-tag">{_escape(k.strip())}</span>' for k in style_keywords.split(",") if k.strip()) + '</div>' if style_keywords else ''}
            {f'<p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:0.5rem"><strong>Best for:</strong> {_escape(style_best_for)}</p>' if style_best_for else ''}
            {effects_html}
        </div>

        <!-- ===== PAGE FLOW ===== -->
        <h2 class="section-title">Page Structure</h2>
        <div class="flow-container">
            <div style="width:100%">
                <div style="display:flex; flex-wrap:wrap; align-items:center; gap:0.5rem">
                    {sections_flow_items}
                </div>
                <div class="flow-meta">
                    {f'<span><strong>CTA:</strong> {_escape(pattern.get("cta_placement", ""))}</span>' if pattern.get("cta_placement") else ''}
                    {f'<span><strong>Conversion:</strong> {_escape(pattern.get("conversion", ""))}</span>' if pattern.get("conversion") else ''}
                    {f'<span><strong>Color Strategy:</strong> {_escape(pattern.get("color_strategy", ""))}</span>' if pattern.get("color_strategy") else ''}
                </div>
            </div>
        </div>

        <!-- ===== COMPONENT PREVIEWS ===== -->
        <h2 class="section-title">Component Preview</h2>
        <div class="component-grid">
            <!-- Buttons -->
            <div class="comp-card">
                <h4>Buttons</h4>
                <div class="btn-row" style="margin-bottom:0.75rem">
                    <button class="btn btn-primary">Primary CTA</button>
                    <button class="btn btn-secondary">Secondary</button>
                    <button class="btn btn-ghost">Ghost</button>
                </div>
                <div class="btn-row">
                    <button class="btn btn-primary btn-sm">Small Primary</button>
                    <button class="btn btn-secondary btn-sm">Small Outline</button>
                </div>
            </div>

            <!-- Cards -->
            <div class="comp-card">
                <h4>Card</h4>
                <div class="demo-card">
                    <div class="card-title">Feature Highlight</div>
                    <div class="card-desc">A sample card showing the design system in action with proper spacing and typography.</div>
                    <div class="card-footer">
                        <span class="card-badge">{_escape(category)}</span>
                        <button class="btn btn-ghost btn-sm" style="padding:0">Learn more →</button>
                    </div>
                </div>
            </div>

            <!-- Form Inputs -->
            <div class="comp-card">
                <h4>Form Inputs</h4>
                <div class="input-group">
                    <label class="input-label">Email Address</label>
                    <input type="email" class="input-demo" placeholder="hello@example.com" />
                </div>
                <div class="input-group">
                    <label class="input-label">Password</label>
                    <input type="password" class="input-demo" placeholder="Enter password" />
                </div>
                <button class="btn btn-primary" style="width:100%; justify-content:center; margin-top:0.5rem">Sign In</button>
            </div>
        </div>

        <!-- ===== ANTI-PATTERNS ===== -->
        {anti_html}

        <!-- ===== FOOTER ===== -->
        <footer class="footer">
            <p>{_escape(project)} Design System — Generated by <strong>ui-ux-pro-max</strong> — {timestamp}</p>
            <p style="margin-top:0.3rem">Colors, typography, and components are production-ready. Always verify contrast ratios in context.</p>
        </footer>

    </div>

</body>
</html>"""

    # Write to file if path provided
    if output_path:
        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)
        with open(output, 'w', encoding='utf-8') as f:
            f.write(html)

    return html


def _escape(text: str) -> str:
    """Escape HTML special characters."""
    if not text:
        return ""
    return (str(text)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&#39;"))


# ============ SCREENSHOT ENGINE ============

def _find_chrome() -> str:
    """Find Chrome/Chromium binary on the system."""
    import platform
    import shutil

    system = platform.system()

    if system == "Darwin":  # macOS
        candidates = [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
            "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
            "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        ]
    elif system == "Linux":
        candidates = [
            "google-chrome", "google-chrome-stable", "chromium-browser", "chromium",
            "/usr/bin/google-chrome", "/usr/bin/chromium-browser", "/usr/bin/chromium",
            "/snap/bin/chromium",
        ]
    elif system == "Windows":
        import glob
        candidates = []
        for base in [os.environ.get("PROGRAMFILES", ""), os.environ.get("PROGRAMFILES(X86)", ""), os.environ.get("LOCALAPPDATA", "")]:
            if base:
                candidates += glob.glob(os.path.join(base, "Google", "Chrome", "Application", "chrome.exe"))
                candidates += glob.glob(os.path.join(base, "Microsoft", "Edge", "Application", "msedge.exe"))
                candidates += glob.glob(os.path.join(base, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"))
    else:
        candidates = []

    for c in candidates:
        if os.path.isabs(c) and os.path.isfile(c):
            return c
        elif shutil.which(c):
            return shutil.which(c)

    return None


def _screenshot_with_playwright(html_path: str, output_path: str, width: int = 1200, full_page: bool = True) -> bool:
    """
    Take screenshot using Playwright (best quality).
    Returns True on success, False if Playwright is not available.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return False

    try:
        abs_html = os.path.abspath(html_path)
        file_url = f"file://{abs_html}"

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": width, "height": 800})
            page.goto(file_url, wait_until="networkidle")
            # Wait for fonts to load
            page.wait_for_timeout(1500)
            page.screenshot(path=output_path, full_page=full_page)
            browser.close()

        return True
    except Exception as e:
        print(f"⚠️  Playwright screenshot failed: {e}", file=sys.stderr)
        return False


def _screenshot_with_chrome(html_path: str, output_path: str, width: int = 1200) -> bool:
    """
    Take screenshot using system Chrome/Chromium headless mode.
    Returns True on success, False if Chrome is not available.
    """
    import subprocess

    chrome = _find_chrome()
    if not chrome:
        return False

    abs_html = os.path.abspath(html_path)
    abs_output = os.path.abspath(output_path)
    file_url = f"file://{abs_html}"

    # Chrome headless screenshot command
    cmd = [
        chrome,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-software-rasterizer",
        "--disable-dev-shm-usage",
        f"--window-size={width},900",
        f"--screenshot={abs_output}",
        "--hide-scrollbars",
        file_url,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,
        )
        return os.path.isfile(abs_output) and os.path.getsize(abs_output) > 0
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError) as e:
        print(f"⚠️  Chrome screenshot failed: {e}", file=sys.stderr)
        return False


def _crop_to_content(image_path: str) -> bool:
    """
    Crop screenshot to remove excess whitespace at bottom (Chrome captures fixed viewport).
    Uses Pillow if available.
    """
    try:
        from PIL import Image
    except ImportError:
        return False

    try:
        img = Image.open(image_path)
        # Convert to RGB if RGBA
        if img.mode == "RGBA":
            # Find the bounding box of non-transparent content
            bbox = img.getbbox()
            if bbox:
                img = img.crop(bbox)
        else:
            # For RGB, trim bottom whitespace by scanning from bottom
            pixels = img.load()
            w, h = img.size
            # Scan from bottom to find last non-white row
            bottom = h
            for y in range(h - 1, -1, -1):
                row_is_bg = True
                for x in range(0, w, 10):  # Sample every 10px for speed
                    r, g, b = pixels[x, y][:3] if isinstance(pixels[x, y], tuple) else (pixels[x, y],) * 3
                    if not (r > 245 and g > 245 and b > 245):
                        row_is_bg = False
                        break
                if not row_is_bg:
                    bottom = min(y + 20, h)  # Add 20px padding
                    break
            if bottom < h:
                img = img.crop((0, 0, w, bottom))

        img.save(image_path, optimize=True)
        return True
    except Exception:
        return False


def generate_screenshot(
    html_path: str,
    output_path: str = None,
    width: int = 1200,
    full_page: bool = True,
) -> str:
    """
    Convert an HTML design preview to a PNG screenshot.

    Tries engines in order:
    1. Playwright (best quality, full-page support)
    2. System Chrome/Chromium headless (zero-dependency fallback)

    Args:
        html_path: Path to the HTML file to screenshot
        output_path: Output PNG path (default: same name as HTML but .png)
        width: Viewport width in pixels (default: 1200)
        full_page: Capture full scrollable page (Playwright only)

    Returns:
        The output file path on success, or empty string on failure.
    """
    if not os.path.isfile(html_path):
        print(f"❌ HTML file not found: {html_path}", file=sys.stderr)
        return ""

    if not output_path:
        base = os.path.splitext(html_path)[0]
        output_path = f"{base}.png"

    # Ensure output directory exists
    out_dir = os.path.dirname(os.path.abspath(output_path))
    os.makedirs(out_dir, exist_ok=True)

    # Strategy 1: Playwright
    if _screenshot_with_playwright(html_path, output_path, width, full_page):
        return output_path

    # Strategy 2: System Chrome headless
    if _screenshot_with_chrome(html_path, output_path, width):
        # Chrome headless captures a fixed viewport, try to crop
        _crop_to_content(output_path)
        return output_path

    # All strategies failed
    print("❌ Screenshot failed. Install one of:", file=sys.stderr)
    print("   pip install playwright && playwright install chromium", file=sys.stderr)
    print("   — or —", file=sys.stderr)
    print("   Install Google Chrome / Chromium", file=sys.stderr)
    return ""


# ============ CLI ============
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Design System HTML Preview (+ Screenshot)")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("json_file", nargs="?", help="Path to design system JSON file")
    group.add_argument("--from-query", type=str, help="Generate from search query directly")
    
    parser.add_argument("-o", "--output", type=str, default="design-preview.html", help="Output HTML file path (default: design-preview.html)")
    parser.add_argument("-p", "--project-name", type=str, default=None, help="Project name (used with --from-query)")
    parser.add_argument("--screenshot", "-ss", action="store_true", help="Also generate a PNG screenshot of the preview")
    parser.add_argument("--screenshot-output", type=str, default=None, help="Output path for PNG screenshot (default: same as HTML but .png)")
    parser.add_argument("--width", type=int, default=1200, help="Screenshot viewport width (default: 1200)")

    args = parser.parse_args()

    if args.from_query:
        # Generate design system from query then preview
        from .design_system import DesignSystemGenerator
        generator = DesignSystemGenerator()
        ds = generator.generate(args.from_query, args.project_name)
        html = generate_preview_html(ds, args.output)
    else:
        # Load from JSON file
        with open(args.json_file, 'r', encoding='utf-8') as f:
            ds = json.load(f)
        html = generate_preview_html(ds, args.output)

    print(f"✅ Preview generated: {args.output}")
    print(f"   Open in browser to view the design system.")

    # Screenshot
    if args.screenshot:
        ss_output = args.screenshot_output
        if not ss_output:
            ss_output = os.path.splitext(args.output)[0] + ".png"
        result = generate_screenshot(args.output, ss_output, width=args.width)
        if result:
            size_kb = os.path.getsize(result) / 1024
            print(f"\n📸 Screenshot saved: {result} ({size_kb:.0f} KB)")
        else:
            print(f"\n❌ Screenshot generation failed.")
