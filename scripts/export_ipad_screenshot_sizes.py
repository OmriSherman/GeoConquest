from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "ios-screenshots" / "generated-v4"
OUTPUT_DIR = ROOT / "ios-screenshots" / "app-store-ipad-2064x2752"
TARGET_SIZE = (2064, 2752)
BACKGROUND = (8, 7, 24)


def main() -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)
    for source_path in sorted(SOURCE_DIR.glob("IMG_*.PNG")):
        with Image.open(source_path) as source:
            source = source.convert("RGB")
            scale = min(
                TARGET_SIZE[0] / source.width,
                TARGET_SIZE[1] / source.height,
            )
            resized_size = (
                round(source.width * scale),
                round(source.height * scale),
            )
            resized = source.resize(resized_size, Image.Resampling.LANCZOS)

            canvas = Image.new("RGB", TARGET_SIZE, BACKGROUND)
            left = (TARGET_SIZE[0] - resized.width) // 2
            top = (TARGET_SIZE[1] - resized.height) // 2
            canvas.paste(resized, (left, top))
            canvas.save(OUTPUT_DIR / source_path.name, format="PNG", optimize=True)


if __name__ == "__main__":
    main()
