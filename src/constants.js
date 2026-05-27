const CONSTANTS = {
  MODULE_NAME: "sequencer",
  EFFECTS_FLAG_NAME: "effects",
  SOUNDS_FLAG_NAME: "sounds",
	EFFECTS_LAYER: "sequencerEffects",
	DATABASE_NAME: "sequencerDatabase",
	INTERFACE_LAYER: "sequencerInterfaceLayer",
	IS_V14: false,
  COLOR: {
    PRIMARY: 0xee442f,
    SECONDARY: 0x601a4a,
    TERTIARY: 0x601a4a,
  },
  SHAPES: {
    POLY: "polygon",
    RECT: "rectangle",
    CIRC: "circle",
    ELIP: "ellipse",
    RREC: "roundedRect",
  },
  FEET_REGEX: new RegExp(/\.[0-9]+ft\.*/g),
  ARRAY_REGEX: new RegExp(/\.[0-9]$/g),
  STATUS: {
    READY: 0,
    RUNNING: 1,
    COMPLETE: 2,
    SKIPPED: 3,
    ABORTED: 4,
  },

	PLACEMENT_RESTRICTIONS: {
		ANYWHERE: "anywhere",
		LINE_OF_SIGHT: "lineOfSight",
		NO_COLLIDABLES: "noCollidables"
	},

	CALLBACKS: {
		SHOW: "show",
		MOUSE_MOVE: "mouseMove",
		MOVE: "move",
		COLLIDE: "collide",
		STOP_COLLIDING: "stopColliding",
		INVALID_PLACEMENT: "invalidPlacement",
		PLACED: "placed",
		CANCEL: "cancel"
	},

	/**
	 * Map of user-friendly blend mode names to PIXI.BLEND_MODES numeric values.
	 * Keys are lowercase, alphanumeric, and underscore-tolerant. Multiple aliases
	 * (e.g. "soft_light", "soft-light", "softlight") are all accepted via the
	 * normalization in the blendMode trait.
	 */
	BLEND_MODES: {
		normal: 0,
		add: 1,
		multiply: 2,
		screen: 3,
		overlay: 4,
		darken: 5,
		lighten: 6,
		color_dodge: 7,
		color_burn: 8,
		hard_light: 9,
		soft_light: 10,
		difference: 11,
		exclusion: 12,
		hue: 13,
		saturation: 14,
		color: 15,
		luminosity: 16,
		normal_npm: 17,
		add_npm: 18,
		screen_npm: 19,
		none: 20,
		subtract: 28,
		erase: 29
	},

	/**
	 * Blend modes that PIXI v7 exposes by name but does not actually implement.
	 * Their entries in PIXI's WebGL state table (mapWebGLBlendModesToPixi) are
	 * aliased to the same [gl.ONE, gl.ONE_MINUS_SRC_ALPHA] pair as NORMAL, so
	 * the GPU composites them as normal blending. Listed here so the blendMode
	 * trait can warn the user when one is requested.
	 */
	UNSUPPORTED_BLEND_MODES: new Set([
		4,  // overlay
		5,  // darken
		6,  // lighten
		7,  // color_dodge
		8,  // color_burn
		9,  // hard_light
		10, // soft_light
		11, // difference
		12, // exclusion
		13, // hue
		14, // saturation
		15, // color
		16  // luminosity
	])
};

CONSTANTS.TOOLS = {
	SELECT: `${CONSTANTS.MODULE_NAME}-select-effect`,
	PLAY: `${CONSTANTS.MODULE_NAME}-play-effect`,
	VIEWER: `${CONSTANTS.MODULE_NAME}-effectviewer`,
	DATABASE: `${CONSTANTS.MODULE_NAME}-effectdatabase`
}

CONSTANTS.EFFECTS_FLAG = `flags.${CONSTANTS.MODULE_NAME}.${CONSTANTS.EFFECTS_FLAG_NAME}`;
CONSTANTS.REMOVE_EFFECTS_FLAG = `flags.${CONSTANTS.MODULE_NAME}.-=${CONSTANTS.EFFECTS_FLAG_NAME}`;
CONSTANTS.SOUNDS_FLAG = `flags.${CONSTANTS.MODULE_NAME}.${CONSTANTS.SOUNDS_FLAG_NAME}`;
CONSTANTS.REMOVE_SOUNDS_FLAG = `flags.${CONSTANTS.MODULE_NAME}.-=${CONSTANTS.SOUNDS_FLAG_NAME}`;

export default CONSTANTS;
