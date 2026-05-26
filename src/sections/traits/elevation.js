export default {
	_elevation: null,

	/**
	 * Sets the section's elevation, either as a single Z value or as an
	 * elevation range `[bottom, top]`. The range form makes the section
	 * visible on every scene level it reaches on Foundry v14+.
	 *
	 * @param {number|[number, number]} inElevation
	 * @param {Object} inOptions
	 * @returns {this}
	 */
	elevation(inElevation, inOptions = {}) {
		let bottom;
		let top;
		if (typeof inElevation === "number") {
			bottom = inElevation;
		} else if (Array.isArray(inElevation)
			&& inElevation.length === 2
			&& inElevation.every(n => typeof n === "number")) {
			bottom = Math.min(inElevation[0], inElevation[1]);
			top = Math.max(inElevation[0], inElevation[1]);
		} else {
			throw this.sequence._customError(
				this,
				"elevation",
				"inElevation must be a number or a [bottom, top] array of two numbers"
			);
		}
		if (typeof inOptions !== "object")
			throw this.sequence._customError(
				this,
				"elevation",
				`inOptions must be of type object`
			);

		inOptions = foundry.utils.mergeObject(
			{
				elevation: 1,
				absolute: false,
			},
			inOptions
		);

		if (typeof inOptions.absolute !== "boolean")
			throw this.sequence._customError(
				this,
				"elevation",
				"inOptions.absolute must be of type boolean"
			);
		this._elevation = {
			elevation: bottom,
			top,
			absolute: inOptions.absolute,
		};
		return this;
	},
};
