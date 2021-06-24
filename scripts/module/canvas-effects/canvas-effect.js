import Version from "../../version.js";
import { EffectsCanvasAnimation } from "./canvas-animation.js";
import { easeFunctions } from "./ease.js";

export default class CanvasEffect {

    constructor(container, inData) {

        this.container = container;
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
        this.sprite.alpha = this.data.opacity;
        this.container.addChild(this.sprite);
        this.sprite.zIndex = typeof this.data.zIndex !== "number" ? 100000 - this.data.index : 100000 + this.data.zIndex;
        this.container.sortChildren();

        this.sprite.anchor.set(this.data.anchor.x, this.data.anchor.y);
        this.sprite.rotation = Math.normalizeRadians(this.data.rotation - Math.toRadians(this.data.angle));
        this.sprite.scale.set(this.data.scale.x, this.data.scale.y);
        this.sprite.position.set(this.data.position.x, this.data.position.y);
        this._videoDuration = this.data.duration ? this.data.duration / 1000 : this.video.duration;
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
                { parent: this.sprite, attribute: "alpha", to: this.data.opacity }
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
            setTimeout(animate, Math.max(this._animationDuration - fadeOut.duration, 0));
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
            setTimeout(animate,  Math.max(this._animationDuration - scaleOut.duration, 0));
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
            setTimeout(animate,  Math.max(this._animationDuration - rotateOut.duration, 0));
        }
    }

    moveTowards(){

        if (!this.data.distance) return;

        if(!this.data.speed){
            this.data.speed = this.data.distance / this._videoDuration;
        }else{
            this._videoDuration = this.data.distance / this.data.speed;
            this._animationDuration = this._videoDuration * 1000;
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

    }

    destroyEffect(){
        try {
            this.video.pause();
            this.video.removeAttribute('src'); // empty source
            this.video.load();
            this.container.removeChild(this.sprite);
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
        this.endEarly();
    }

    endEarly(){
        this.video.loop = (this.data.duration / 1000) > this.video.duration;
        setTimeout(() => {
            this.endEffect();
        }, this._animationDuration)
    }

    async loadVideo(){

        return new Promise((resolve, reject) => {

            let video = document.createElement("video");
            video.preload = "auto";
            video.crossOrigin = "anonymous";
            video.src = this.data.file;
            video.playbackRate = this.data.playbackRate;

            let canplay = true;
            video.oncanplay = () => {
                if(!canplay) return;
                canplay = false;
                resolve(video);
            };

            video.onerror = () => {
                try {
                    this.container.removeChild(this.sprite);
                } catch (err) {
                }
                let error = `Sequencer | CanvasEffect | Play Effect - Could not play: ${this.data.file}`;
                ui.notifications.error(error);
                console.error(error)
                reject();
            }

            video.onended = () => {
                this.endEffect();
            }

        });

    }

    async play() {

        this.video = await this.loadVideo();

        let promise = new Promise((resolve, reject) => {
            if(!this.video) reject();
            this.resolve = resolve;
            this.spawnSprite();
            this.playAnimations();
        });

        return {
            duration: this._animationDuration,
            promise: promise
        }

    };

}