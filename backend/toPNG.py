from PIL import Image
import os

def is_convertible_image(filename):
    supported = ('.jpg', '.jpeg', '.bmp', '.gif', '.webp', '.tiff')
    return filename.lower().endswith(supported)

def convert_and_overwrite_to_png(start_dir):
    for root, _, files in os.walk(start_dir):
        for file in files:
            if is_convertible_image(file):
                original_path = os.path.join(root, file)
                filename_wo_ext = os.path.splitext(file)[0]
                png_path = os.path.join(root, f"{filename_wo_ext}.png")

                try:
                    with Image.open(original_path) as img:
                        img = img.convert("RGBA")
                        img.save(png_path, "PNG")
                        print(f"Converted: {file} → {filename_wo_ext}.png")
                    
                    os.remove(original_path)  # delete original
                except Exception as e:
                    print(f"Error converting {file}: {e}")

if __name__ == "__main__":
    folder = input("Enter folder path: ").strip()
    convert_and_overwrite_to_png(folder)
