let shader = `
uniform sampler2D uSampler;
varying vec2 vTextureCoord;
float alpha;

void main() {
    vec4 pixel = texture2D(uSampler, vTextureCoord);
    alpha = smoothstep(0.6,1.0,pixel.a);
    gl_FragColor = vec4(alpha, alpha, alpha, pixel.a);
}
`;

export default class ClipFilter extends PIXI.Filter{
    constructor() {
        super(null, shader);
    }
}