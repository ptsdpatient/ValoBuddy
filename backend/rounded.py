from PIL import Image, ImageDraw, ImageOps
import os

def apply_rounded_corners(image, radius):
    # Ensure alpha channel
    image = image.convert("RGBA")

    # Create rounded mask
    mask = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0) + image.size, radius=radius, fill=255)

    # Apply mask
    rounded = ImageOps.fit(image, image.size)
    rounded.putalpha(mask)
    return rounded

def crop_images_to_rounded(folder_path, corner_radius=60):
    supported_formats = ('.jpg', '.jpeg', '.png', '.bmp', '.webp')

    for filename in os.listdir(folder_path):
        if filename.lower().endswith(supported_formats):
            full_path = os.path.join(folder_path, filename)
            try:
                with Image.open(full_path) as img:
                    rounded_img = apply_rounded_corners(img, radius=corner_radius)
                    rounded_img.save(full_path)
                    print(f"Rounded crop applied: {filename}")
            except Exception as e:
                print(f"Error processing {filename}: {e}")

if __name__ == "__main__":
    folder = input("Enter folder path: ").strip()
    crop_images_to_rounded(folder)
