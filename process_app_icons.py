import cv2
import numpy as np
import os
import shutil

def process_icons():
    src_path = r"C:\Users\ratan\.gemini\antigravity\brain\19e8ea83-d11e-4cf2-8b31-ad8c1cf53aae\divyadrishti_app_icon_1793201402160.jpg"
    img = cv2.imread(src_path)
    if img is None:
        raise ValueError(f"Cannot load image from {src_path}")

    # Standard densities and sizes for Android
    densities = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192
    }

    res_dirs = [
        r"c:\Users\ratan\Desktop\DivyaDrishti\android\app\src\main\res",
        r"C:\Users\ratan\AndroidStudioProjects\SafeRideAI\app\src\main\res"
    ]

    for base_res in res_dirs:
        # 1. Save high-resolution 512x512 app logo in drawable
        drawable_dir = os.path.join(base_res, "drawable")
        os.makedirs(drawable_dir, exist_ok=True)
        logo_512 = cv2.resize(img, (512, 512), interpolation=cv2.INTER_LANCZOS4)
        cv2.imwrite(os.path.join(drawable_dir, "app_logo.png"), logo_512)

        # 2. Process mipmap densities (writing only webp to avoid duplicate resource errors)
        for folder, size in densities.items():
            folder_path = os.path.join(base_res, folder)
            os.makedirs(folder_path, exist_ok=True)

            # Square / squircle icon
            icon_square = cv2.resize(img, (size, size), interpolation=cv2.INTER_LANCZOS4)
            cv2.imwrite(os.path.join(folder_path, "ic_launcher.webp"), icon_square)

            # Round circular masked icon with alpha channel (BGRA)
            icon_rgba = cv2.cvtColor(icon_square, cv2.COLOR_BGR2BGRA)
            mask = np.zeros((size, size), dtype=np.uint8)
            center = (size // 2, size // 2)
            radius = size // 2
            cv2.circle(mask, center, radius, 255, -1, cv2.LINE_AA)
            icon_rgba[:, :, 3] = mask

            cv2.imwrite(os.path.join(folder_path, "ic_launcher_round.webp"), icon_rgba)

        print(f"Successfully generated all mipmap icons in: {base_res}")

    # Also save a copy to project root for user convenience
    root_logo = r"c:\Users\ratan\Desktop\DivyaDrishti\divyadrishti_app_logo.png"
    cv2.imwrite(root_logo, logo_512)
    print(f"Saved root logo to {root_logo}")

if __name__ == "__main__":
    process_icons()
