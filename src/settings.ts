import { App, PluginSettingTab, Setting } from 'obsidian';
import type FormatCheckPlugin from './main';

export interface FormatCheckSettings {
	dotColor: string;
	includedFolders: string[];
	formattedField: string;
	modifiedField: string;
}

export const DEFAULT_SETTINGS: FormatCheckSettings = {
	dotColor: '#f59e0b',
	includedFolders: [],
	formattedField: 'formatted',
	modifiedField: 'modified',
};

export class FormatCheckSettingTab extends PluginSettingTab {
	plugin: FormatCheckPlugin;

	constructor(app: App, plugin: FormatCheckPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Dot color')
			.setDesc('Color of the indicator shown on files that need formatting.')
			.addColorPicker(picker =>
				picker
					.setValue(this.plugin.settings.dotColor)
					.onChange(async value => {
						this.plugin.settings.dotColor = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Included folders')
			.setDesc(
				'Only check files in these folders (one folder path per line). Leave empty to check all Markdown files.'
			)
			.addTextArea(text => {
				text
					.setPlaceholder('References\nlibrary')
					.setValue(this.plugin.settings.includedFolders.join('\n'))
					.onChange(async value => {
						this.plugin.settings.includedFolders = value
							.split('\n')
							.map(f => f.trim())
							.filter(f => f.length > 0);
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 6;
				text.inputEl.addClass('format-check-folder-input');
			});

		new Setting(containerEl)
			.setName('Formatted field')
			.setDesc(
				'Frontmatter field name for the formatted timestamp. Default: formatted'
			)
			.addText(text =>
				text
					.setValue(this.plugin.settings.formattedField)
					.onChange(async value => {
						const trimmed = value.trim();
						this.plugin.settings.formattedField =
							trimmed.length > 0
								? trimmed
								: DEFAULT_SETTINGS.formattedField;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Modified field')
			.setDesc(
				'Frontmatter field name for the last modified timestamp. Default: modified'
			)
			.addText(text =>
				text
					.setValue(this.plugin.settings.modifiedField)
					.onChange(async value => {
						const trimmed = value.trim();
						this.plugin.settings.modifiedField =
							trimmed.length > 0
								? trimmed
								: DEFAULT_SETTINGS.modifiedField;
						await this.plugin.saveSettings();
					})
			);
	}
}
