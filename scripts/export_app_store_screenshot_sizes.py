from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "ios-screenshots" / "generated-v4"
EXPORTS = {
    "app-store-1242x2688": (1242, 2688),
    "app-store-1284x2778": (1284, 2778),
}


def crop_to_ratio(image: Image.Image, target_width: int, target_height: int) -> Image.Image:
    target_ratio = target_width / target_height
    source_ratio = image.width / image.height

    if source_ratio < target_ratio:
        crop_height = round(image.width / target_ratio)
        top = (image.height - crop_height) // 2
        image = image.crop((0, top, image.width, top + crop_height))
    elif source_ratio > target_ratio:
        crop_width = round(image.height * target_ratio)
        left = (image.width - crop_width) // 2
        image = image.crop((left, 0, left + crop_width, image.height))

    return image.resize((target_width, target_height), Image.Resampling.LANCZOS)


def main() -> None:
    sources = sorted(SOURCE_DIR.glob("IMG_*.PNG"))
    for folder_name, size in EXPORTS.items():
        output_dir = ROOT / "ios-screenshots" / folder_name
        output_dir.mkdir(exist_ok=True)
        for source_path in sources:
            with Image.open(source_path) as source:
                output = crop_to_ratio(source.convert("RGB"), *size)
                output.save(output_dir / source_path.name, format="PNG", optimize=True)


if __name__ == "__main__":
    main()
