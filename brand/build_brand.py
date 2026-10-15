"""Builds the final droid247 brand assets: logo SVGs and the full app-icon set.

Run: python3 brand/build_brand.py
Needs rsvg-convert (librsvg) and Pillow. Everything is generated from geometry
in this file, so edit here and re-run rather than touching the outputs.
"""
import json
import math
import os
import subprocess
import tempfile

from PIL import Image, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
LOGO, ICONS = os.path.join(HERE, "logo"), os.path.join(HERE, "icons")
EMAIL = os.path.join(HERE, "email")
BLACK, WHITE = "#0A0A0A", "#FFFFFF"
TAU = math.tau


def f(n):
    return f"{n:.2f}".rstrip("0").rstrip(".")


# ------------------------------------------------------------------ the mark
def squircle(cx, cy, a, b, n=4.2, steps=120):
    pts = []
    for i in range(steps):
        t = TAU * i / steps
        c, s = math.cos(t), math.sin(t)
        pts.append((cx + a * math.copysign(abs(c) ** (2 / n), c), cy + b * math.copysign(abs(s) ** (2 / n), s)))
    return "M" + "L".join(f"{f(x)} {f(y)}" for x, y in pts) + "Z"


HEAD = squircle(60, 60, 50, 44)  # 100 x 88 face on a 120 grid, optically centred


def face(fg, uid, small=False):
    """Face in `fg`; the eyes are cut out, so whatever is behind shows through."""
    lid_w, eye_r, pupil_r = (11, 14, 7) if small else (8, 12, 6)
    return (f'<mask id="e{uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120">'
            f'<rect width="120" height="120" fill="#000"/><path d="{HEAD}" fill="#fff"/>'
            f'<path d="M30 58Q41 70 52 58" fill="none" stroke="#000" stroke-width="{lid_w}" stroke-linecap="round"/>'
            f'<circle cx="80" cy="58" r="{eye_r}" fill="#000"/><circle cx="80" cy="58" r="{pupil_r}" fill="#fff"/>'
            f'</mask><rect width="120" height="120" fill="{fg}" mask="url(#e{uid})"/>')


# ------------------------------------------------------------------ the wordmark
# Units: baseline y=100, x-height 44, cap/ascender 20. Stroke weight 14.
W = 14
H = W / 2


def g_d(x):  # x = left outer edge; returns (svg, advance)
    cx = x + 28
    return (f'<circle cx="{cx}" cy="72" r="21" fill="none" stroke="currentColor" stroke-width="{W}"/>'
            f'<rect x="{cx + 14}" y="20" width="{W}" height="80"/>'), 56


def g_r(x):
    sx = x + H
    return (f'<rect x="{x}" y="44" width="{W}" height="56"/>'
            f'<path d="M{sx} 74C{sx} 59 {sx + 9} 51 {sx + 25} 51" fill="none" stroke="currentColor" stroke-width="{W}"/>'), 32


def g_o(x):
    cx = x + 28
    return (f'<circle cx="{cx}" cy="72" r="21" fill="none" stroke="currentColor" stroke-width="{W}"/>'
            f'<circle cx="{cx}" cy="72" r="6.5"/>'), 56


def g_i(x):
    return (f'<rect x="{x}" y="44" width="{W}" height="56"/><circle cx="{x + H}" cy="27" r="8.5"/>'), 14


def g_2(x):
    cx, cy, r = x + 26, 46, 19
    a = math.radians(45)
    px, py = cx + r * math.cos(a), cy + r * math.sin(a)
    t = (93 - py) / math.sin(a)
    bx = px - t * math.cos(a)
    return (f'<path d="M{cx - r} {cy}A{r} {r} 0 1 1 {f(px)} {f(py)}L{f(bx)} 93H{x + 52}" fill="none" '
            f'stroke="currentColor" stroke-width="{W}" stroke-linejoin="miter"/>'), 52


def g_4(x):
    p = lambda *pts: "M" + "L".join(f"{f(x + a)} {f(b)}" for a, b in pts) + "Z"
    outer = p((29, 20), (43, 20), (43, 67), (53, 67), (53, 81), (43, 81), (43, 100), (29, 100),
              (29, 81), (0, 81), (0, 67))
    counter = p((29, 46.6), (29, 67), (16.4, 67))
    return f'<path fill-rule="evenodd" d="{outer}{counter}"/>', 53


def g_7(x):
    th = 14 * math.hypot(26, 80) / 80
    e = lambda y: 52 - 26 * (y - 20) / 80
    pts = [(0, 20), (52, 20), (e(100), 100), (e(100) - th, 100), (e(34) - th, 34), (0, 34)]
    return '<path d="M' + "L".join(f"{f(x + a)} {f(b)}" for a, b in pts) + 'Z"/>', 52


GLYPHS = [(g_d, 0), (g_r, 9), (g_o, 4), (g_i, 9), (g_d, 9), (g_2, 13), (g_4, 7), (g_7, 6)]


def wordmark_body():
    x, out = 0, ""
    for fn, gap in GLYPHS:
        x += gap
        s, adv = fn(x)
        out += s
        x += adv
    return out, x


WM_BODY, WM_W = wordmark_body()


def wordmark_group(color, dx=0, dy=0, scale=1):
    return (f'<g transform="translate({f(dx)} {f(dy)}) scale({f(scale)})" fill="{color}" color="{color}" '
            f'stroke-linecap="butt">{WM_BODY}</g>')


# ------------------------------------------------------------------ files
def svg(w, h, body, view=None):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view or f"0 0 {f(w)} {f(h)}"}" '
            f'width="{f(w)}" height="{f(h)}">{body}</svg>\n')


def logo_files():
    os.makedirs(LOGO, exist_ok=True)
    files = {}
    for name, fg in (("black", BLACK), ("white", WHITE)):
        files[f"mark-{name}.svg"] = svg(120, 120, face(fg, "m"))
        # wordmark: glyphs span y 18.5..100
        files[f"wordmark-{name}.svg"] = svg(WM_W, 82, wordmark_group(fg, 0, -18.5))
        # horizontal lockup: face height = cap height + 16, wordmark centred on it
        s = 96 / 88
        files[f"lockup-horizontal-{name}.svg"] = svg(
            100 * s + 28 + WM_W, 96,
            f'<g transform="translate({f(-10 * s)} {f(-16 * s)}) scale({f(s)})">{face(fg, "h")}</g>'
            + wordmark_group(fg, 100 * s + 28, -12))
        # stacked lockup
        ms = 1.5
        files[f"lockup-stacked-{name}.svg"] = svg(
            WM_W, 88 * ms + 30 + 81.5,
            f'<g transform="translate({f((WM_W - 100 * ms) / 2 - 10 * ms)} {f(-16 * ms)}) scale({ms})">{face(fg, "s")}</g>'
            + wordmark_group(fg, 0, 88 * ms + 30 - 18.5))
    for name, data in files.items():
        with open(os.path.join(LOGO, name), "w") as fh:
            fh.write(data)
    return files


# ------------------------------------------------------------------ app icons
TILE = squircle(60, 60, 60, 60, n=5)


def icon_svg(px, bg_shape, face_w, fg=WHITE, bg=BLACK, small=None):
    """Icon on a 120 grid rendered at px. face_w = face width as a fraction of the canvas."""
    small = px <= 48 if small is None else small
    k = face_w * 120 / 100
    t = 60 - 60 * k
    bgs = {"square": f'<rect width="120" height="120" fill="{bg}"/>',
           "rounded": f'<path d="{TILE}" fill="{bg}"/>',
           "circle": f'<circle cx="60" cy="60" r="60" fill="{bg}"/>',
           "macos": f'<rect x="11.72" y="11.72" width="96.56" height="96.56" rx="21.6" fill="{bg}"/>',
           "none": ""}[bg_shape]
    return svg(px, px, bgs + f'<g transform="translate({f(t)} {f(t)}) scale({f(k)})">{face(fg, "i", small)}</g>',
               "0 0 120 120")


def render(svg_text, out_png, opaque=False):
    with tempfile.NamedTemporaryFile("w", suffix=".svg", delete=False) as fh:
        fh.write(svg_text)
    subprocess.run(["rsvg-convert", fh.name, "-o", out_png], check=True)
    os.unlink(fh.name)
    if opaque:  # App Store icons must have no alpha channel
        Image.open(out_png).convert("RGB").save(out_png)


def out(*parts):
    p = os.path.join(ICONS, *parts)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    return p


def icon_files():
    # --- web
    fav = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><style>'
           f'.f{{color:{BLACK}}}@media (prefers-color-scheme:dark){{.f{{color:{WHITE}}}}}</style>'
           f'<g class="f">{face("currentColor", "fv", True)}</g></svg>\n')
    open(out("web", "favicon.svg"), "w").write(fav)
    ico = []
    for s in (16, 32, 48):
        p = out("web", f"favicon-{s}.png")
        render(icon_svg(s, "rounded", .8), p)
        ico.append(Image.open(p))
    ico[-1].save(out("web", "favicon.ico"), sizes=[(i.width, i.height) for i in ico], append_images=ico[:-1])
    for s in (16, 32, 48):
        os.remove(out("web", f"favicon-{s}.png"))
    render(icon_svg(180, "square", .62), out("web", "apple-touch-icon.png"), opaque=True)
    render(icon_svg(192, "rounded", .62), out("web", "icon-192.png"))
    render(icon_svg(512, "rounded", .62), out("web", "icon-512.png"))
    render(icon_svg(512, "square", .5), out("web", "icon-maskable-512.png"))
    manifest = {"name": "droid247", "short_name": "droid247", "background_color": BLACK, "theme_color": BLACK,
                "display": "standalone", "icons": [
                    {"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
                    {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
                    {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}
    json.dump(manifest, open(out("web", "site.webmanifest"), "w"), indent=2)

    # --- iOS (Xcode single-size app icon; the system applies the corner mask)
    render(icon_svg(1024, "square", .6), out("ios", "AppIcon.appiconset", "AppIcon-1024.png"), opaque=True)
    json.dump({"images": [{"filename": "AppIcon-1024.png", "idiom": "universal", "platform": "ios", "size": "1024x1024"}],
               "info": {"author": "xcode", "version": 1}},
              open(out("ios", "AppIcon.appiconset", "Contents.json"), "w"), indent=2)

    # --- Android: adaptive icon layers (108dp canvas, face inside the 66dp safe zone) + legacy PNGs
    for d, s in (("mdpi", 108), ("hdpi", 162), ("xhdpi", 216), ("xxhdpi", 324), ("xxxhdpi", 432)):
        render(icon_svg(s, "none", .4), out("android", f"mipmap-{d}", "ic_launcher_foreground.png"))
        render(icon_svg(s, "none", .4), out("android", f"mipmap-{d}", "ic_launcher_monochrome.png"))
    for d, s in (("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)):
        render(icon_svg(s, "rounded", .62, small=False), out("android", f"mipmap-{d}", "ic_launcher.png"))
        render(icon_svg(s, "circle", .56, small=False), out("android", f"mipmap-{d}", "ic_launcher_round.png"))
    xml = ('<?xml version="1.0" encoding="utf-8"?>\n'
           '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
           '    <background android:drawable="@color/ic_launcher_background"/>\n'
           '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
           '    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>\n'
           '</adaptive-icon>\n')
    for n in ("ic_launcher.xml", "ic_launcher_round.xml"):
        open(out("android", "mipmap-anydpi-v26", n), "w").write(xml)
    open(out("android", "values", "ic_launcher_background.xml"), "w").write(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        f'    <color name="ic_launcher_background">{BLACK}</color>\n</resources>\n')
    render(icon_svg(512, "square", .6), out("android", "play-store-512.png"), opaque=True)

    # --- macOS (Big Sur grid: 824px tile inside a 1024 canvas)
    p = out("macos", "AppIcon-1024.png")
    render(icon_svg(1024, "macos", .5), p)
    Image.open(p).save(out("macos", "AppIcon.icns"))

    # --- Windows (.ico with a hand-rendered PNG per size)
    imgs = []
    for s in (16, 24, 32, 48, 64, 128, 256):
        tp = out("windows", f"_{s}.png")
        render(icon_svg(s, "rounded", .66 if s > 48 else .8), tp)
        imgs.append(Image.open(tp).copy())
        os.remove(tp)
    imgs[-1].save(out("windows", "droid247.ico"), sizes=[(i.width, i.height) for i in imgs], append_images=imgs[:-1])

    # --- Linux (freedesktop hicolor theme)
    for s in (16, 22, 24, 32, 48, 64, 128, 256, 512):
        render(icon_svg(s, "rounded", .66 if s > 48 else .8), out("linux", "hicolor", f"{s}x{s}", "apps", "droid247.png"))
    open(out("linux", "hicolor", "scalable", "apps", "droid247.svg"), "w").write(icon_svg(512, "rounded", .66, small=False))


# ------------------------------------------------------------------ email
def email_files(logos):
    """PNG lockup for HTML email, where SVG doesn't render. Shown 26 px tall, rendered at 3x.

    Gmail's dark mode darkens the email but never recolours images, so a plain
    black logo vanishes. A thin white halo keeps it readable there and is
    barely visible on the light background.
    """
    os.makedirs(EMAIL, exist_ok=True)
    scale, halo = 3, 3  # halo is 1 display px
    with tempfile.NamedTemporaryFile("w", suffix=".svg", delete=False) as fh:
        fh.write(logos["lockup-horizontal-black.svg"])
    tmp_png = fh.name + ".png"
    subprocess.run(["rsvg-convert", "-h", str(26 * scale), fh.name, "-o", tmp_png], check=True)
    os.unlink(fh.name)
    logo = Image.open(tmp_png).convert("RGBA")
    os.unlink(tmp_png)

    w, h = logo.size
    canvas = Image.new("RGBA", (w + 2 * halo, h + 2 * halo))
    canvas.alpha_composite(logo, (halo, halo))
    # Grow the logo's alpha by a round brush to get the halo shape.
    alpha = canvas.getchannel("A")
    grown = Image.new("L", canvas.size, 0)
    for dx in range(-halo, halo + 1):
        for dy in range(-halo, halo + 1):
            if dx * dx + dy * dy <= halo * halo + 1:
                shifted = Image.new("L", canvas.size, 0)
                shifted.paste(alpha, (dx, dy))
                grown = ImageChops.lighter(grown, shifted)
    out_img = Image.merge("RGBA", (*Image.new("RGB", canvas.size, WHITE).split(), grown))
    out_img.alpha_composite(canvas)
    out_img.save(os.path.join(EMAIL, "logo.png"), optimize=True)


if __name__ == "__main__":
    email_files(logo_files())
    icon_files()
