import { SvelteApplicationMixin } from "../SvelteMixin.js";
import SvelteDialogShell from "./svelte-dialog.svelte";

export default class SvelteDialog extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {

	static DEFAULT_OPTIONS = {
		position: {
			width: 500,
			height: "auto",
		},
		window: {
			title: "Sequencer",
			resizable: false,
		},
	}
	root = SvelteDialogShell;
}