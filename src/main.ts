import { Plugin, TFile, TAbstractFile } from 'obsidian';
import {
	FormatCheckSettings,
	DEFAULT_SETTINGS,
	FormatCheckSettingTab,
} from './settings';

export default class FormatCheckPlugin extends Plugin {
	settings: FormatCheckSettings;

	private needsFormatPaths: Set<string> = new Set();
	private observer: MutationObserver | null = null;
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new FormatCheckSettingTab(this.app, this));

		this.updateDotColor();

		this.app.workspace.onLayoutReady(() => {
			this.scanAllFiles();
			this.applyDecorations();
			this.setupObserver();
		});

		// Re-check a file whenever its cached metadata changes
		this.registerEvent(
			this.app.metadataCache.on('changed', file => {
				this.checkFile(file);
				this.scheduleApplyDecorations();
			})
		);

		// Re-apply after layout changes (pane open/close, file explorer refresh)
		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				this.scheduleApplyDecorations();
				this.setupObserver();
			})
		);

		// Remove deleted files from the tracked set
		this.registerEvent(
			this.app.vault.on('delete', (abstractFile: TAbstractFile) => {
				if (abstractFile instanceof TFile) {
					this.needsFormatPaths.delete(abstractFile.path);
				}
			})
		);

		// Update the path when a file is renamed
		this.registerEvent(
			this.app.vault.on(
				'rename',
				(abstractFile: TAbstractFile, oldPath: string) => {
					if (abstractFile instanceof TFile) {
						const wasTracked = this.needsFormatPaths.has(oldPath);
						this.needsFormatPaths.delete(oldPath);
						if (wasTracked) {
							// Recheck under new path (scope may have changed)
							this.checkFile(abstractFile);
						}
						this.scheduleApplyDecorations();
					}
				}
			)
		);
	}

	onunload() {
		this.observer?.disconnect();
		this.observer = null;
		if (this.debounceTimer) clearTimeout(this.debounceTimer);
		document
			.querySelectorAll('.format-check-dot')
			.forEach(el => el.remove());
		document.body.style.removeProperty('--format-check-dot-color');
	}

	// ── Scanning ─────────────────────────────────────────────────────────────

	private scanAllFiles() {
		this.needsFormatPaths.clear();
		for (const file of this.app.vault.getMarkdownFiles()) {
			this.checkFile(file);
		}
	}

	private checkFile(file: TFile) {
		if (!this.isInScope(file.path)) {
			this.needsFormatPaths.delete(file.path);
			return;
		}

		const frontmatter =
			this.app.metadataCache.getFileCache(file)?.frontmatter;

		if (!frontmatter) {
			this.needsFormatPaths.delete(file.path);
			return;
		}

		const formattedMs = this.toMs(frontmatter[this.settings.formattedField]);
		const modifiedMs = this.toMs(frontmatter[this.settings.modifiedField]);

		// Needs formatting if: no formatted field, OR formatted is before modified
		const needsFormat =
			formattedMs === null ||
			(modifiedMs !== null && formattedMs < modifiedMs);

		if (needsFormat) {
			this.needsFormatPaths.add(file.path);
		} else {
			this.needsFormatPaths.delete(file.path);
		}
	}

	/**
	 * Convert a frontmatter timestamp value to milliseconds.
	 * Handles both Date objects (YAML auto-parsed) and strings (YYYY-MM-DD HH:mm).
	 */
	private toMs(value: unknown): number | null {
		if (value instanceof Date) {
			const ms = value.getTime();
			return isNaN(ms) ? null : ms;
		}
		if (typeof value === 'string' && value.trim()) {
			// Replace space separator with T so Date.parse handles it correctly
			const d = new Date(value.trim().replace(' ', 'T'));
			const ms = d.getTime();
			return isNaN(ms) ? null : ms;
		}
		return null;
	}

	private isInScope(path: string): boolean {
		const { includedFolders } = this.settings;
		if (includedFolders.length === 0) return true;
		return includedFolders.some(folder => {
			const prefix = folder.endsWith('/') ? folder : folder + '/';
			return path.startsWith(prefix);
		});
	}

	// ── Decoration ───────────────────────────────────────────────────────────

	private scheduleApplyDecorations() {
		if (this.debounceTimer) clearTimeout(this.debounceTimer);
		this.debounceTimer = setTimeout(() => {
			this.applyDecorations();
			this.debounceTimer = null;
		}, 50);
	}

	applyDecorations() {
		// Clear existing dots
		document
			.querySelectorAll('.format-check-dot')
			.forEach(el => el.remove());

		// Add a dot to each visible file-tree item whose path is in the set
		document
			.querySelectorAll<HTMLElement>('.nav-file-title[data-path]')
			.forEach(el => {
				const path = el.getAttribute('data-path');
				if (path && this.needsFormatPaths.has(path)) {
					el.createSpan({ cls: 'format-check-dot' });
				}
			});
	}

	/**
	 * Watch the file explorer container so dots are applied to items that
	 * appear after the initial render (folder expand, virtual scroll, etc.).
	 */
	private setupObserver() {
		this.observer?.disconnect();

		const container = document.querySelector('.nav-files-container');
		if (!container) return;

		this.observer = new MutationObserver(mutations => {
			for (const mutation of mutations) {
				for (const node of Array.from(mutation.addedNodes)) {
					if (!(node instanceof HTMLElement)) continue;

					const decorate = (el: HTMLElement) => {
						const path = el.getAttribute('data-path');
						if (
							path &&
							this.needsFormatPaths.has(path) &&
							!el.querySelector('.format-check-dot')
						) {
							el.createSpan({ cls: 'format-check-dot' });
						}
					};

					// The added node itself might be a title element
					if (node.classList.contains('nav-file-title')) {
						decorate(node);
					}
					// Or it might contain title elements (e.g. folder contents)
					node
						.querySelectorAll<HTMLElement>(
							'.nav-file-title[data-path]'
						)
						.forEach(decorate);
				}
			}
		});

		this.observer.observe(container, { childList: true, subtree: true });
	}

	// ── Settings helpers ─────────────────────────────────────────────────────

	updateDotColor() {
		document.body.style.setProperty(
			'--format-check-dot-color',
			this.settings.dotColor
		);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData() as Partial<FormatCheckSettings>
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.updateDotColor();
		this.scanAllFiles();
		this.applyDecorations();
	}
}
