# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Obsidian Environment
As of version 1.8.9, Obsidian is using [Electron 34.3.0](https://releases.electronjs.org/release/v34.3.0).

This gives it access to [NodeJS 20.18.3](https://github.com/nodejs/node/releases/tag/v20.18.3).

### Obsidian API

#### Vault Operations
Access files through `this.app.vault`:

**File Discovery:**
- `app.vault.getFiles()` - Get all files in vault
- `app.vault.getMarkdownFiles()` - Get only markdown files  
- `app.vault.getAllLoadedFiles()` - Get all loaded files
- `app.vault.getFileByPath(path: string)` - Get file by path

**File Reading:**
- `app.vault.cachedRead(file: TFile)` - Read file contents (cached)
- `app.vault.read(file: TFile)` - Read file contents (direct)

**File Writing:**
- `app.vault.modify(file: TFile, data: string)` - Modify existing file
- `app.vault.create(path: string, data: string)` - Create new file

**Path & Adapter Methods:**
- `app.vault.adapter.getBasePath()` - Get vault absolute path (FileSystemAdapter only)
- `app.vault.configDir` - Get config directory path
- `app.vault.adapter.getResourcePath(path: string)` - Get resource path with app:// protocol

**Vault Path Helper:**
```typescript
import { FileSystemAdapter } from 'obsidian';

function getVaultAbsolutePath(app: App): string | null {
    const adapter = app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) {
        return adapter.getBasePath();
    }
    return null; // Mobile or other adapter types
}
```

**Currently Used Methods in Codebase:**
- `app.vault.getFileByPath()` - Get file by path (indexer.ts:24)
- `app.vault.cachedRead()` - Read file contents (indexer.ts:26, 36)  
- `app.vault.getMarkdownFiles()` - Get all markdown files (indexer.ts:34)
- `app.workspace.getActiveViewOfType()` - Get active view (main.ts:54)



## Development Commands

- `npm run dev` - Start development mode with file watching and auto-compilation
- `npm run build` - Build for production (runs TypeScript checks then builds with esbuild)
- `npm version patch|minor|major` - Bump version in manifest.json, package.json, and versions.json
- `eslint main.ts` - Run linting on TypeScript files

## Project Structure

This is an Obsidian plugin built with TypeScript and esbuild:

- `main.ts` - Main plugin entry point extending Obsidian's Plugin class
- `manifest.json` - Plugin metadata and configuration
- `esbuild.config.mjs` - Build configuration using esbuild bundler
- Development builds include inline source maps; production builds are minified

## Key Architecture

The plugin follows Obsidian's standard plugin architecture:
- Main plugin class extends `Plugin` from 'obsidian'
- Uses `this.app` to access Obsidian's App instance
- File operations via `this.app.vault` (getFiles(), getMarkdownFiles(), getAllLoadedFiles())
- Plugin lifecycle: `onload()` for initialization, `onunload()` for cleanup
- Settings managed through `loadData()`/`saveData()` and PluginSettingTab

## Development Notes

- Plugin runs in Obsidian's sandboxed environment
- External dependencies must be declared in esbuild.config.mjs externals array
- TypeScript compilation uses ES6 target with strict null checks
- Hot reload requires reloading Obsidian or toggling plugin in settings

## Code Style and Performance

- Use `for (const ... of) instead of .forEach`