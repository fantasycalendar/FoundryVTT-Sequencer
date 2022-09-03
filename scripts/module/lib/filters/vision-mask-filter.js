export default class VisionMaskFilter extends AbstractBaseMaskFilter {
    
    /** @override */
    static fragmentShader = `
    precision mediump float;
    varying vec2 vTextureCoord;
    varying vec2 vMaskTextureCoord;
    uniform sampler2D uSampler;
    uniform sampler2D uMaskSampler;
    void main() {
      float mask = texture2D(uMaskSampler, vMaskTextureCoord).r;
      gl_FragColor = texture2D(uSampler, vTextureCoord) * mask;
    }`;
    
    /** @override */
    static defaultUniforms = {
        uMaskSampler: null
    };
    
    /** @override */
    static create() {
        return super.create({
            uMaskSampler: canvas.masks.vision.renderTexture
        });
    }
    
    /** @override */
    get enabled() {
        return canvas.effects.visibility.visible;
    }
    
    set enabled(value) { }
}