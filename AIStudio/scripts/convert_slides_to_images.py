import os
import platform
import argparse
import subprocess
import glob
import shutil

def main():
    """
    主执行函数，使用LibreOffice和Poppler将PPT文件的每一页转换为PNG图片。
    此版本兼容 macOS 和 Ubuntu。
    """
    parser = argparse.ArgumentParser(description="Convert PowerPoint slides to PNG images using LibreOffice & Poppler (macOS/Ubuntu compatible).")
    parser.add_argument("--input-ppt", required=True, help="Path to the input .pptx file.")
    parser.add_argument("--output-dir", required=True, help="Directory to save the output PNG images.")
    args = parser.parse_args()

    print(f"--- Starting Script: 2_convert_slides_to_images.py (LibreOffice + Poppler Version) ---")
    
    os_type = platform.system()
    if os_type == "Darwin":
        soffice_path = "/Applications/LibreOffice.app/Contents/MacOS/soffice"
    elif os_type == "Linux":
        soffice_path = "soffice"
    else:
        print(f"Error: Unsupported OS '{os_type}'.")
        return

    if not shutil.which(soffice_path):
        print(f"Error: LibreOffice command '{soffice_path}' not found.")
        return

    try:
        os.makedirs(args.output_dir, exist_ok=True)
        
        print("  - Step 1: Converting PPTX to PDF using LibreOffice...")
        subprocess.run(
            # 【修正】将 args.input 修正为 args.input_ppt
            [soffice_path, "--headless", "--convert-to", "pdf", "--outdir", args.output_dir, args.input_ppt],
            check=True, timeout=300, capture_output=True, text=True
        )

        pdf_filename = os.path.splitext(os.path.basename(args.input_ppt))[0] + ".pdf"
        pdf_path = os.path.join(args.output_dir, pdf_filename)
        
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"Intermediate PDF file not found: {pdf_path}")
            
        print(f"  - Step 2: Converting PDF to PNGs using pdftoppm...")
        output_prefix = os.path.join(args.output_dir, "slide_temp") 
        
        subprocess.run(
            ["pdftoppm", "-png", pdf_path, output_prefix],
            check=True, timeout=300, capture_output=True, text=True
        )
        
        print("  - Step 3: Cleaning up and renaming files...")
        os.remove(pdf_path) 
        
        generated_images = sorted(glob.glob(os.path.join(args.output_dir, "slide_temp-*.png")))
        
        for i, old_path in enumerate(generated_images):
            new_path = os.path.join(args.output_dir, f"slide_{i}.png")
            shutil.move(old_path, new_path)
            print(f"    - Renamed {os.path.basename(old_path)} to slide_{i}.png")
            
        print(f"\nSuccessfully converted {len(generated_images)} slides to images.")

    except subprocess.CalledProcessError as e:
        print("An error occurred during conversion process.")
        print(f"Command '{e.cmd}' returned non-zero exit status {e.returncode}.")
        print("--- STDOUT ---")
        print(e.stdout)
        print("--- STDERR ---")
        print(e.stderr)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    main()