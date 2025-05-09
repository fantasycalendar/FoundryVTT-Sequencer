const CONSTANTS = {
  MODULE_NAME: "sequencer",
  EFFECTS_FLAG_NAME: "effects",
  SOUNDS_FLAG_NAME: "sounds",
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

export default CONSTANTS;
