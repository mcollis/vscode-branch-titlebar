import * as vscode from 'vscode';
import { execSync } from 'child_process';
import * as crypto from 'crypto';
import * as path from 'path';

function getCurrentBranch(workspaceFolder: string): string | null {
    try {
        const branch = execSync('git rev-parse --abbrev-ref HEAD', {
            cwd: workspaceFolder,
            encoding: 'utf8'
        }).trim();
        return branch;
    } catch (error) {
        return null;
    }
}

function getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(rgb1: number[], rgb2: number[]): number {
    const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
    const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

function hslToRgb(h: number, s: number, l: number): number[] {
    const sNorm = s / 100;
    const lNorm = l / 100;
    const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = lNorm - c / 2;

    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function hashStringToColor(str: string): { hue: number; saturation: number; lightness: number } {
    // Use SHA-256 for generating color components
    const hash = crypto.createHash('sha256').update(str).digest();

    // Read different parts of hash for different color components
    const hueValue = hash.readUInt32BE(0);
    const satValue = hash.readUInt32BE(4);
    const lightValue = hash.readUInt32BE(8);

    // Hue: Full spectrum (0-360)
    const hue = hueValue % 360;

    // Saturation: 40-60% (good color without being too vibrant or dull)
    const saturation = 40 + (satValue % 21);

    // Lightness: Start with 28-35% range
    let lightness = 28 + (lightValue % 8);

    // Dynamically darken until we meet minimum contrast ratio of 4.5:1 with white
    const whiteRgb = [255, 255, 255];
    const MIN_CONTRAST = 4.5;

    while (lightness > 20) {
        const rgb = hslToRgb(hue, saturation, lightness);
        const contrast = getContrastRatio(whiteRgb, rgb);

        if (contrast >= MIN_CONTRAST) {
            break;
        }

        // Darken by 1% and try again
        lightness -= 1;
    }

    return { hue, saturation, lightness };
}

function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
        r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x;
    }

    const rgbToHex = (r: number, g: number, b: number): string => {
        return '#' + [r, g, b].map(x => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    };

    return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

function setupSkipWorktree(workspaceFolder: string, workspaceFile: string) {
    try {
        const filename = path.basename(workspaceFile);

        // Always try to set skip-worktree (it's idempotent)
        execSync(`git update-index --skip-worktree "${filename}"`, {
            cwd: workspaceFolder,
            encoding: 'utf8'
        });

        console.log(`Branch Title Bar: ✓ Set skip-worktree on ${filename} in ${workspaceFolder}`);

        // Verify it was set
        const result = execSync('git ls-files -v', {
            cwd: workspaceFolder,
            encoding: 'utf8'
        });

        const isSkipped = result.split('\n').some(line =>
            line.startsWith('S') && line.includes(filename)
        );

        if (isSkipped) {
            console.log(`Branch Title Bar: ✓ Verified ${filename} is skip-worktree`);
        } else {
            console.warn(`Branch Title Bar: ⚠ Failed to verify skip-worktree on ${filename}`);
        }
    } catch (error) {
        console.error(`Branch Title Bar: ✗ Failed to set skip-worktree: ${error}`);
    }
}

async function updateTitleBarColor() {
    try {
        const config = vscode.workspace.getConfiguration('branchTitleBar');
        const enabled = config.get<boolean>('enabled', true);

        if (!enabled) {
            console.log('Branch Title Bar: Extension is disabled');
            return;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            console.log('Branch Title Bar: No workspace folders found');
            return;
        }

        const workspaceFolder = workspaceFolders[0].uri.fsPath;
        console.log(`Branch Title Bar: Workspace folder: ${workspaceFolder}`);

        const branch = getCurrentBranch(workspaceFolder);

        if (!branch) {
            console.log('Branch Title Bar: No branch detected');
            return;
        }

        // Generate color from branch name
        const generatedColor = hashStringToColor(branch);

        // Allow config overrides (if not set, use generated values)
        const saturation = config.get<number>('saturation') ?? generatedColor.saturation;
        const lightness = config.get<number>('lightness') ?? generatedColor.lightness;
        const hue = generatedColor.hue;

        const hexColor = hslToHex(hue, saturation, lightness);

        console.log(`Branch Title Bar: Branch "${branch}" -> Color ${hexColor} (H:${hue} S:${saturation} L:${lightness})`);

        // Find workspace file
        const workspaceFile = vscode.workspace.workspaceFile;
        if (!workspaceFile) {
            console.log('Branch Title Bar: No workspace file found');
            vscode.window.showWarningMessage('Branch Title Bar: No workspace file found. Open a workspace to use this extension.');
            return;
        }

        console.log(`Branch Title Bar: Workspace file: ${workspaceFile.fsPath}`);

        // Setup skip-worktree on first run
        setupSkipWorktree(workspaceFolder, workspaceFile.fsPath);

        // Update workbench color customizations
        const wsConfig = vscode.workspace.getConfiguration();
        const currentColors = wsConfig.get('workbench.colorCustomizations', {});

        const newColors = {
            ...currentColors,
            'titleBar.activeBackground': hexColor,
            'titleBar.inactiveBackground': hexColor,
            'titleBar.activeForeground': '#FFFFFF',
            'titleBar.inactiveForeground': '#FFFFFF'
        };

        console.log('Branch Title Bar: Updating workspace configuration...');
        await wsConfig.update(
            'workbench.colorCustomizations',
            newColors,
            vscode.ConfigurationTarget.Workspace
        );

        console.log(`Branch Title Bar: ✓ Successfully set title bar color to ${hexColor} for branch "${branch}"`);
    } catch (error) {
        console.error('Branch Title Bar: Error updating color:', error);
        vscode.window.showErrorMessage(`Branch Title Bar error: ${error}`);
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Branch Title Bar extension activated');

    // Update on activation
    updateTitleBarColor();

    // Watch for git changes
    const gitWatcher = vscode.workspace.createFileSystemWatcher('**/.git/HEAD');

    context.subscriptions.push(
        gitWatcher.onDidChange(() => updateTitleBarColor()),
        gitWatcher
    );

    // Register command to manually update
    const updateCommand = vscode.commands.registerCommand(
        'branchTitleBar.updateColor',
        updateTitleBarColor
    );

    context.subscriptions.push(updateCommand);
}

export function deactivate() {
    // Cleanup if needed
}
