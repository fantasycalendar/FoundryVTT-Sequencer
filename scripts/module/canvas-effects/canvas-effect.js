import Version from "../../version.js";
import { EffectsCanvasAnimation } from "./canvas-animation.js";
import { easeFunctions } from "./ease.js";

export default class CanvasEffect {

    constructor(inLayer, inData) {

        this.layer = inLayer;
        this.ended = false;
        this.video = false;

        let version = new Version().onOrAfter("0.8.6");
        this.mergeFunc = version ? foundry.utils.mergeObject : mergeObject;

        // Set default values
        this.data = this.mergeFunc({
            anchor: { x: 0.5, y: 0.5 },
            rotation: 0,
            scale: { x: 1.0, y: 1.0 },
            position: { x: 0, y: 0 },
            playbackRate: 1.0,
            fadeIn: 0,
            fadeOut: 0,
            ease: "linear"
        }, inData);

    }

    spawnSprite() {
        const texture = PIXI.Texture.from(this.video);
        this.sprite = new PIXI.Sprite(texture);
        this.layer.addChild(this.sprite);
        this.sprite.anchor.set(this.data.anchor.x, this.data.anchor.y);
        this.sprite.rotation = Math.normalizeRadians(this.data.rotation - Math.toRadians(this.data.angle));
        this.sprite.scale.set(this.data.scale.x, this.data.scale.y);
        this.sprite.position.set(this.data.position.x, this.data.position.y);
        this._videoDuration = this.video.duration;
        this._animationDuration = this._videoDuration * 1000;
    }

    playAnimation(attributes, duration, ease="linear"){
        return function() {
            EffectsCanvasAnimation.animateSmooth(attributes, {
                name: `effects.video.${randomID()}.animate`,
                context: this,
                duration: duration,
                ease: easeFunctions[ease]
            });
        };
    }

    fadeIn(){
        if(this.data.animatedProperties.fadeIn) {
            let fadeIn = this.data.animatedProperties.fadeIn;
            this.sprite.alpha = 0.0;
            let animate = this.playAnimation([
                { parent: this.sprite, attribute: "alpha", to: 1.0 }
            ], fadeIn.duration, fadeIn.ease);
            setTimeout(animate, fadeIn.delay);
        }
    }

    fadeOut(){
        if(this.data.animatedProperties.fadeOut) {
            let fadeOut = this.data.animatedProperties.fadeOut;
            let animate = this.playAnimation([
                { parent: this.sprite, attribute: "alpha", to: 0.0 }
            ], fadeOut.duration, fadeOut.ease)
            setTimeout(animate, this._animationDuration - fadeOut.duration);
        }
    }

    _determineScale(property){
        let scale = {
            x: property.value?.x ?? 0,
            y: property.value?.y ?? 0
        };
        if(typeof property.value === "number"){
            scale.x = property.value
            scale.y = property.value
        }
        return scale;
    }

    scaleIn(){
        if(this.data.animatedProperties.scaleIn) {
            let scaleIn = this.data.animatedProperties.scaleIn;
            let scale = this._determineScale(scaleIn)

            this.sprite.scale.set(scale.x, scale.y);

            let animate = this.playAnimation([
                { parent: this.sprite, attribute: "scale", property: "x", to: this.data.scale.x },
                { parent: this.sprite, attribute: "scale", property: "y", to: this.data.scale.y }
            ], scaleIn.duration, scaleIn.ease);
            setTimeout(animate, scaleIn.delay);
        }
    }

    scaleOut(){
        if(this.data.animatedProperties.scaleOut) {
            let scaleOut = this.data.animatedProperties.scaleOut;
            let scale = this._determineScale(scaleOut)

            let animate = this.playAnimation([
                { parent: this.sprite, attribute: "scale", property: "x", to: scale.x },
                { parent: this.sprite, attribute: "scale", property: "y", to: scale.y }
            ], scaleOut.duration, scaleOut.ease);
            setTimeout(animate, this._animationDuration - scaleOut.duration);
        }
    }

    rotateIn(){
        if(this.data.animatedProperties.rotateIn) {
            let rotateIn = this.data.animatedProperties.rotateIn;

            let original_radians = this.sprite.rotation;

            this.sprite.rotation = Math.toRadians(rotateIn.value)

            let animate = this.playAnimation([
                { parent: this.sprite, attribute: "rotation", to: original_radians }
            ], rotateIn.duration, rotateIn.ease);
            setTimeout(animate, rotateIn.delay);
        }
    }

    rotateOut(){
        if(this.data.animatedProperties.rotateOut) {

            let rotateOut = this.data.animatedProperties.rotateOut;

            let animate = this.playAnimation([
                { parent: this.sprite, attribute: "rotation", to: Math.toRadians(rotateOut.value) }
            ], rotateOut.duration, rotateOut.ease);
            setTimeout(animate, this._animationDuration - rotateOut.duration);
        }
    }

    moveTowards(){

        if (!this.data.distance) return;

        if(!this.data.speed){
            this.data.speed = this.data.distance / this._videoDuration;
        }else{
            this._videoDuration = this.data.distance / this.data.speed;
            this._animationDuration = this._videoDuration * 1000;
            this.video.loop = true;
        }

        // Compute final position
        const delta = this._videoDuration * this.data.speed;
        const deltaX = delta * Math.cos(this.data.rotation)
        const deltaY = delta * Math.sin(this.data.rotation)

        // Move the sprite
        let move_attributes = [{
            parent: this.sprite, attribute: 'x', to: this.data.position.x + deltaX
        }, {
            parent: this.sprite, attribute: 'y', to: this.data.position.y + deltaY
        }];

        this.playAnimation(
            move_attributes,
            this._animationDuration,
            this.data.ease
        )();

        setTimeout(() => {
            this.endEffect();
        }, this._animationDuration)

    }

    destroyEffect(){
        try {
            this.video.pause();
            this.video.removeAttribute('src'); // empty source
            this.video.load();
            this.layer.removeChild(this.sprite);
            this.sprite.destroy();
        }catch(err){}
    }

    endEffect(){
        if(!this.ended) {
            this.ended = true;
            this.destroyEffect();
            this.resolve();
        }
    }

    playAnimations(){
        this.moveTowards();
        this.fadeIn();
        this.fadeOut();
        this.scaleIn();
        this.scaleOut();
        this.rotateIn();
        this.rotateOut();
    }

    async play(){

        return new Promise((resolve, reject) => {

            this.resolve = resolve;

            this.video = document.createElement("video");
            this.video.preload = "auto";
            this.video.crossOrigin = "anonymous";
            this.video.src = this.data.file;
            this.video.playbackRate = this.data.playbackRate;

            let canplay = true;
            this.video.oncanplay = () => {
                if(!canplay){
                    return;
                }
                canplay = false;
                this.spawnSprite();
                this.playAnimations();
            };

            this.video.onerror = () => {
                try {
                    this.layer.removeChild(this.sprite);
                }catch(err){}
                console.error(`Could not play ${this.data.file}!`)
                reject();
            }

            this.video.onended = () => {
                this.endEffect();
            }
        })

    }

}