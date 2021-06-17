import Version from "../version.js";
import { EffectsCanvasAnimation } from "./canvas-animation.js";
import { easeFunctions } from "./ease.js";

export default class CanvasEffect {

    constructor(inLayer, inData) {

        this.layer = inLayer;
        this._animationDuration = 0;

        let version = new Version().onOrAfter("0.8.6");
        this.mergeFunc = version ? foundry.utils.mergeObject : mergeObject;
        this.hasProperty = version ? foundry.utils.hasProperty : hasProperty;

        // Set default values
        this.data = this.mergeFunc({
            anchor: { x: 0.5, y: 0.5 },
            rotation: 0,
            scale: { x: 1.0, y: 1.0 },
            position: { x: 0, y: 0 },
            playbackRate: 1.0,
            fadeIn: 0,
            fadeOut: 0,
            ease: "Linear"
        }, inData);

    }

    spawnSprite(video){
        const texture = PIXI.Texture.from(video);
        this.vidSprite = new PIXI.Sprite(texture);
        this.layer.addChild(this.vidSprite);
        this.vidSprite.anchor.set(this.data.anchor.x, this.data.anchor.y);
        this.vidSprite.rotation = Math.normalizeRadians(this.data.rotation - Math.toRadians(this.data.angle));
        this.vidSprite.scale.set(this.data.scale.x, this.data.scale.y);
        this.vidSprite.position.set(this.data.position.x, this.data.position.y);
        this._animationDuration = video.duration * 1000;
    }

    _playAnimation(attributes, duration, ease="Linear"){
        return function() {
            EffectsCanvasAnimation.animateSmooth(attributes, {
                name: `effects.video.${randomID()}.move`,
                context: this,
                duration: duration,
                ease: easeFunctions[ease]
            });
        };
    }

    fadeIn(vidSprite){
        if(this.data.fadeIn) {
            this.vidSprite.alpha = 0.0;
            this._playAnimation([
                { parent: this.vidSprite, attribute: "alpha", to: 1.0 }
            ], this.data.fadeIn)();
        }
    }

    fadeOut(vidSprite){
        if(this.data.fadeOut) {
            let animate = this._playAnimation([
                { parent: this.vidSprite, attribute: "alpha", to: 0.0 }
            ], this.data.fadeOut)
            setTimeout(animate, this._animationDuration-this.data.fadeOut);
        }
    }

    moveTowards(){

        if ((!this.data.speed || this.data.speed === 0) && !this.data.distance) {
            return;
        }

        // Compute final position
        const delta = this._animationDuration * data.speed;
        const deltaX = delta * Math.cos(this.data.rotation)
        const deltaY = delta * Math.sin(this.data.rotation)

        // Move the sprite
        let move_attributes = [{
            parent: this.vidSprite, attribute: 'x', to: this.data.position.x + deltaX
        }, {
            parent: this.vidSprite, attribute: 'y', to: this.data.position.y + deltaY
        }];

        this._playAnimation(move_attributes, this._animationDuration, this.data.ease)();

    }

    async play(){

        return new Promise((resolve, reject) => {

            const video = document.createElement("video");
            video.preload = "auto";
            video.crossOrigin = "anonymous";
            video.src = this.data.file;
            video.playbackRate = this.data.playbackRate;

            video.oncanplay = () => {
                this.spawnSprite(video);
                this.fadeIn();
                this.fadeOut();
                this.moveTowards();
            };

            video.onerror = () => {
                try {
                    this.layer.removeChild(this.vidSprite);
                }catch(err){}
                console.error(`Could not play ${this.data.file}!`)
                reject();
            }

            video.onended = () => {
                this.layer.removeChild(this.vidSprite);
                resolve();
                this.vidSprite.destroy();
            }
        })

    }

}