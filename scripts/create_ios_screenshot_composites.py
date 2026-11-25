from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "ios-screenshots"
OUTPUT_DIR = SOURCE_DIR / "generated-v4"
LABEL_PATH = SOURCE_DIR / "label.png"

CAPTIONS = {
    "IMG_8317.PNG": "DAILY REWARDS",
    "IMG_8318.PNG": "A TON OF UNIQUE QUESTS",
    "IMG_8320.PNG": "SHOW YOUR UNIQUE AVATAR",
    "IMG_8321.PNG": "ACQUIRE A MYTHIC CHEST",
    "IMG_8322.PNG": "AMAZING UPGRADES",
    "IMG_8323.PNG": "FIGHT FOR YOUR PLACE IN THE LEADERBOARD",
    "IMG_8324.PNG": "IMPROVE YOUR GEOGRAPHY SKILLS",
    "IMG_8325.PNG": "IDENTIFY THE SHAPE",
    "IMG_8326.PNG": "DRAW THE BORDER",
    "IMG_8328.PNG": "GAIN GOLD AND XP",
    "IMG_8329.PNG": "MASTER THE BORDERS",
    "IMG_8330.PNG": "BECOME A CONQUEROR FOR THE FULL ADVENTURE",
    "IMG_8331.PNG": "FIGHT YOUR WAY OUT OF THE GAUNTLET",
    "IMG_8333.PNG": "CONQUER THE WORLD",
}


def find_font(size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        Path("C:/Windows/Fonts/impact.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
        Path("C:/Windows/Fonts/seguisb.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def fitted_font(text: str, max_width: int) -> ImageFont.FreeTypeFont:
    size = 220
    while size > 80:
        font = find_font(size)
        bbox = font.getbbox(text, stroke_width=8)
        if bbox[2] - bbox[0] <= max_width:
            return font
        size -= 4
    return find_font(80)


def make_banner(text: str) -> Image.Image:
    label = Image.open(LABEL_PATH).convert("RGBA")
    # Stretch the artwork horizontally while keeping the strip relatively
    # slim. This pushes the rotated corners beyond the screenshot edges.
    label_width = 1900
    label_height = 480
    label = label.resize(
        (label_width, label_height),
        Image.Resampling.LANCZOS,
    )
    text_layer = Image.new("RGBA", label.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(text_layer)
    # Fit against the straight banner width. The text is composited before
    # rotation so it has exactly the same tilt as the map label.
    font = fitted_font(text, 1150)
    bbox = draw.textbbox((0, 0), text, font=font, stroke_width=10)
    x = (label.width - (bbox[2] - bbox[0])) // 2 - bbox[0]
    y = (label.height - (bbox[3] - bbox[1])) // 2 - bbox[1] - 8
    draw.text(
        (x, y),
        text,
        font=font,
        fill=(255, 255, 255, 255),
        stroke_width=10,
        stroke_fill=(8, 8, 8, 255),
    )
    return Image.alpha_composite(label, text_layer).rotate(
        20, expand=True, resample=Image.Resampling.BICUBIC
    )


def compose(source_path: Path, output_path: Path) -> None:
    screenshot = Image.open(source_path).convert("RGBA")
    if screenshot.size != (1320, 2868):
        raise ValueError(f"Unexpected size for {source_path.name}: {screenshot.size}")

    banner = make_banner(CAPTIONS[source_path.name])
    # The banner intentionally crosses the lower-middle of the screenshot,
    # matching the supplied example while keeping the full screenshot visible.
    x = (screenshot.width - banner.width) // 2
    y = 1580
    screenshot.alpha_composite(banner, (x, y))
    screenshot.convert("RGB").save(output_path, quality=95, optimize=True)


def main() -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)
    for filename in CAPTIONS:
        compose(SOURCE_DIR / filename, OUTPUT_DIR / filename)


if __name__ == "__main__":
    main()
