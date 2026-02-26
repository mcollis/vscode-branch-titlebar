#!/bin/bash

# Install the extension to VSCode
EXTENSION_DIR="$HOME/.vscode/extensions/branch-statusbar-0.0.1"

echo "Installing Branch Status Bar extension..."

# Remove old version if exists
if [ -d "$EXTENSION_DIR" ]; then
    echo "Removing old version..."
    rm -rf "$EXTENSION_DIR"
fi

# Create extension directory
mkdir -p "$EXTENSION_DIR"

# Copy files
echo "Copying files..."
cp -r package.json out "$EXTENSION_DIR/"

echo "✓ Extension installed to $EXTENSION_DIR"
echo ""
echo "Please restart VSCode or run 'Reload Window' to activate the extension."
echo ""
echo "You should see a colored branch name in your status bar (bottom left)."
