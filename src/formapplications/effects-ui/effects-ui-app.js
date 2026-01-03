import EffectsUIShell from "./effects-ui-shell.svelte";
import { SvelteApplicationMixin } from "../SvelteMixin.js";

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
		window: {
			title: "SEQUENCER.ManagerUI",
			icon: "fa-solid fa-archive",
			resizable: false,
		},
	};

	root = EffectsUIShell;
}
