from PIL import Image
import os

def resize_images_in_folder(folder_path, size):
    supported_formats = ('.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp')

    for filename in os.listdir(folder_path):
        if filename.lower().endswith(supported_formats):
            full_path = os.path.join(folder_path, filename)
            try:
                with Image.open(full_path) as img:
                    resized_img = img.resize(size, Image.Resampling.LANCZOS)
                    resized_img.save(full_path)
                    print(f"Resized: {filename}")
            except Exception as e:
                print(f"Error processing {filename}: {e}")

if __name__ == "__main__":
    folder = input("Enter folder path: ").strip()
    width = int(input("Enter new width: "))
    height = int(input("Enter new height: "))
    resize_images_in_folder(folder, (width, height))
