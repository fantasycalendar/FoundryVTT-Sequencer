export default class GlowFilter extends globalThis.PIXI.Filter {

	static defaults = {
		distance: 10,
		outerStrength: 4,
		innerStrength: 0,
		color: 0xffffff,
		quality: 0.1,
		knockout: false,
		alpha: 1,
	}


	constructor(options) {

		const opts = Object.assign({}, GlowFilter.defaults, options);
		const {
			outerStrength,
			innerStrength,
			color,
			knockout,
			quality,
			alpha
		} = opts;

		const distance = Math.round(opts.distance);

		super(vertex, frag
			.replace(/__ANGLE_STEP_SIZE__/gi, `${(1 / quality / distance).toFixed(7)}`)
			.replace(/__DIST__/gi, `${distance.toFixed(0)}.0`));

		this.uniforms.glowColor = new Float32Array([0, 0, 0, 1]);
		this.uniforms.alpha = 1;

		Object.assign(this, {
			color,
			outerStrength,
			innerStrength,
			padding: distance,
			knockout,
			alpha,
		});

		this.isValid = true;
	}

	/**
	 * The color of the glow.
	 * @default 0xFFFFFF
	 */
	get color()
	{
		return PIXI.utils.rgb2hex(this.uniforms.glowColor);
	}
	set color(value)
	{
		PIXI.utils.hex2rgb(value, this.uniforms.glowColor);
	}

	/**
	 * The strength of the glow outward from the edge of the sprite.
	 * @default 4
	 */
	get outerStrength()
	{
		return this.uniforms.outerStrength;
	}
	set outerStrength(value)
	{
		this.uniforms.outerStrength = value;
	}

	/**
	 * The strength of the glow inward from the edge of the sprite.
	 * @default 0
	 */
	get innerStrength()
	{
		return this.uniforms.innerStrength;
	}
	set innerStrength(value)
	{
		this.uniforms.innerStrength = value;
	}

	/**
	 * Only draw the glow, not the texture itself
	 * @default false
	 */
	get knockout()
	{
		return this.uniforms.knockout;
	}
	set knockout(value)
	{
		this.uniforms.knockout = value;
	}

	/**
	 * The alpha value of the glow
	 * @default 1
	 */
	get alpha()
	{
		return this.uniforms.alpha;
	}
	set alpha(value)
	{
		this.uniforms.alpha = value;
	}
}

const frag = `varying vec2 vTextureCoord;
varying vec4 vColor;

uniform sampler2D uSampler;

uniform float outerStrength;
uniform float innerStrength;

uniform vec4 glowColor;

uniform vec4 filterArea;
uniform vec4 filterClamp;
uniform bool knockout;
uniform float alpha;

const float PI = 3.14159265358979323846264;

const float DIST = __DIST__;
const float ANGLE_STEP_SIZE = min(__ANGLE_STEP_SIZE__, PI * 2.0);
const float ANGLE_STEP_NUM = ceil(PI * 2.0 / ANGLE_STEP_SIZE);

const float MAX_TOTAL_ALPHA = ANGLE_STEP_NUM * DIST * (DIST + 1.0) / 2.0;

void main(void) {
    vec2 px = vec2(1.0 / filterArea.x, 1.0 / filterArea.y);

    float totalAlpha = 0.0;

    vec2 direction;
    vec2 displaced;
    vec4 curColor;

    for (float angle = 0.0; angle < PI * 2.0; angle += ANGLE_STEP_SIZE) {
       direction = vec2(cos(angle), sin(angle)) * px;

       for (float curDistance = 0.0; curDistance < DIST; curDistance++) {
           displaced = clamp(vTextureCoord + direction * 
                   (curDistance + 1.0), filterClamp.xy, filterClamp.zw);

           curColor = texture2D(uSampler, displaced);

           totalAlpha += (DIST - curDistance) * curColor.a;
       }
    }
    
    curColor = texture2D(uSampler, vTextureCoord);

    float alphaRatio = (totalAlpha / MAX_TOTAL_ALPHA);

    float innerGlowAlpha = (1.0 - alphaRatio) * innerStrength * curColor.a;
    float innerGlowStrength = min(1.0, innerGlowAlpha);
    
    vec4 innerColor = mix(curColor, glowColor, innerGlowStrength);

    float outerGlowAlpha = alphaRatio * outerStrength * (1. - curColor.a);
    float outerGlowStrength = min(1.0 - innerColor.a, outerGlowAlpha);

    if (knockout) {
      float resultAlpha = (outerGlowAlpha + innerGlowAlpha) * alpha;
      gl_FragColor = vec4(glowColor.rgb * resultAlpha, resultAlpha);
    }
    else {
      vec4 outerGlowColor = outerGlowStrength * glowColor.rgba * alpha;
      gl_FragColor = innerColor + outerGlowColor;
    }
}`;

const vertex = `attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat3 projectionMatrix;

varying vec2 vTextureCoord;

void main(void)
{
    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
    vTextureCoord = aTextureCoord;
}`;
