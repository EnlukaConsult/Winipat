"""Generate all logo asset sizes from the source JPG.

Source: public/New Winipat Logo.jpg
Outputs (overwrites existing):
  public/icons/icon-192.png        — PWA icon (Android)
  public/icons/icon-512.png        — PWA icon (Android, splash)
  public/icons/icon-1024.png       — high-res master
  public/apple-touch-icon.png      — iOS home screen (180x180)
  public/favicon-32.png            — browser tab
  public/favicon-48.png            — browser tab
  public/favicon.ico               — legacy browser tab
  public/images/winipat-logo.png   — for use inside the <Logo/> component

The script preserves aspect ratio, centres the image on a transparent canvas
(so it renders nicely as a PWA "any maskable" icon with safe-area padding).
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).parent.parent
SRC = ROOT / "public" / "New Winipat Logo.jpg"


def fit_on_canvas(img: Image.Image, size: int, padding_pct: float = 0.0) -> Image.Image:
    """Place `img` centred on a transparent square canvas of `size` px.

    `padding_pct` shrinks the logo inside the canvas (useful for PWA maskable
    icons where the OS may crop a circle inside the square — 12% padding is
    the Android safe area).
    """
    inner_size = int(size * (1 - padding_pct))
    # downscale preserving aspect ratio
    fitted = ImageOps.contain(img, (inner_size, inner_size), method=Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    offset = ((size - fitted.width) // 2, (size - fitted.height) // 2)
    # paste with alpha if source has one
    if fitted.mode in ("RGBA", "LA"):
        canvas.paste(fitted, offset, fitted)
    else:
        canvas.paste(fitted.convert("RGBA"), offset)
    return canvas


def main() -> None:
    if not SRC.exists():
        raise FileNotFoundError(f"Source logo not found at {SRC}")

    img = Image.open(SRC).convert("RGBA")
    print(f"Source: {SRC.name} ({img.width}x{img.height})")

    # The source JPG has a (likely white) background. For PWA purposes we treat
    # it as-is. If you later supply a PNG with transparent background, the
    # output here will automatically respect transparency.

    outputs = [
        # PWA icons — give them 12% safe-area padding for "any maskable"
        (ROOT / "public" / "icons" / "icon-192.png",       192,  0.12),
        (ROOT / "public" / "icons" / "icon-512.png",       512,  0.12),
        (ROOT / "public" / "icons" / "icon-1024.png",     1024,  0.12),
        # Apple touch icon — Apple already adds rounded corners, no padding
        (ROOT / "public" / "apple-touch-icon.png",         180,  0.00),
        # Favicons — no padding, full bleed
        (ROOT / "public" / "favicon-32.png",                32,  0.00),
        (ROOT / "public" / "favicon-48.png",                48,  0.00),
        # In-app logo asset — full bleed, used inside <Logo/> component
        (ROOT / "public" / "images" / "winipat-logo.png",  256,  0.00),
    ]

    for path, size, padding in outputs:
        out = fit_on_canvas(img, size, padding_pct=padding)
        path.parent.mkdir(parents=True, exist_ok=True)
        out.save(path, "PNG", optimize=True)
        print(f"  wrote {path.relative_to(ROOT)} ({size}x{size}, padding={int(padding*100)}%)")

    # favicon.ico — multi-resolution ICO bundle (16, 32, 48)
    ico_path = ROOT / "public" / "favicon.ico"
    sizes = [(16, 16), (32, 32), (48, 48)]
    ico_img = fit_on_canvas(img, 48, padding_pct=0.0)
    ico_img.save(ico_path, format="ICO", sizes=sizes)
    print(f"  wrote {ico_path.relative_to(ROOT)} (multi-res ICO)")

    print("\nDone — all logo assets regenerated.")


if __name__ == "__main__":
    main()
