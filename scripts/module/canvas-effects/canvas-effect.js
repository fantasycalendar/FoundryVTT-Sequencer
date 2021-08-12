import {easeFunctions} from "./ease.js";
import SequencerAnimationEngine from "../sequencer-animation-engine.js";
import SequencerFileCache from "../sequencer-file-cache.js";
import * as lib from "../lib.js";

export default class CanvasEffect {

    constructor(container, inData) {

        this.container = container;
        this.ended = false;
        this.texture = false;
		this.source = false;
		this.loader = SequencerFileCache;

        // Set default values
        this.data = foundry.utils.mergeObject({
            position: { x: 0, y: 0 },
            rotation: 0,
            scale: { x: 1.0, y: 1.0 },
            anchor: { x: 0.5, y: 0.5 },
            playbackRate: 1.0
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
        this.setEndTimeout();
        this.debug();
    }

    async spawnSprite() {

        this.sprite = new PIXI.Sprite(this.texture);

		this.data.animationDuration = this.data.duration || (this.source?.duration ?? 1) * 1000;

		if(this.source) this.source.loop = (this.data.animationDuration / 1000) > this.source.duration;

		let moves = this.data.animatedProperties.moves;

		if(this.data.speed && moves){

			let durationFromSpeed = (this.data.distance / this.data.speed) * 1000;

			this.data.animationDuration = Math.max(durationFromSpeed, this.data.duration);

		}else{

			if(!this.data.duration && !this.source){

				let animProp = this.data.animatedProperties;
				let fadeDuration = (animProp.fadeIn?.duration ?? 0) + (animProp.fadeOut?.duration ?? 0);
				let scaleDuration = (animProp.scaleIn?.duration ?? 0) + (animProp.scaleOut?.duration ?? 0);
				let rotateDuration = (animProp.rotateIn?.duration ?? 0) + (animProp.rotateOut?.duration ?? 0);
				let moveDuration = 0;
				if(moves) {
					moveDuration = (this.data.speed ? (this.data.distance / this.data.speed) * 1000 : 1000) + moves.delay;
				}

				this.data.animationDuration = Math.max(fadeDuration, scaleDuration, rotateDuration, moveDuration);

			}

		}

		if(this.data.time?.start && this.source?.currentTime !== undefined) {
			let currentTime = !this.data.time.start.isPerc
				? this.data.time.start.value ?? 0
				: (this.data.animationDuration * this.data.time.start.value);
			this.source.currentTime = currentTime / 1000;
		}

		if(this.data.time?.end){
			this.data.animationDuration = !this.data.time.end.isPerc
				? this.data.time.isRange ? this.data.time.end.value - this.data.time.start.value : this.data.animationDuration - this.data.time.end.value
				: this.data.animationDuration * this.data.time.end.value;
		}

		if(this.source && this.data.time?.start > 0 && this.source?.currentTime !== undefined) {
			await lib.wait(15)
		}

		this.sprite = new PIXI.Sprite(this.texture);
		this.sprite.alpha = this.data.opacity;
		this.container.addChild(this.sprite);
		this.sprite.zIndex = typeof this.data.zIndex !== "number" ? 100000 - this.data.index : 100000 + this.data.zIndex;
		this.container.sortChildren();

        this.sprite.anchor.set(this.data.anchor.x, this.data.anchor.y);
        this.sprite.rotation = Math.normalizeRadians(this.data.rotation - Math.toRadians(this.data.angle));
        this.data.scale.x *= this.data.gridSizeDifference;
        this.data.scale.y *= this.data.gridSizeDifference;
        this.sprite.scale.set(this.data.scale.x, this.data.scale.y);
        this.sprite.position.set(this.data.position.x, this.data.position.y);

		if(this.source?.currentTime !== undefined) this.source?.play();

    }

    fadeIn(){
        if(this.data.animatedProperties.fadeIn) {
            let fadeIn = this.data.animatedProperties.fadeIn;
            this.sprite.alpha = 0.0;

            SequencerAnimationEngine.animate({
                name: "alpha",
                parent: this.sprite,
                to: this.data.opacity,
                duration: Math.min(fadeIn.duration, this.data.animationDuration),
                ease: easeFunctions[fadeIn.ease],
                delay: Math.min(fadeIn.delay, this.data.animationDuration)
            })
        }
    }

    fadeOut(){
        if(this.data.animatedProperties.fadeOut) {
            let fadeOut = this.data.animatedProperties.fadeOut;

            SequencerAnimationEngine.animate({
                name: "alpha",
                parent: this.sprite,
                to: 0.0,
                duration: Math.min(fadeOut.duration, this.data.animationDuration),
                ease: easeFunctions[fadeOut.ease],
                delay: Math.max(this.data.animationDuration - fadeOut.duration + fadeOut.delay, 0)
            })
        }
    }

    _determineScale(property){
        let scale = {
            x: property.value?.x * this.data.gridSizeDifference ?? 1.0,
            y: property.value?.y * this.data.gridSizeDifference ?? 1.0
        };
        if(typeof property.value === "number"){
            scale.x = property.value * this.data.gridSizeDifference
            scale.y = property.value * this.data.gridSizeDifference
        }
        return scale;
    }

    scaleIn(){
        if(this.data.animatedProperties.scaleIn) {
            let scaleIn = this.data.animatedProperties.scaleIn;
            let scale = this._determineScale(scaleIn)

            this.sprite.scale.set(scale.x, scale.y);

            SequencerAnimationEngine.animate([{
                name: "scale.x",
                parent: this.sprite,
                to: this.data.scale.x,
                duration: Math.min(scaleIn.duration, this.data.animationDuration),
                ease: easeFunctions[scaleIn.ease],
                delay: Math.min(scaleIn.delay, this.data.animationDuration)
            }, {
                name: "scale.y",
                parent: this.sprite,
                to: this.data.scale.y,
                duration: Math.min(scaleIn.duration, this.data.animationDuration),
                ease: easeFunctions[scaleIn.ease],
                delay: Math.min(scaleIn.delay, this.data.animationDuration)
            }])

        }

    }

    scaleOut(){
        if(this.data.animatedProperties.scaleOut) {
            let scaleOut = this.data.animatedProperties.scaleOut;
            let scale = this._determineScale(scaleOut)

            SequencerAnimationEngine.animate([{
                name: "scale.x",
                parent: this.sprite,
                to: scale.x,
                duration: Math.min(scaleOut.duration, this.data.animationDuration),
                ease: easeFunctions[scaleOut.ease],
                delay: Math.max(this.data.animationDuration - scaleOut.duration + scaleOut.delay, 0)
            }, {
                name: "scale.y",
                parent: this.sprite,
                to: scale.y,
                duration: Math.min(scaleOut.duration, this.data.animationDuration),
                ease: easeFunctions[scaleOut.ease],
                delay: Math.max(this.data.animationDuration - scaleOut.duration + scaleOut.delay, 0)
            }])
        }
    }

    rotateIn(){
        if(this.data.animatedProperties.rotateIn) {
            let rotateIn = this.data.animatedProperties.rotateIn;
            let original_radians = this.sprite.rotation;
            this.sprite.rotation = Math.toRadians(rotateIn.value)

            SequencerAnimationEngine.animate({
                name: "rotation",
                parent: this.sprite,
                to: original_radians,
                duration: Math.min(rotateIn.duration, this.data.animationDuration),
                ease: easeFunctions[rotateIn.ease],
                delay: Math.min(rotateIn.delay, this.data.animationDuration)
            })
        }
    }

    rotateOut(){
        if(this.data.animatedProperties.rotateOut) {
            let rotateOut = this.data.animatedProperties.rotateOut;

            SequencerAnimationEngine.animate({
                name: "rotation",
                parent: this.sprite,
                to: Math.toRadians(rotateOut.value),
                duration: Math.min(rotateOut.duration, this.data.animationDuration),
                ease: easeFunctions[rotateOut.ease],
                delay: Math.max(this.data.animationDuration - rotateOut.duration + rotateOut.delay, 0)
            })
        }
    }

    fadeInAudio(){
        if(this.data.animatedProperties.fadeInAudio && this.source?.volume !== undefined) {
            let fadeInAudio = this.data.animatedProperties.fadeInAudio;
            this.source.volume = 0.0;

            SequencerAnimationEngine.animate({
                name: "rotation",
                parent: this.sprite,
                to: this.data.audioVolume,
                duration: Math.min(fadeInAudio.duration, this.data.animationDuration),
                ease: easeFunctions[fadeInAudio.ease],
                delay: Math.min(fadeInAudio.delay, this.data.animationDuration)
            })
        }
    }

    fadeOutAudio(){
        if(this.data.animatedProperties.fadeOutAudio && this.source?.volume !== undefined) {
            let fadeOutAudio = this.data.animatedProperties.fadeOutAudio;

            SequencerAnimationEngine.animate({
                name: "rotation",
                parent: this.sprite,
                to: 0.0,
                duration: Math.min(fadeOutAudio.duration, this.data.animationDuration),
                ease: easeFunctions[fadeOutAudio.ease],
                delay: Math.max(this.data.animationDuration - fadeOutAudio.duration + fadeOutAudio.delay, 0)
            })

        }
    }

    moveTowards(){
        if (!this.data.animatedProperties.moves) return;

        let moves = this.data.animatedProperties.moves;

        let movementDuration = this.data.animationDuration;
		if(this.data.speed){
			movementDuration = (this.data.distance / this.data.speed) * 1000;
		}

        SequencerAnimationEngine.animate([{
            name: "position.x",
            parent: this.sprite,
            to: moves.target.x,
            duration: movementDuration - moves.delay,
            ease: easeFunctions[moves.ease],
            delay: Math.max(moves.delay, 0)
        }, {
            name: "position.y",
            parent: this.sprite,
            to: moves.target.y,
            duration: movementDuration - moves.delay,
            ease: easeFunctions[moves.ease],
            delay: Math.max(moves.delay, 0)
        }]);
    }

    setEndTimeout(){
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
			this.source.pause();
			this.source.load();
		}catch(err){}
        try {
            this.container.removeChild(this.sprite);
            this.sprite.destroy();
        }catch(err){}
    }

    debug(){
        if(this.data.debug) console.log(`DEBUG | Sequencer | Playing effect:`, this.data);
    }

    async loadVideo(){

        return new Promise(async (resolve, reject) => {

        	let blob = await this.loader.loadVideo(this.data.file);

        	if(!blob){
				let error = `Sequencer | CanvasEffect | Play Effect - Could not play: ${this.data.file}`;
				ui.notifications.error(error);
				console.error(error)
        		reject();
        		return;
			}

            let video = document.createElement("video");
            video.preload = "auto";
            video.crossOrigin = "anonymous";
            video.src = URL.createObjectURL(blob);
            video.playbackRate = this.data.playbackRate;
            video.autoplay = false;
            if(this.data.audioVolume === false && typeof this.data.audioVolume !== "number" && (this.data.animatedProperties.fadeInAudio || this.data.animatedProperties.fadeOutAudio)){
                this.data.audioVolume = 1.0;
            }
            video.volume = this.data.audioVolume ? this.data.audioVolume : 0.0;
            video.volume *= game.settings.get("core", "globalInterfaceVolume");

			let texture = await PIXI.Texture.from(video);

            let canplay = true;
            video.oncanplay = async () => {
                if(!canplay) return;
                canplay = false;
				this.source = video;
				this.source.pause();
                resolve(texture);
            };

            video.onended = () => {
                this.endEffect();
            }

        });
    }

    async loadImage(){
        return new Promise(async (resolve, reject) => {

			let texture = await this.loader.loadImage(this.data.file);

			if(!texture){
				let error = `Sequencer | CanvasEffect | Play Effect - Could not load: ${this.data.file}`;
				ui.notifications.error(error);
				console.error(error)
				reject();
				return;
			}

			resolve(texture);
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
        this.texture = await this.loadFile();

        let promise = new Promise(async (resolve, reject) => {
            if(!this.texture){
            	reject();
			}else {
				this.resolve = resolve;
				await this.spawnSprite();
				this.playAnimations();
			}
        });

        return {
            duration: this.data.animationDuration,
            promise: promise
        }
    };

}