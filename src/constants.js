const CONSTANTS = {
  MODULE_NAME: "sequencer",
  FLAG_NAME: "effects",
  COLOR: {
    PRIMARY: 0xEE442F,
    SECONDARY: 0x601A4A,
    TERTIARY: 0x601A4A
  },
  SHAPES: {
    POLY: "polygon",
    RECT: "rectangle",
    CIRC: "circle",
    ELIP: "ellipse",
    RREC: "roundedRect",
  },
  FEET_REGEX: new RegExp(/\.[0-9]+ft\.*/g)
}

export default CONSTANTS;
