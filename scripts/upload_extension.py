import os
from pathlib import Path
import argparse
import dropbox
from dropbox import files

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-t", "--dropbox-token", type=str)
    parser.add_argument("-i", "--input-filepath", type=str)
    parser.add_argument("-o", "--output-filepath", type=str)
    args = parser.parse_args()

    print()
    print(f"uploading \"{args.input_filepath}\" to \"{args.output_filepath}\" on dropbox ...")

    dbx = dropbox.Dropbox(args.dropbox_token)

    with open(args.input_filepath, "rb") as file: 
        dbx.files_upload(
            file.read(),
            args.output_filepath, 
            mode=files.WriteMode.overwrite)

    print(f"done.")

if __name__ == '__main__':
    main()