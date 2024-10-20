import VisionSamplerShader from "./lib/filters/vision-sampler-shader.js";
import { debug } from "./lib/lib.js";

export default function registerBatchShader() {
  VisionSamplerShader.registerPlugin();

  debug("Registered VisionBatchShader");
}
