#!/usr/bin/env python3
"""Build a clean Chrome extension package in the dist/ directory.

Chrome refuses to load unpacked extensions that contain files or directories
whose names start with an underscore (e.g. __pycache__). This script copies only
the files required by the extension into dist/ so the source tree can still
contain Python code, virtual environments, and other build artifacts.
"""

import os
import shutil
import sys

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(PROJECT_ROOT, "dist")

# Files and directories required by the Chrome extension.
EXTENSION_FILES = [
    "manifest.json",
    "background.js",
    "content.js",
    "options.js",
    "options.html",
    "images",
]


def clean_dist():
    """Remove the existing dist/ directory if present."""
    if os.path.isdir(DIST_DIR):
        shutil.rmtree(DIST_DIR)
        print(f"Removed existing {DIST_DIR}")


def copy_extension_files():
    """Copy extension files into dist/."""
    os.makedirs(DIST_DIR, exist_ok=True)
    for name in EXTENSION_FILES:
        src = os.path.join(PROJECT_ROOT, name)
        dst = os.path.join(DIST_DIR, name)
        if not os.path.exists(src):
            print(f"Warning: {name} not found, skipping", file=sys.stderr)
            continue
        if os.path.isdir(src):
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)
        print(f"Copied {name} -> dist/{name}")


def validate_dist():
    """Ensure dist/ does not contain any underscore-prefixed entries."""
    bad_entries = []
    for root, dirs, files in os.walk(DIST_DIR):
        for entry in dirs + files:
            if entry.startswith("_"):
                bad_entries.append(os.path.join(root, entry))
    if bad_entries:
        print("Error: dist/ contains reserved underscore-prefixed entries:", file=sys.stderr)
        for entry in bad_entries:
            print(f"  {entry}", file=sys.stderr)
        sys.exit(1)
    print("dist/ is clean and ready to load in Chrome")


def main():
    clean_dist()
    copy_extension_files()
    validate_dist()
    print(f"\nBuild complete. Load the extension from: {DIST_DIR}")


if __name__ == "__main__":
    main()
