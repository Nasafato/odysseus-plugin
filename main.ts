import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { setup } from './src/plugin/setup/mod';
import { createIndexVaultCommand } from './src/plugin/commands/index-vault';
import { DEFAULT_SETTINGS, OdysseusSettingTab } from './src/plugin/settings/mod';
import { OdysseusSettings } from "./src/types/OdysseusSettings";

export default class ObsidianPlugin extends Plugin {
	settings: OdysseusSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new OdysseusSettingTab(this.app, this));
		this.addCommand(createIndexVaultCommand(this.app, this.settings));
		await setup(this.app);
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

