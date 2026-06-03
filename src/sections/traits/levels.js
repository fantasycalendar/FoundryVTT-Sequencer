import CONSTANTS from "../../constants.js";

export default {
	_levels: null,

	/**
	 * Restricts this section to one or more scene levels on Foundry v14+.
	 * Accepts a level id, level name, Level document, or an array mixing
	 * any of those. Pass null to clear. Doesn't do anything on older
	 * Foundry versions.
	 *
	 * Strings (ids or names) are resolved against the scene the section
	 * is playing in, not the scene that was viewed when the section was
	 * built. Level documents resolve to their id at build time.
	 *
	 * @param {string|foundry.documents.Level|Array<string|foundry.documents.Level>|null} inLevels
	 * @returns {this}
	 */
	onLevels(inLevels) {
		if (!CONSTANTS.IS_V14) return this;
		if (inLevels === null || inLevels === undefined) {
			this._levels = null;
			return this;
		}
		const arr = Array.isArray(inLevels) ? inLevels : [inLevels];
		const entries = arr.map((item) => {
			if (item && typeof item === "object" && item.documentName === "Level" && typeof item.id === "string") return item.id;
			if (typeof item === "string") return item;
			throw this.sequence._customError(
				this,
				"onLevels",
				"expected a level id, level name, Level document, or an array of any combination"
			);
		});
		this._levels = entries.length ? entries : null;
		return this;
	},
};
