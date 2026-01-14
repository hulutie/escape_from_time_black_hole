import os
from PIL import Image

def resize_and_pad(image_path, output_path, size=(1280, 800)):
    with Image.open(image_path) as img:
        # Calculate aspect ratio
        img_ratio = img.width / img.height
        target_ratio = size[0] / size[1]
        
        if img_ratio > target_ratio:
            # Image is wider than target
            new_width = size[0]
            new_height = int(size[0] / img_ratio)
        else:
            # Image is taller than target
            new_height = size[1]
            new_width = int(size[1] * img_ratio)
            
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Create background
        new_img = Image.new("RGB", size, (255, 255, 255))
        # Paste centered
        upper = (size[1] - new_height) // 2
        left = (size[0] - new_width) // 2
        new_img.paste(img, (left, upper))
        
        new_img.save(output_path, "JPEG", quality=95)
        print(f"Processed: {os.path.basename(image_path)} -> {output_path}")

def main():
    base_dir = r"c:\Users\pengyg\Documents\gitea_aliyun\timehole"
    input_dirs = ["screenshots/en", "screenshots/zh_CN"]
    output_base = os.path.join(base_dir, "store_assets/screenshots")
    
    for d in input_dirs:
        full_input_dir = os.path.join(base_dir, d)
        # Use basename to avoid matching 'en' in 'screenshots'
        lang = os.path.basename(d)
        full_output_dir = os.path.join(output_base, lang)
        
        if not os.path.exists(full_output_dir):
            os.makedirs(full_output_dir)
            
        for filename in os.listdir(full_input_dir):
            if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                input_path = os.path.join(full_input_dir, filename)
                output_path = os.path.join(full_output_dir, filename)
                resize_and_pad(input_path, output_path)
                
    # Generate Promotional Tile (440x280) from pop1
    promo_output = os.path.join(base_dir, "store_assets/promo")
    if not os.path.exists(promo_output):
        os.makedirs(promo_output)
        
    for lang in ["en", "zh_CN"]:
        src = os.path.join(base_dir, f"screenshots/{lang}", "en_pop1.jpg" if lang=="en" else "pop1.jpg")
        if os.path.exists(src):
            resize_and_pad(src, os.path.join(promo_output, f"promo_{lang}.jpg"), size=(440, 280))

if __name__ == "__main__":
    main()
