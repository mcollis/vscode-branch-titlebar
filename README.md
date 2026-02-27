# Branch Title Bar Color

Automatically colors your VSCode title bar based on the current git branch.

## Features

- **Automatic color generation**: Each branch gets a consistent color generated from its name using SHA-256 hashing for excellent color distribution
- **Wide color diversity**: Branch names map uniformly across the entire color spectrum (red, orange, yellow, green, cyan, blue, purple)
- **Variable saturation & lightness**: Saturation (40-60%) and lightness (28-38%) are also derived from the branch hash, ensuring even branches with similar hues are visually distinct
- **Automatic git protection**: Automatically runs `git update-index --skip-worktree` on your workspace file
- **Updates automatically**: Color changes when you switch branches
- **Customizable**: Override saturation and lightness if desired
- **Perfect for worktrees**: Quickly identify which branch/worktree you're in at a glance

## How It Works

1. Reads your current git branch
2. Generates a unique color based on the branch name (same branch = same color always)
3. Automatically runs `git update-index --skip-worktree` on your workspace file
4. Sets the title bar background color
5. Updates automatically when you switch branches

## Installation

1. Install dependencies:
   ```bash
   cd ~/git/vscode-branch-titlebar
   npm install
   ```

2. Compile the extension:
   ```bash
   npm run compile
   ```

3. Package and install:
   ```bash
   npm run package
   code --install-extension branch-titlebar-0.0.1.vsix --force
   ```

4. Reload VSCode

## Settings

- `branchTitleBar.enabled`: Enable/disable automatic coloring (default: true)
- `branchTitleBar.saturation`: Override color saturation 0-100 (if not set, automatically generated from branch name: 40-60)
- `branchTitleBar.lightness`: Override color lightness 0-100 (if not set, automatically generated from branch name: 28-38)

## Command

- **Branch Title Bar: Update Color** - Manually update the title bar color
