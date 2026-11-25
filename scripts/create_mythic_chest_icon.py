from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ios-screenshots" / "IMG_8321.PNG"
OUTPUT = ROOT / "ios-screenshots" / "mythic-chest-icon-1024.png"


def main() -> None:
    with Image.open(SOURCE) as source:
        image = source.convert("RGB")
        # Square crop around the chest and its magical glow, excluding the
        # page heading above and the progress panel below.
        crop = image.crop((250, 700, 1050, 1500))
        ImageDraw.Draw(crop).rectangle((0, 770, 800, 800), fill=(8, 7, 24))
        crop.resize((1024, 1024), Image.Resampling.LANCZOS).save(
            OUTPUT, format="PNG", optimize=True
        )


if __name__ == "__main__":
    main()
