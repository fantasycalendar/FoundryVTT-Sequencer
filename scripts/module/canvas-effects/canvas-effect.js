import { EffectsCanvasAnimation } from "./canvas-animation.js";
import { easeFunctions } from "./ease.js";

export default class CanvasEffect {

    constructor(container, inData) {

        this.container = container;
        this.ended = false;
        this.source = false;

        let version = isNewerVersion(game.data.version, "0.7.10");
        this.mergeFunc = version ? foundry.utils.mergeObject : mergeObject;

        // Set default values
        this.data = this.mergeFunc({
            anchor: { x: 0.5, y: 0.5 },
            rotation: 0,
            scale: { x: 1.0, y: 1.0 },
            position: { x: 0, y: 0 },
            playbackRate: 1.0,
            fadeIn: 0,
            fadeOut: 0
        }, inData);

    }

    playAnimations(){
        this.moveTowards();
        this.fadeIn();
        this.fadeOut();
        this.fadeInAudio();
        this.fadeOutAudio();
        this.scaleIn();
        this.scaleOut();
        this.rotateIn();
        this.rotateOut();
        this.endEarly();
        this.debug();
    }

    spawnSprite() {
        const texture = PIXI.Texture.from(this.source);
        this.sprite = new PIXI.Sprite(texture);
        this.sprite.alpha = this.data.opacity;
        this.container.addChild(this.sprite);
        this.sprite.zIndex = typeof this.data.zIndex !== "number" ? 100000 - this.data.index : 100000 + this.data.zIndex;
        this.container.sortChildren();

        if(!this.source?.duration && !this.data.duration){
            let animProp = this.data.animatedProperties;
            let fadeDuration = (animProp.fadeIn?.duration ?? 0) + (animProp.fadeOut?.duration ?? 0);
            let scaleDuration = (animProp.scaleIn?.duration ?? 0) + (animProp.scaleOut?.duration ?? 0);
            let rotateDuration = (animProp.rotateIn?.duration ?? 0) + (animProp.rotateOut?.duration ?? 0);
            this.data.duration = Math.max(fadeDuration, scaleDuration, rotateDuration) || 1000;
        }

        this.data.sourceDuration = this.data.duration ? this.data.duration / 1000 : this.source?.duration;
        this.data.animationDuration = this.data.sourceDuration * 1000;

        this.sprite.anchor.set(this.data.anchor.x, this.data.anchor.y);
        this.sprite.rotation = Math.normalizeRadians(this.data.rotation - Math.toRadians(this.data.angle));
        this.sprite.scale.set(this.data.scale.x, this.data.scale.y);
        this.sprite.position.set(this.data.position.x, this.data.position.y);
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
            setTimeout(animate, Math.min(fadeIn.delay, this.data.animationDuration));
        }
    }

    fadeOut(){
        if(this.data.animatedProperties.fadeOut) {
            let fadeOut = this.data.animatedProperties.fadeOut;
            let fadeOutDuration = Math.min(fadeOut.duration, this.data.animationDuration);
            let animate = this.playAnimation([
                { parent: this.sprite, attribute: "alpha", to: 0.0 }
            ], fadeOutDuration, fadeOut.ease)
            setTimeout(animate, Math.max(this.data.animationDuration - fadeOut.duration + fadeOut.delay, 0));
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
            let scaleInDuration = Math.min(scaleIn.duration, this.data.animationDuration);
            let animate = this.playAnimation([
                { parent: this.sprite, attribute: "scale", property: "x", to: this.data.scale.x },
                { parent: this.sprite, attribute: "scale", property: "y", to: this.data.scale.y }
            ], scaleInDuration, scaleIn.ease);
            setTimeout(animate, Math.min(scaleIn.delay, this.data.animationDuration));
        }
    }

    scaleOut(){
        if(this.data.animatedProperties.scaleOut) {
            let scaleOut = this.data.animatedProperties.scaleOut;
            let scale = this._determineScale(scaleOut)
            let scaleOutDuration = Math.min(scaleOut.duration, this.data.animationDuration);
            let animate = this.playAnimation([
                { parent: this.sprite, attribute: "scale", property: "x", to: scale.x },
                { parent: this.sprite, attribute: "scale", property: "y", to: scale.y }
            ], scaleOutDuration, scaleOut.ease);
            setTimeout(animate,  Math.max(this.data.animationDuration - scaleOut.duration + scaleOut.delay, 0));
        }
    }

    rotateIn(){
        if(this.data.animatedProperties.rotateIn) {
            let rotateIn = this.data.animatedProperties.rotateIn;
            let original_radians = this.sprite.rotation;
            this.sprite.rotation = Math.toRadians(rotateIn.value)
            let rotateInDuration = Math.min(rotateIn.duration, this.data.animationDuration);
            let animate = this.playAnimation([
                { parent: this.sprite, attribute: "rotation", to: original_radians }
            ], rotateInDuration, rotateIn.ease);
            setTimeout(animate, Math.min(rotateIn.delay, this.data.animationDuration));
        }
    }

    rotateOut(){
        if(this.data.animatedProperties.rotateOut) {
            let rotateOut = this.data.animatedProperties.rotateOut;
            let rotateOutDuration = Math.min(rotateOut.duration, this.data.animationDuration);
            let animate = this.playAnimation([
                { parent: this.sprite, attribute: "rotation", to: Math.toRadians(rotateOut.value) }
            ], rotateOutDuration, rotateOut.ease);
            setTimeout(animate,  Math.max(this.data.animationDuration - rotateOut.duration + rotateOut.delay, 0));
        }
    }

    fadeInAudio(){
        if(this.data.animatedProperties.fadeInAudio && this.source?.volume) {
            let fadeInAudio = this.data.animatedProperties.fadeInAudio;
            this.source.volume = 0.0;
            let animate = this.playAnimation([
                { parent: this.source, attribute: "volume", to: this.data.audioVolume }
            ], fadeInAudio.duration, fadeInAudio.ease);
            setTimeout(animate, Math.min(fadeInAudio.delay, this.data.animationDuration));
        }
    }

    fadeOutAudio(){
        if(this.data.animatedProperties.fadeOutAudio && this.source?.volume) {
            let fadeOutAudio = this.data.animatedProperties.fadeOutAudio;
            let fadeOutDurationAudio = Math.min(fadeOutAudio.duration, this.data.animationDuration);
            let animate = this.playAnimation([
                { parent: this.source, attribute: "volume", to: 0.0 }
            ], fadeOutDurationAudio, fadeOutAudio.ease)
            setTimeout(animate, Math.max(this.data.animationDuration - fadeOutAudio.duration + fadeOutAudio.delay, 0));
        }
    }

    moveTowards(){

        if (!this.data.animatedProperties.moves) return;

        let moves = this.data.animatedProperties.moves;

        this.data.sourceDuration += moves.delay/1000;

        if(!this.data.speed){
            this.data.speed = this.data.distance / this.data.sourceDuration;
        }else{
            let sourceDuration = this.data.distance / this.data.speed;
            if(sourceDuration > this.data.sourceDuration){
                this.data.sourceDuration = sourceDuration;
                this.data.animationDuration = this.data.sourceDuration * 1000;
            }
        }

        // Compute final position
        const delta = this.data.sourceDuration * this.data.speed;
        const deltaX = delta * Math.cos(this.data.rotation)
        const deltaY = delta * Math.sin(this.data.rotation)

        // Move the sprite
        let move_attributes = [{
            parent: this.sprite, attribute: 'x', to: this.data.position.x + deltaX
        }, {
            parent: this.sprite, attribute: 'y', to: this.data.position.y + deltaY
        }];

        setTimeout(() => {
            this.playAnimation(
                move_attributes,
                this.data.animationDuration - moves.delay,
                moves.ease
            )();
        }, moves.delay);

    }

    endEarly(){
        if(this.source?.loop) this.source.loop = (this.data.duration / 1000) > this.source.duration;
        setTimeout(() => {
            this.endEffect();
        }, this.data.animationDuration)
    }

    endEffect(){
        if(!this.ended) {
            this.ended = true;
            this.destroyEffect();
            this.resolve();
        }
    }

    destroyEffect(){
        try {
            this.source.removeAttribute('src');
            this.container.removeChild(this.sprite);
            this.sprite.destroy();
        }catch(err){}
        try {
            this.source.pause();
            this.source.load();
        }catch(err){}
    }

    debug(){
        if(this.data.debug) console.log(`DEBUG | Sequencer | Playing effect:`, this.data);
    }

    async loadVideo(){

        return new Promise((resolve, reject) => {

            let video = document.createElement("video");
            video.preload = "auto";
            video.crossOrigin = "anonymous";
            video.src = this.data.file;
            video.playbackRate = this.data.playbackRate;
            if(this.data.audioVolume === false && typeof this.data.audioVolume !== "number" && (this.data.animatedProperties.fadeInAudio || this.data.animatedProperties.fadeOutAudio)){
                this.data.audioVolume = 1.0;
            }
            video.volume = this.data.audioVolume ? this.data.audioVolume : 0.0;

            let canplay = true;
            video.oncanplay = () => {
                if(!canplay) return;
                canplay = false;
                resolve(video);
            };

            video.onerror = () => {
                try {
                    this.container.removeChild(this.sprite);
                } catch (err) {}
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

    async loadImage(){

        return new Promise((resolve, reject) => {

            let image = document.createElement('img');
            image.src = this.data.file;

            image.onload = () => {
                resolve(image);
            };

            image.onerror = () => {
                try {
                    this.container.removeChild(this.sprite);
                } catch (err) {}
                let error = `Sequencer | CanvasEffect | Play Effect - Could not load image: ${this.data.file}`;
                ui.notifications.error(error);
                console.error(error)
                reject();
            }

        })

    }

    async loadFile(){

        let fileExt = this.data.file.match(/(?:\.([^.]+))?$/)[1].toLowerCase();

        if(fileExt === "webm"){
            return this.loadVideo();
        }

        return this.loadImage();

    }

    async play() {

        this.source = await this.loadFile();

        let promise = new Promise((resolve, reject) => {
            if(!this.source) reject();
            this.resolve = resolve;
            this.spawnSprite();
            this.playAnimations();
        });

        return {
            duration: this.data.animationDuration,
            promise: promise
        }

    };

}