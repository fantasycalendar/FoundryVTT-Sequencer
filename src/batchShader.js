import VisionSamplerShader from "./lib/filters/vision-mask-filter.js";
import { debug } from "./lib/lib.js";

export default function registerBatchShader() {
  VisionSamplerShader.registerPlugin();

  debug("Registered VisionBatchShader");
}
