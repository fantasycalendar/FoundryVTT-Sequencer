import { mount, unmount } from 'svelte';
import { writable } from "svelte/store";

/**
 * Mixin that adds a Svelte root component to a Foundry V2 application.
 * @param {typeof foundry.applications.api.ApplicationV2} Base
 */
function SvelteApplicationMixin(Base) {
	class SvelteApplication extends Base {
		static DEFAULT_OPTIONS = {
			classes: [],
		};

		/** Root Svelte component (set this in your subclass) */
		// root

		/** State data tracked by the root component */
		$state = writable({});

		/** The mounted root component, saved to be unmounted on application close */
		#mount = {};

		root = null;

		async _renderHTML(context) {
			return context;
		}

		async _prepareContext() {
			return {
				...this.options,
				foundryApp: this
			};
		}

		_replaceHTML(result, content, options) {
			Object.assign(this.$state, result.state);
			if (options.isFirstRender) {
				this.#mount = mount(this.root, { target: content, props: { ...result, ...options, state: this.$state } });
			}
			this.updateElementProps(result, options);
		}

		updateElementProps(result, options) {
			if (!this.#mount) return;

			// Set props as properties on the custom element
			Object.assign(this.#mount, {
				...result,
				...options,
				state: this.$state,
				foundryApp: this,
			});
		}

		_onClose(options) {
			super._onClose(options);
			unmount(this.#mount);
		}

		static getActiveApp() {
			const app_v1s = Object.values(ui.windows);
			let all_apps = app_v1s.concat(
				foundry?.applications?.instances
					? Array.from(foundry?.applications?.instances.values())
					: []
			)
			return all_apps.find((app) => {
				return (
					app instanceof this && app.state > Application.RENDER_STATES.CLOSED
				);
			});
		}

		static async show(options = {}) {
			const existingApp = this.getActiveApp();
			if (existingApp) return existingApp.render({ ...options, force: true, focus: true });
			return new this(options).render({ force: true, focus: true });
		}
	}

	return SvelteApplication;
}

export { SvelteApplicationMixin };