import SequencerAnimationEngine from "../sequencer-animation-engine.js";
import SequencerFileCache from "../sequencer-file-cache.js";
import * as lib from "../lib/lib.js";

export default class CanvasEffect {

    static make(inData){
        return inData.persist
            ? new PersistentCanvasEffect(inData)
            : new CanvasEffect(inData);
    }

    constructor(inData) {

        this.ended = false;
        this.texture = false;
		this.source = false;
		this.loader = SequencerFileCache;
        this.resolve = false;

		this.actualCreationTime = (+new Date())
        // Set default values
        this.data = foundry.utils.mergeObject({
            id: randomID(),
            timestamp: (+new Date()),
            position: { x: 0, y: 0 },
            rotation: 0,
            scale: { x: 1.0, y: 1.0 },
            anchor: { x: 0.5, y: 0.5 },
            playbackRate: 1.0
        }, inData);

    }

    get layer(){
        return this.data.layer ?? 2;
    }

    get contextDocument(){
        return this.context?.document ?? this.context;
    }

    getContext(){
        if(this.data.attachTo) return lib.getObjectFromScene(this.data.attachTo);
        return [
            canvas.background,
            canvas.sequencerEffectsBelowTokens,
            canvas.sequencerEffectsAboveTokens
        ][this.layer];
    }

    _getTokenContainer(){

        this.context = this.getContext();

        let containers = this.context.children.filter(child => child?.parentName === "sequencer");

        if(!containers.length) {
            let aboveContainer = new PIXI.Container();
            aboveContainer.sortableChildren = true;
            aboveContainer.parentName = "sequencer";
            aboveContainer.below = false;
            aboveContainer.zIndex = 1000;
            this.context.addChild(aboveContainer);
            containers.push(aboveContainer);

            let belowContainer = new PIXI.Container();
            belowContainer.sortableChildren = true;
            belowContainer.parentName = "sequencer";
            belowContainer.below = true;
            belowContainer.zIndex = -1000;
            this.context.addChild(belowContainer);
            containers.push(belowContainer);

            this.context.sortChildren();
        }

        return containers.find(child => child?.below === (this.layer ?? 2) < 2);
    }

    _getCanvasContainer(){

        this.context = game.scenes.get(this.data.sceneId);

        let layer = this.getContext();

        let container = layer.children.find(child => child?.parentName === "sequencer");

        if(!container) {
            if(layer === canvas.background){
                layer.sortableChildren = true;
                layer.children.filter(child => child.sortableChildren).map(child => child.zIndex = 1);
            }
            container = new PIXI.Container();
            container.sortableChildren = true;
            container.parentName = "sequencer";
            container.zIndex = 0.5;
            layer.addChild(container);
            layer.sortChildren();
        }

        return container;

    }

    _getContainer(){
        return this.data.attachTo ? this._getTokenContainer() : this._getCanvasContainer();
    }

    get position(){
        return {
            x: this.data.attachTo ? this.data.position.x - this.context.x : this.data.position.x,
            y: this.data.attachTo ? this.data.position.y - this.context.y : this.data.position.y
        }
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

    calculateDuration() {

		this.data.animationDuration = this.data.duration || (this.source?.duration ?? 1) * 1000;

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

				this.data.animationDuration = this.data.animationDuration || 1000;

			}

		}

		if(this.data.time?.start && this.source?.currentTime !== undefined) {
			let currentTime = !this.data.time.start.isPerc
				? this.data.time.start.value ?? 0
				: (this.data.animationDuration * this.data.time.start.value);
			this.source.currentTime = currentTime / 1000;
		}
        this.data.startTime = this.source.currentTime;

		if(this.data.time?.end){
			this.data.animationDuration = !this.data.time.end.isPerc
				? this.data.time.isRange ? this.data.time.end.value - this.data.time.start.value : this.data.animationDuration - this.data.time.end.value
				: this.data.animationDuration * this.data.time.end.value;
		}
        this.data.endTime = this.data.animationDuration;

		this.data.animationDuration /= (this.data.playbackRate ?? 1.0);

		if(this.source) this.source.loop = (this.data.animationDuration / 1000) > this.source.duration;

	}

    async spawnSprite() {

		this.sprite = new PIXI.Sprite(this.texture);

		if(this.source && this.data.time?.start && this.source?.currentTime !== undefined) {
			await lib.wait(15)
		}

		this.texture.update();

		this.sprite.alpha = this.data.opacity;
        this.container = this._getContainer();
		this.container.addChild(this.sprite);
		this.sprite.zIndex = typeof this.data.zIndex !== "number" ? 100000 - this.data.index : 100000 + this.data.zIndex;
		this.container.sortChildren();

        this.sprite.anchor.set(this.data.anchor.x, this.data.anchor.y);
        let position = this.position;
		this.sprite.position.set(position.x, position.y);
		this.sprite.rotation = Math.normalizeRadians(this.data.rotation - Math.toRadians(this.data.angle));

        if(this.data.size){
        	this.sprite.width = this.data.size.width * this.data.scale.x;
        	this.sprite.height = this.data.size.height * this.data.scale.y;
		} else {
			this.data.scale.x *= this.data.gridSizeDifference;
			this.data.scale.y *= this.data.gridSizeDifference;
			this.sprite.scale.set(this.data.scale.x, this.data.scale.y);
		}

		if(this.source?.currentTime !== undefined){
			this.source.play();
			this.source.playbackRate = this.data.playbackRate;
		}

    }

    fadeIn(){
        if(this.data.animatedProperties.fadeIn) {
            let fadeIn = this.data.animatedProperties.fadeIn;

            const duration = Math.min(fadeIn.duration, this.data.animationDuration);
            const delay = Math.min(fadeIn.delay, this.data.animationDuration);

            if(this.actualCreationTime > (this.data.timestamp + duration + delay)) return;

            this.sprite.alpha = 0.0;

            SequencerAnimationEngine.animate({
                name: "alpha",
                parent: this.sprite,
                to: this.data.opacity,
                duration: duration,
                ease: fadeIn.ease,
                delay: delay
            })
        }
    }

    fadeOut(immediate = false){
        if(this.data.animatedProperties.fadeOut) {
            let fadeOut = this.data.animatedProperties.fadeOut;

            const duration = Math.min(fadeOut.duration, this.data.animationDuration);
            const delay = !immediate
                ? Math.max(this.data.animationDuration - fadeOut.duration + fadeOut.delay, 0)
                : Math.max(immediate - fadeOut.duration + fadeOut.delay, 0);

            SequencerAnimationEngine.animate({
                name: "alpha",
                parent: this.sprite,
                to: 0.0,
                duration: duration,
                ease: fadeOut.ease,
                delay: delay
            })

            return duration + delay;
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
            let fromScale = this._determineScale(scaleIn)

            const duration = Math.min(scaleIn.duration, this.data.animationDuration);
            const delay = Math.min(scaleIn.delay, this.data.animationDuration);

            if(this.actualCreationTime > (this.data.timestamp + duration + delay)) return;

			let toScale = {
            	x: this.sprite.scale.x,
            	y: this.sprite.scale.y
			}

			this.sprite.scale.set(fromScale.x, fromScale.y);

            SequencerAnimationEngine.animate([{
                name: "scale.x",
                parent: this.sprite,
                from: fromScale.x,
                to: toScale.x,
                duration: duration,
                ease: scaleIn.ease,
                delay: delay
            }, {
                name: "scale.y",
                parent: this.sprite,
                from: fromScale.y,
                to: toScale.y,
                duration: duration,
                ease: scaleIn.ease,
                delay: delay
            }])

        }

    }

    scaleOut(immediate = false){
        if(this.data.animatedProperties.scaleOut) {
            let scaleOut = this.data.animatedProperties.scaleOut;
            let scale = this._determineScale(scaleOut)

            const duration = Math.min(scaleOut.duration, this.data.animationDuration);
            const delay = !immediate
                ? Math.max(this.data.animationDuration - scaleOut.duration + scaleOut.delay, 0)
                : Math.max(immediate - scaleOut.duration + scaleOut.delay, 0);

            SequencerAnimationEngine.animate([{
                name: "scale.x",
                parent: this.sprite,
                to: scale.x,
                duration: duration,
                ease: scaleOut.ease,
                delay: delay
            }, {
                name: "scale.y",
                parent: this.sprite,
                to: scale.y,
                duration: duration,
                ease: scaleOut.ease,
                delay: delay
            }])

            return duration + delay;
        }
    }

    rotateIn(){
        if(this.data.animatedProperties.rotateIn) {
            let rotateIn = this.data.animatedProperties.rotateIn;
            let original_radians = this.sprite.rotation;
            this.sprite.rotation = Math.toRadians(rotateIn.value)

            const duration = Math.min(rotateIn.duration, this.data.animationDuration);
            const delay = Math.min(rotateIn.delay, this.data.animationDuration);

            SequencerAnimationEngine.animate({
                name: "rotation",
                parent: this.sprite,
                to: original_radians,
                duration: duration,
                ease: rotateIn.ease,
                delay: delay
            })
        }
    }

    rotateOut(immediate = false){
        if(this.data.animatedProperties.rotateOut) {
            let rotateOut = this.data.animatedProperties.rotateOut;

            const duration = Math.min(rotateOut.duration, this.data.animationDuration);
            const delay = !immediate
                ? Math.max(this.data.animationDuration - rotateOut.duration + rotateOut.delay, 0)
                : Math.max(immediate - rotateOut.duration + rotateOut.delay, 0);

            SequencerAnimationEngine.animate({
                name: "rotation",
                parent: this.sprite,
                to: Math.toRadians(rotateOut.value),
                duration: duration,
                ease: rotateOut.ease,
                delay: delay
            })

            return duration + delay;
        }
    }

    fadeInAudio(){
        if(this.data.animatedProperties.fadeInAudio && this.source?.volume !== undefined) {
            let fadeInAudio = this.data.animatedProperties.fadeInAudio;
            this.source.volume = 0.0;

            const duration = Math.min(fadeInAudio.duration, this.data.animationDuration);
            const delay = Math.min(fadeInAudio.delay, this.data.animationDuration);

            if(this.actualCreationTime > (this.data.timestamp + duration + delay)) return;

            SequencerAnimationEngine.animate({
                name: "rotation",
                parent: this.sprite,
                to: this.data.audioVolume,
                duration: duration,
                ease: fadeInAudio.ease,
                delay: delay
            })
        }
    }

    fadeOutAudio(immediate = false){
        if(this.data.animatedProperties.fadeOutAudio && this.source?.volume !== undefined) {
            const fadeOutAudio = this.data.animatedProperties.fadeOutAudio;

            const duration = Math.min(fadeOutAudio.duration, this.data.animationDuration);
            const delay = !immediate
                ? Math.max(this.data.animationDuration - fadeOutAudio.duration + fadeOutAudio.delay, 0)
                : Math.max(immediate - fadeOutAudio.duration + fadeOutAudio.delay, 0);

            SequencerAnimationEngine.animate({
                name: "rotation",
                parent: this.sprite,
                to: 0.0,
                duration: Math.min(fadeOutAudio.duration, this.data.animationDuration),
                ease: fadeOutAudio.ease,
                delay: delay
            })

            return duration + delay;

        }
    }

    moveTowards(){
        if (!this.data.animatedProperties.moves) return;

        let moves = this.data.animatedProperties.moves;

        let movementDuration = this.data.animationDuration;
		if(this.data.speed){
			movementDuration = (this.data.distance / this.data.speed) * 1000;
		}

        const duration = movementDuration - moves.delay;
        const delay = Math.max(moves.delay, 0);

        if(this.actualCreationTime > (this.data.timestamp + duration + delay)) return;

        SequencerAnimationEngine.animate([{
            name: "position.x",
            parent: this.sprite,
            to: moves.target.x,
            duration: movementDuration - moves.delay,
            ease: moves.ease,
            delay: Math.max(moves.delay, 0)
        }, {
            name: "position.y",
            parent: this.sprite,
            to: moves.target.y,
            duration: movementDuration - moves.delay,
            ease: moves.ease,
            delay: Math.max(moves.delay, 0)
        }]);
    }

    setEndTimeout(){
        setTimeout(() => {
            this.resolve();
            this.endEffect();
        }, this.data.animationDuration)
    }

	endEffect(){
		if(!this.ended) {
			this.ended = true;
			try {
				this.source.removeAttribute('src');
				this.source.pause();
				this.source.load();
			} catch (err) {}
			try {
				this.container.removeChild(this.sprite);
				this.sprite.destroy();
			} catch (err) {}
		}
    }

    debug(){
        if(game.settings.get("sequencer", "debug")) console.log(`DEBUG | Sequencer | Playing effect:`, this.data);
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

    async play(playEffect = true) {

        this.texture = await this.loadFile();

        let promise = new Promise(async (resolve, reject) => {
            this.resolve = resolve;
            if(!this.texture){
            	reject();
			}else {
				this.calculateDuration();
				if(playEffect) {
					await this.spawnSprite();
					this.playAnimations();
				}
			}
        });

        return {
            duration: this.data.animationDuration,
            promise: promise
        }
    };

}

class PersistentCanvasEffect extends CanvasEffect{

    async setUpPersistence(){
        if(!game.user.isGM) return;
        let flags = (await this.contextDocument.getFlag('sequencer', 'effects')) ?? []
        let effects = new Map(flags);
        effects.set(this.data.id, this.data);
        this.contextDocument.setFlag('sequencer', 'effects', Array.from(effects));
    }

    async tearDownPersistence(){
        if(!game.user.isGM) return;
        let flags = (await this.contextDocument.getFlag('sequencer', 'effects')) ?? [];
        let effects = new Map(flags);
        effects.delete(this.data.id);
        await this.contextDocument.setFlag('sequencer', 'effects', Array.from(effects));
    }

    playAnimations(){
        this.moveTowards();
        this.fadeIn();
        this.fadeInAudio();
        this.scaleIn();
        this.rotateIn();
        this.debug();
    }

    calculateDuration() {
        super.calculateDuration();
        if (!this.source) return;
        this.source.loop = false;
        this._resetVideo();
    }

    async _resetVideo(){
        console.log("here");
        if(this.ended) return;
        this.source.currentTime = this.data.startTime;
        await this.source.pause();
        setTimeout(() => {
            this._resetVideo();
        }, this.data.animationDuration);
        await this.source.play();
    }

    async endEffect(){
        await this.tearDownPersistence();
        const durations = [
            this.fadeOut(this.data.extraEndDuration),
            this.fadeOutAudio(this.data.extraEndDuration),
            this.scaleOut(this.data.extraEndDuration),
            this.rotateOut(this.data.extraEndDuration)
        ].filter(Boolean);
        const waitDuration = Math.max(...durations);
        setTimeout(() => { super.endEffect() }, waitDuration);
        this.resolve(waitDuration);
    }

    async play(){
        let result = await super.play();
        await this.setUpPersistence();
        return result;
    }

}