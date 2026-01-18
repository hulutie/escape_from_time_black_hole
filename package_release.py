import os
import zipfile
import datetime

def create_release_package():
    # Get current timestamp for the filename
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    zip_filename = f"TimeHole_Release_{timestamp}.zip"

    # Define files and directories to exclude
    excludes = {
        '.git',
        '.agent',
        '.vscode',
        '.gitignore',
        'store_assets',
        '__pycache__',
        '.DS_Store'
    }
    
    # Extensions to exclude
    exclude_extensions = {
        '.zip',
        '.py', # Exclude python scripts including this one and process_images.py
        '.js.map' # Source maps if any
    }

    # Specific files to exclude (that might match allowed extensions but shouldn't be in)
    exclude_files = {
        'package_release.js', # Leftover from previous attempts
    }

    # Files specifically needed even if they match exclude extensions (e.g. if we want to include a py script, but here we don't)
    # The user wants "files to publish to the store", which is usually just the extension assets.
    # Chrome extensions don't need .py files.

    print(f"Creating release package: {zip_filename}...")

    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk('.'):
            # Modify dirs in-place to skip excluded directories
            dirs[:] = [d for d in dirs if d not in excludes]
            
            for file in files:
                file_path = os.path.join(root, file)
                
                # Check exclusions
                _, ext = os.path.splitext(file)
                if ext in exclude_extensions:
                    continue
                
                if file in exclude_files:
                    continue
                
                # Check if file is in an excluded directory path (redundant with dirs check but safe)
                if any(ex in file_path.split(os.sep) for ex in excludes):
                    continue

                # Write to zip
                print(f"Adding {file_path}")
                zipf.write(file_path, arcname=os.path.relpath(file_path, '.'))

    print(f"\nSuccess! Package created: {zip_filename}")

if __name__ == "__main__":
    create_release_package()
