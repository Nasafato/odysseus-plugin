import { App, PluginSettingTab, Setting } from 'obsidian';
import ObsidianPlugin from '../../../main';
import { OdysseusSettings } from '../../types/OdysseusSettings';

export const DEFAULT_SETTINGS: OdysseusSettings = {
	voyageApiKey: ''
};

export class OdysseusSettingTab extends PluginSettingTab {
	plugin: ObsidianPlugin;

	constructor(app: App, plugin: ObsidianPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Odysseus Plugin Settings' });

		new Setting(containerEl)
			.setName('Voyage AI API Key')
			.setDesc('Enter your Voyage AI API key for embeddings')
			.addText(text => text
				.setPlaceholder('Enter your API key')
				.setValue(this.plugin.settings.voyageApiKey)
				.onChange(async (value) => {
					this.plugin.settings.voyageApiKey = value;
					await this.plugin.saveSettings();
				}));
	}
}