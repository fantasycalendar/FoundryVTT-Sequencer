import ColorMatrixFilter from "./filters/color-matrix-filter.js";
import BlurFilter from "./filters/blur-filter.js";
import NoiseFilter from "./filters/noise-filter.js";
import BlurFilterPass from "./filters/blur-filter-pass.js";
import GlowFilter from "./filters/glow-filter.js";

const filters = {
	"ColorMatrix": ColorMatrixFilter,
	"Blur": BlurFilter,
	"BlurDirectional": BlurFilterPass,
	"Noise": NoiseFilter,
	"Glow": GlowFilter,
}

export default filters;