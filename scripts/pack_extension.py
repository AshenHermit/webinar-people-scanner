import os
from pathlib import Path
import argparse
import subprocess

PROGRAMFILES = Path(os.environ.get("PROGRAMFILES"))

def pack_extension(chrome_executable, ext_folder_path, ext_key_filepath):
    cmd = f'"{chrome_executable}" --pack-extension="{ext_folder_path}" --pack-extension-key="{ext_key_filepath}"'
    print(cmd)
    subprocess.call(cmd)

def main():
    current_folder = Path(os.path.dirname(__file__))
    working_dir_path = (current_folder / "../").resolve()
    working_dir_name = working_dir_path.name
    default_chrome_executable = PROGRAMFILES / "Google/Chrome/Application/chrome.exe"

    parser = argparse.ArgumentParser()
    parser.add_argument("-ch", "--chrome-executable", 
        default=str(default_chrome_executable), type=str)
    
    args = parser.parse_args()
    
    pack_extension(
        args.chrome_executable, 
        str(working_dir_path), 
        str((working_dir_path / ("../"+working_dir_name+".pem")).resolve())
    )

if __name__ == '__main__':
    main()