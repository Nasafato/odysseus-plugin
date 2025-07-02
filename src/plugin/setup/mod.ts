import { App, requestUrl } from "obsidian";
import path from "path";
import fs from "fs-extra";
import os from "os";
import { setupSqlite } from "./setup-sqlite";

export async function setup(app: App) {
	const pluginDataDir = getPluginDataDir();
	await fs.ensureDir(pluginDataDir).catch((err) => {
		console.error("Error ensuring plugin data directory:", err);
		throw err;
	});
	await setupSqlite(pluginDataDir);
}

function getPluginDataDir() {
	const homeDir = os.homedir();
	if (process.platform === "win32") {
		return path.join(
			homeDir,
			"AppData",
			"Roaming",
			"Obsidian",
			"plugins",
			"odysseus-plugin"
		);
	} else if (process.platform === "linux" || process.platform === "darwin") {
		return path.join(
			homeDir,
			".config",
			"obsidian",
			"plugins",
			"odysseus-plugin"
		);
	}
	throw new Error(`Unsupported platform: ${process.platform}`);
}
