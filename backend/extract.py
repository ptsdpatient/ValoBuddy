import os
import shutil

def is_image_file(filename):
    image_extensions = ('.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp')
    return filename.lower().endswith(image_extensions)

def generate_unique_filename(base_path, filename):
    name, ext = os.path.splitext(filename)
    counter = 1
    new_filename = filename

    while os.path.exists(os.path.join(base_path, new_filename)):
        new_filename = f"{name}_{counter}{ext}"
        counter += 1

    return new_filename

def move_images_to_root(start_dir):
    for root, _, files in os.walk(start_dir):
        if root == start_dir:
            continue  # Skip the current directory itself
        for file in files:
            if is_image_file(file):
                src_path = os.path.join(root, file)
                new_name = generate_unique_filename(start_dir, file)
                dst_path = os.path.join(start_dir, new_name)
                try:
                    shutil.move(src_path, dst_path)
                    print(f"Moved: {file} → {new_name}")
                except Exception as e:
                    print(f"Error moving {file}: {e}")

if __name__ == "__main__":
    current_dir = os.getcwd()
    move_images_to_root(current_dir)
