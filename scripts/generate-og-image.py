"""Generate an Open Graph image (1200x630) for Winipat link previews.

Outputs: public/og-image.png

The OG image is what shows up when someone shares a Winipat URL on
WhatsApp, Twitter, LinkedIn, iMessage, etc. Standard size is 1200x630px.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).parent.parent
LOGO_SRC = ROOT / "public" / "images" / "winipat-logo.png"
OUT = ROOT / "public" / "og-image.png"

# Brand palette
MIDNIGHT = (11, 16, 32)
ROYAL    = (60, 79, 224)
VIOLET   = (124, 58, 237)
TEAL     = (20, 184, 166)
GOLD     = (244, 201, 93)
WHITE    = (255, 255, 255)

W, H = 1200, 630


def find_font(weight: str = "Regular", size: int = 48) -> ImageFont.ImageFont:
    """Try several common Windows font paths, fall back to PIL default."""
    candidates = [
        # Segoe UI is on every modern Windows install
        rf"C:\Windows\Fonts\segoeui{ 'b' if weight == 'Bold' else '' }.ttf",
        # macOS / Linux fallbacks (handy if anyone ever re-runs on a different OS)
        "/Library/Fonts/Arial Bold.ttf" if weight == "Bold" else "/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if weight == "Bold"
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for c in candidates:
        try:
            return ImageFont.truetype(c, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def make_gradient(w: int, h: int) -> Image.Image:
    """Diagonal midnight -> royal -> violet gradient."""
    grad = Image.new("RGB", (w, h), MIDNIGHT)
    px = grad.load()
    # Linear interpolation across the diagonal
    for y in range(h):
        for x in range(w):
            # 0.0 (top-left) -> 1.0 (bottom-right)
            t = (x + y) / (w + h)
            if t < 0.5:
                # midnight -> royal
                u = t / 0.5
                r = int(MIDNIGHT[0] + (ROYAL[0] - MIDNIGHT[0]) * u)
                g = int(MIDNIGHT[1] + (ROYAL[1] - MIDNIGHT[1]) * u)
                b = int(MIDNIGHT[2] + (ROYAL[2] - MIDNIGHT[2]) * u)
            else:
                # royal -> violet
                u = (t - 0.5) / 0.5
                r = int(ROYAL[0] + (VIOLET[0] - ROYAL[0]) * u)
                g = int(ROYAL[1] + (VIOLET[1] - ROYAL[1]) * u)
                b = int(ROYAL[2] + (VIOLET[2] - ROYAL[2]) * u)
            px[x, y] = (r, g, b)
    return grad


def add_glow_blob(canvas: Image.Image, cx: int, cy: int, radius: int, color: tuple[int, int, int], alpha: int = 90):
    """Add a soft glowing blob to the canvas at (cx, cy)."""
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse(
        [cx - radius, cy - radius, cx + radius, cy + radius],
        fill=(*color, alpha),
    )
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=80))
    canvas.alpha_composite(overlay)


def main() -> None:
    if not LOGO_SRC.exists():
        raise FileNotFoundError(f"Logo not found at {LOGO_SRC}")

    # 1. Background gradient
    bg = make_gradient(W, H).convert("RGBA")

    # 2. Soft glow accents
    add_glow_blob(bg, 100, 100, 250, TEAL,   alpha=70)
    add_glow_blob(bg, 1100, 530, 280, GOLD,  alpha=55)

    # 3. Logo on the right side
    logo = Image.open(LOGO_SRC).convert("RGBA")
    target_h = 280
    scale = target_h / logo.height
    logo = logo.resize((int(logo.width * scale), target_h), Image.LANCZOS)
    logo_x = W - logo.width - 90
    logo_y = (H - logo.height) // 2
    bg.paste(logo, (logo_x, logo_y), logo)

    # 4. Headline + tagline on the left
    draw = ImageDraw.Draw(bg)

    eyebrow_font  = find_font("Regular", 28)
    headline_font = find_font("Bold",    72)
    sub_font      = find_font("Regular", 32)

    pad_left = 90
    draw.text((pad_left, 180), "WINIPAT", fill=GOLD, font=eyebrow_font, spacing=8)

    # Headline — two lines
    draw.text((pad_left, 230), "Trust-first commerce",        fill=WHITE, font=headline_font)
    draw.text((pad_left, 320), "for Nigeria.",                fill=WHITE, font=headline_font)

    # Tagline below the headline
    draw.text((pad_left, 440), "Verified sellers. Escrow payments. Buyer-chosen logistics.",
              fill=(255, 255, 255, 200), font=sub_font)

    # 5. Small bottom-right URL line
    url_font = find_font("Regular", 22)
    draw.text((pad_left, 540), "winipat.com", fill=(255, 255, 255, 180), font=url_font)

    # Save
    OUT.parent.mkdir(parents=True, exist_ok=True)
    bg.convert("RGB").save(OUT, "PNG", optimize=True)
    print(f"Saved: {OUT.relative_to(ROOT)}  ({W}x{H})")


if __name__ == "__main__":
    main()
