---
name: generate_icon
description: Generates an icon using the Nano Banana model (via generate_image), removes the background, and creates 3 sizes (16x16, 48x48, 128x128).
---

# Generate Icon Skill

This skill generates a new icon, processes it to remove the background, and resizes it for use in the extension.

## Usage

1.  **Generate Image**: 
    *   Use the `generate_image` tool.
    *   Ask the user for a description of the icon if one hasn't been provided.
    *   Construct a prompt that ensures a clean, isolateable subject. Recommended format: "A flat vector icon of [User Description], minimalistic, vibrant colors, solid white background".
    *   **Note**: The underlying model allows for high-quality generation suitable for icons (Nano Banana quality).

2.  **Process Image (Background Removal)**:
    *   Locate the generated image path (returned by `generate_image`, typically in the artifacts folder, but you must use the absolute path).
    *   Ensure the `icons/` directory exists in the workspace.
    *   Run the following command to remove the white background (adjust fuzz if necessary):
        ```powershell
        magick "[GeneratedAbsoluteImagePath]" -fuzz 10% -transparent white "icons/icon_transparent.png"
        ```
    
3.  **Resize Image**:
    *   Run the following commands to create the standard extension icon sizes:
        ```powershell
        magick "icons/icon_transparent.png" -resize 16x16 "icons/icon16.png"
        magick "icons/icon_transparent.png" -resize 48x48 "icons/icon48.png"
        magick "icons/icon_transparent.png" -resize 128x128 "icons/icon128.png"
        ```

4.  **Completion**:
    *   Notify the user that the icons have been generated and placed in the `icons/` folder.
