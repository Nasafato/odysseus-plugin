import { requestUrl } from "obsidian";
import Database from "better-sqlite3";
import fs from "fs-extra";
import * as tar from "tar";
import path from "path";
import os from "os";

const PACKAGE_VERSION = "12.2.0";

let db: Database.Database;

export async function setupSqlite(pluginDataDir: string) {
	const binaryPath = path.join(pluginDataDir, "better_sqlite3.node");
	if (!(await fs.exists(binaryPath))) {
		await downloadBetterSqlite3(pluginDataDir);
		console.log("better_sqlite3.node downloaded");
	} else {
		console.log("better_sqlite3.node already exists, skipping download");
	}

	db = new Database(path.join(pluginDataDir, "odysseus.db"), {
		nativeBinding: binaryPath,
	});

	db.exec(
		"CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)"
	);

	db.prepare("INSERT INTO test (name) VALUES (?)").run("John Doe");

	const rows = db.prepare("SELECT * FROM test").all();
	console.log(rows);
}

async function downloadBetterSqlite3(pluginDataDir: string) {
	const downloadUrl = buildBetterSqlite3DownloadUrl(PACKAGE_VERSION);
	try {
		const response = await requestUrl({
			url: downloadUrl,
			method: "GET",
		});

		if (response.status !== 200) {
			throw new Error(`Failed to download: ${response.status}`);
		}

		const buffer = Buffer.from(response.arrayBuffer);

		const tempDir = os.tmpdir();
		const pluginTempDir = path.join(tempDir, "odysseus-plugin");
		await fs.ensureDir(pluginTempDir);
		const tempFilePath = path.join(
			pluginTempDir,
			`better-sqlite3-${Date.now()}.tar.gz`
		);

		fs.writeFileSync(tempFilePath, buffer);

		await tar.extract({
			file: tempFilePath,
			cwd: pluginTempDir,
			filter: (filePath: string) =>
				filePath.includes("better_sqlite3.node"),
		});

		const addonPath = path.join(
			pluginTempDir,
			"build",
			"Release",
			"better_sqlite3.node"
		);
		await fs.copy(
			addonPath,
			path.join(pluginDataDir, "better_sqlite3.node")
		);
		await fs.unlink(tempFilePath);
		await fs.rm(pluginTempDir, { recursive: true, force: true });

		console.log("Successfully extracted better-sqlite3.node");
	} catch (error) {
		console.error("Error setting up better-sqlite3:", error);
		throw error;
	}
}

// https://github.com/WiseLibs/better-sqlite3/releases/download/v12.2.0/better-sqlite3-v12.2.0-electron-v123-darwin-x64.tar.gz
function buildBetterSqlite3DownloadUrl(packageVersion: string): string {
	const platform = process.platform;
	const arch = process.arch;
	const abiVersion = process.versions.modules;
	return `https://github.com/WiseLibs/better-sqlite3/releases/download/v${packageVersion}/better-sqlite3-v${packageVersion}-electron-v${abiVersion}-${platform}-${arch}.tar.gz`;
}
