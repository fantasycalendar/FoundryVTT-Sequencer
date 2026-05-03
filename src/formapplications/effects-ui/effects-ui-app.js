import EffectsUIShell from "./effects-ui-shell.svelte";
import { SvelteApplicationMixin } from "../SvelteMixin.js";

const PATREON_URL = "https://patreon.com/cw/fantasycomputerworks";

export class EffectsUIApp extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {

	static DEFAULT_OPTIONS = {
		classes: ["dialog"],
		tab: "manager",
		position: {
			width: "auto",
			height: "auto",
			top: 65,
			left: 120,
		},
		actions: {
			openSequencerChangelog: () => {
				if (window.Sequencer?.showChangelog) window.Sequencer.showChangelog();
			},
			openSequencerPatreon: () => {
				window.open(PATREON_URL, "_blank", "noopener");
			},
		},
		window: {
			title: "SEQUENCER.ManagerUI",
			icon: "fa-solid fa-archive",
			resizable: false,
			controls: [
				{
					action: "openSequencerChangelog",
					icon: "fa-solid fa-clipboard-list",
					label: "Changelog",
				},
				{
					action: "openSequencerPatreon",
					icon: "fa-brands fa-patreon",
					label: "Support Sequencer",
				},
			],
		},
	};

	root = EffectsUIShell;
}
