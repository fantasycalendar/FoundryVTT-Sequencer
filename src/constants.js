const CONSTANTS = {
  MODULE_NAME: "sequencer",
  EFFECTS_FLAG_NAME: "effects",
  SOUNDS_FLAG_NAME: "sounds",
	EFFECTS_LAYER: "sequencerEffects",
	INTERFACE_LAYER: "sequencerInterfaceLayer",
	IS_V13: false,
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
	}
};

CONSTANTS.TOOLS = {
	SELECT: `${CONSTANTS.MODULE_NAME}-select-effect`,
	PLAY: `${CONSTANTS.MODULE_NAME}-play-effect`,
	VIEWER: `${CONSTANTS.MODULE_NAME}-effectviewer`,
	DATABASE: `${CONSTANTS.MODULE_NAME}-effectdatabase`
}

CONSTANTS.EFFECTS_FLAG = `flags.${CONSTANTS.MODULE_NAME}.${CONSTANTS.EFFECTS_FLAG_NAME}`;
CONSTANTS.SOUNDS_FLAG = `flags.${CONSTANTS.MODULE_NAME}.${CONSTANTS.SOUNDS_FLAG_NAME}`;

export default CONSTANTS;
