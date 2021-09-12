import SequencerAnimationEngine from "../sequencer-animation-engine.js";
import SequencerFileCache from "../sequencer-file-cache.js";
import * as lib from "../lib/lib.js";
import filters from "../lib/filters.js";

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
        this._context = false;
        this.loopOffset = 0;
        this.filters = {};

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

    get context(){
        if(!this._context){
            this._context = this.data.attachTo
                ? lib.getObjectFromScene(this.data.attachTo, this.data.sceneId)
                : game.scenes.get(this.data.sceneId);
        }
        return this._context;
    }

    _getTokenContainer(){

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

        let layer = [
            canvas.background,
            canvas.sequencerEffectsBelowTokens,
            canvas.sequencerEffectsAboveTokens
        ][this.layer];

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

    async initializeEffect(){
        await this.spawnSprite();
        this.playCustomAnimations();
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

		this.animationDuration = this.data.duration || (this.source?.duration ?? 1) * 1000;

		let moves = this.data.animatedProperties.moves;

		if(this.data.speed && moves){

			let durationFromSpeed = (this.data.distance / this.data.speed) * 1000;

			this.animationDuration = Math.max(durationFromSpeed, this.data.duration);

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

				this.animationDuration = Math.max(fadeDuration, scaleDuration, rotateDuration, moveDuration);

				this.animationDuration = this.animationDuration || 1000;

			}

		}

        this.startTime = 0;
		if(this.data.time?.start && this.source?.currentTime !== undefined) {
			let currentTime = !this.data.time.start.isPerc
				? this.data.time.start.value ?? 0
				: (this.animationDuration * this.data.time.start.value);
			this.source.currentTime = currentTime / 1000;
            this.startTime = this.source.currentTime;
		}

		if(this.data.time?.end){
			this.animationDuration = !this.data.time.end.isPerc
				? this.data.time.isRange ? this.data.time.end.value - this.data.time.start.value : this.animationDuration - this.data.time.end.value
				: this.animationDuration * this.data.time.end.value;
		}
        this.endTime = this.animationDuration / 1000;

		this.animationDuration /= (this.data.playbackRate ?? 1.0);

		if(this.source){
		    this.source.loop = (this.animationDuration / 1000) > this.source.duration;
            if(this.data.noLoop) this.source.loop = false;
        }

	}

    async spawnSprite() {

        this.sprite = new PIXI.Sprite(this.texture);
        this.spriteContainer = new PIXI.Container();
        this.spriteContainer.addChild(this.sprite);
        this.sprite.anchor.set(0.5, 0.5);
        this.sprite.zIndex = typeof this.data.zIndex !== "number" ? 100000 - this.data.index : 100000 + this.data.zIndex;
        this.spriteContainer.sortChildren();
        this.container = this.data.attachTo ? this._getTokenContainer() : this._getCanvasContainer();
        this.container.addChild(this.spriteContainer);

        this.applyFilters();

        this.sprite.alpha = this.data.opacity;

        if(this.data.size){
            this.sprite.width = this.data.size.width * this.data.scale.x * this.data.gridSizeDifference;
            this.sprite.height = this.data.size.height * this.data.scale.y * this.data.gridSizeDifference;
        } else {
            this.sprite.scale.set(
                this.data.scale.x * this.data.gridSizeDifference,
                this.data.scale.y * this.data.gridSizeDifference
            );
        }

        this.spriteContainer.position.set(this.data.position.x, this.data.position.y);
        this.spriteContainer.rotation = Math.normalizeRadians(this.data.rotation - Math.toRadians(this.data.angle));

        this.spriteContainer.pivot.set(
            lib.lerp(this.sprite.width*-0.5,this.sprite.width*0.5, this.data.anchor.x),
            lib.lerp(this.sprite.height*-0.5,this.sprite.height*0.5, this.data.anchor.y)
        );

        if(this.source && (this.startTime || this.loopOffset > 0) && this.source?.currentTime !== undefined) {
            await lib.wait(15)
            this.texture.update();
        }

        if(this.source?.currentTime !== undefined){
            this.source.playbackRate = this.data.playbackRate;
            this.tryPlay();
        }

    }

    tryPlay(){
        return new Promise(resolve => {
            if (this.source) {
                try {
                    this.source.play();
                    resolve();
                } catch (err) {
                    setTimeout(() => {
                        resolve(this.tryPlay());
                    }, 10)
                }
            }
        });
    }

    applyFilters(){

        if(!this.data.filters) return;

        this.sprite.filters = [];

        for(let [filterName, filterData] of Object.entries(this.data.filters)){
             const filter = new filters[filterName](filterData.data);
             this.sprite.filters.push(filter);
             const filterKeyName = filterData.name || filterName;
             this.filters[filterKeyName] = filter;
        }

    }

    counterAnimateRotation(animation){

        if(!Array.isArray(animation)) animation = [animation]

        if(this.data.zeroSpriteRotation && animation.target === this.spriteContainer){
            delete animation.target;
            let counterAnimation = foundry.utils.duplicate(animation);
            animation.target = this.spriteContainer;
            counterAnimation.target = this.sprite;
            if(counterAnimation.values){
                counterAnimation.values = counterAnimation.values.map(value => value*-1);
            }else{
                counterAnimation.from *= -1;
                counterAnimation.to *= -1;
            }
            animation.push(counterAnimation);
        }

        return animation;

    }

    playCustomAnimations(){

        if(!this.data.animatedProperties.animations) return 0;

        let animationsToSend = [];

        const animations = foundry.utils.duplicate(this.data.animatedProperties.animations);

        const oneShotAnimations = animations.filter(animation => !animation.looping);

        for(let animation of oneShotAnimations){

            animation.target = getProperty(this, animation.target);

            if(!animation.target) continue;

            if(animation.propertyName.indexOf("rotation") > -1){
                let offset = (animation.offset / 180) * Math.PI;
                animation.from = ((animation.from / 180) * Math.PI) + offset;
                animation.to = ((animation.to / 180) * Math.PI) + offset;
            }

            animationsToSend = animationsToSend.concat(this.counterAnimateRotation(animation))

        }

        const loopingAnimations = animations.filter(animation => animation.looping);

        for(let animation of loopingAnimations){

            animation.target = getProperty(this, animation.target);

            if(!animation.target) continue;

            if(animation.propertyName.indexOf("rotation") > -1){
                let offset = (animation.offset / 180) * Math.PI;
                animation.values = animation.values.map(value => {
                    return ((value / 180) * Math.PI) + offset;
                });
            }

            animationsToSend = animationsToSend.concat(this.counterAnimateRotation(animation))

        }

        SequencerAnimationEngine.animate(
            animationsToSend,
            this.actualCreationTime - this.data.timestamp
        );

    }

    fadeIn(){

        if(!this.data.animatedProperties.fadeIn || !this.sprite) return 0;

        let fadeIn = this.data.animatedProperties.fadeIn;

        if(this.actualCreationTime > (this.data.timestamp + fadeIn.duration + fadeIn.delay)) return;

        this.sprite.alpha = 0.0;

        SequencerAnimationEngine.animate({
            target: this.sprite,
            propertyName: "alpha",
            to: this.data.opacity,
            duration: fadeIn.duration,
            ease: fadeIn.ease,
            delay: fadeIn.delay
        })

        return fadeIn.duration + fadeIn.delay;

    }

    fadeOut(immediate = false){

        if(!this.data.animatedProperties.fadeOut || !this.sprite) return 0;

        let fadeOut = this.data.animatedProperties.fadeOut;

        fadeOut.delay = typeof immediate !== "number"
            ? Math.max(this.animationDuration - fadeOut.duration + fadeOut.delay, 0)
            : Math.max(immediate - fadeOut.duration + fadeOut.delay, 0);

        SequencerAnimationEngine.animate({
            target: this.sprite,
            propertyName: "alpha",
            to: 0.0,
            duration: fadeOut.duration,
            ease: fadeOut.ease,
            delay: fadeOut.delay
        })

        return fadeOut.duration + fadeOut.delay;

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

        if(!this.data.animatedProperties.scaleIn || !this.sprite) return 0;

        let scaleIn = this.data.animatedProperties.scaleIn;
        let fromScale = this._determineScale(scaleIn)

        if(this.actualCreationTime > (this.data.timestamp + scaleIn.duration + scaleIn.delay)) return;

        let toScale = {
            x: this.sprite.scale.x,
            y: this.sprite.scale.y
        }

        this.sprite.scale.set(fromScale.x, fromScale.y);

        SequencerAnimationEngine.animate([{
            target: this.sprite,
            propertyName: "scale.x",
            from: fromScale.x,
            to: toScale.x,
            duration: scaleIn.duration,
            ease: scaleIn.ease,
            delay: scaleIn.delay
        }, {
            target: this.sprite,
            propertyName: "scale.y",
            from: fromScale.y,
            to: toScale.y,
            duration: scaleIn.duration,
            ease: scaleIn.ease,
            delay: scaleIn.delay
        }])

        return scaleIn.duration + scaleIn.delay;

    }

    scaleOut(immediate = false){

        if(!this.data.animatedProperties.scaleOut || !this.sprite) return 0;

        let scaleOut = this.data.animatedProperties.scaleOut;
        let scale = this._determineScale(scaleOut)

        scaleOut.delay = typeof immediate !== "number"
            ? Math.max(this.animationDuration - scaleOut.duration + scaleOut.delay, 0)
            : Math.max(immediate - scaleOut.duration + scaleOut.delay, 0);

        SequencerAnimationEngine.animate([{
            target: this.sprite,
            propertyName: "scale.x",
            to: scale.x,
            duration: scaleOut.duration,
            ease: scaleOut.ease,
            delay: scaleOut.delay
        }, {
            target: this.sprite,
            propertyName: "scale.y",
            to: scale.y,
            duration: scaleOut.duration,
            ease: scaleOut.ease,
            delay: scaleOut.delay
        }])

        return scaleOut.duration + scaleOut.delay;

    }

    rotateIn(){

        if(!this.data.animatedProperties.rotateIn || !this.sprite) return 0;

        let rotateIn = this.data.animatedProperties.rotateIn;
        let original_radians = this.spriteContainer.rotation;
        this.spriteContainer.rotation = (rotateIn.value / 180) * Math.PI;

        SequencerAnimationEngine.animate(this.counterAnimateRotation({
            target: this.spriteContainer,
            propertyName: "rotation",
            to: original_radians,
            duration: rotateIn.duration,
            ease: rotateIn.ease,
            delay: rotateIn.delay
        }))

        return rotateIn.duration + rotateIn.delay;
    }

    rotateOut(immediate = false){

        if(!this.data.animatedProperties.rotateOut || !this.sprite) return 0;

        let rotateOut = this.data.animatedProperties.rotateOut;

        rotateOut.delay = typeof immediate !== "number"
            ? Math.max(this.animationDuration - rotateOut.duration + rotateOut.delay, 0)
            : Math.max(immediate - rotateOut.duration + rotateOut.delay, 0);

        SequencerAnimationEngine.animate(this.counterAnimateRotation({
            target: this.spriteContainer,
            propertyName: "rotation",
            to: (rotateOut.value / 180) * Math.PI,
            duration: rotateOut.duration,
            ease: rotateOut.ease,
            delay: rotateOut.delay
        }))

        return rotateOut.duration + rotateOut.delay;

    }

    fadeInAudio(){

        if(!this.data.animatedProperties.fadeInAudio || this.source?.volume === undefined || !this.sprite) return 0;

        let fadeInAudio = this.data.animatedProperties.fadeInAudio;
        this.source.volume = 0.0;

        if(this.actualCreationTime > (this.data.timestamp + duration + delay)) return;

        SequencerAnimationEngine.animate({
            target: this.sprite,
            propertyName: "volume",
            to: this.data.audioVolume,
            duration: fadeInAudio.duration,
            ease: fadeInAudio.ease,
            delay: fadeInAudio.delay
        })

        return fadeInAudio.duration + fadeInAudio.delay;
    }

    fadeOutAudio(immediate = false){

        if(!this.data.animatedProperties.fadeOutAudio || this.source?.volume === undefined || !this.sprite) return 0;

        const fadeOutAudio = this.data.animatedProperties.fadeOutAudio;

        fadeOutAudio.delay = typeof immediate !== "number"
            ? Math.max(this.animationDuration - fadeOutAudio.duration + fadeOutAudio.delay, 0)
            : Math.max(immediate - fadeOutAudio.duration + fadeOutAudio.delay, 0);

        SequencerAnimationEngine.animate({
            target: this.sprite,
            propertyName: "volume",
            to: 0.0,
            duration: fadeInAudio.duration,
            ease: fadeOutAudio.ease,
            delay: fadeOutAudio.delay
        })

        return fadeOutAudio.duration + fadeOutAudio.delay;
    }

    moveTowards(){

        if (!this.data.animatedProperties.moves || !this.sprite) return 0;

        let moves = this.data.animatedProperties.moves;

        let movementDuration = this.animationDuration;
		if(this.data.speed){
			movementDuration = (this.data.distance / this.data.speed) * 1000;
		}

        const duration = movementDuration - moves.delay;

        if(this.actualCreationTime > (this.data.timestamp + duration + moves.delay)) return;

        SequencerAnimationEngine.animate([{
            target: this.spriteContainer,
            propertyName: "position.x",
            to: moves.target.x,
            duration: duration,
            ease: moves.ease,
            delay: moves.delay
        }, {
            target: this.spriteContainer,
            propertyName: "position.y",
            to: moves.target.y,
            duration: duration,
            ease: moves.ease,
            delay: moves.delay
        }], this.data.timestamp - this.actualCreationTime);

        return duration + moves.delay;
    }

    setEndTimeout(){
        setTimeout(() => {
            this.resolve();
            this.endEffect();
        }, this.animationDuration)
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
                this.spriteContainer.removeChild(this.sprite);
				this.container.removeChild(this.spriteContainer);
                this.spriteContainer.destroy();
				this.sprite.destroy();
			} catch (err) {
			    console.log(err);
            }
		}
    }

    debug(){
        if(game.settings.get("sequencer", "debug")) console.log(`DEBUG | Sequencer | Playing effect:`, this.data);
    }

    async loadVideo(){

        return new Promise(async (resolve, reject) => {

        	let blob = await this.loader.loadVideo(this.data.file);

        	if(!blob){
        	    let error = "Sequencer | "
                if(this.data.moduleName !== "Sequencer") error += `Module: ${this.data.moduleName}`;
				error += ` | CanvasEffect | Play Effect - Could not play: ${this.data.file}`;
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
            video.muted = true;
            if(this.data.audioVolume === false && typeof this.data.audioVolume !== "number" && (this.data.animatedProperties.fadeInAudio || this.data.animatedProperties.fadeOutAudio)){
                this.data.audioVolume = 1.0;
                video.muted = false;
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

    async play() {

        this.texture = await this.loadFile();

        const shouldPlay = !(game.user.viewedScene !== this.data.sceneId || !game.settings.get('sequencer', 'effectsEnabled') || (this.data.users.length && !this.data.users.includes(game.userId)));

        let promise = new Promise(async (resolve, reject) => {
            this.resolve = resolve;
            if(!this.texture){
            	reject();
			}else {
				this.calculateDuration();
				if(shouldPlay){
				    this.initializeEffect();
                }
			}
        });

        return {
            duration: this.animationDuration,
            promise: promise
        }
    };

}

class PersistentCanvasEffect extends CanvasEffect{

    async initializeEffect(){
        this.startLoop();
        await this.spawnSprite();
        this.playCustomAnimations();
        this.moveTowards();
        this.fadeIn();
        this.fadeInAudio();
        this.scaleIn();
        this.rotateIn();
        this.debug();
    }

    startLoop() {
        if (!this.source) return;
        let creationTimeDifference = this.actualCreationTime - this.data.timestamp;
        if(this.data.noLoop){
            this.source.loop = false;
            if(creationTimeDifference >= this.animationDuration){
                this.source.currentTime = this.endTime;
                return;
            }
            this.source.currentTime = creationTimeDifference / 1000;
            return;
        }
        this.source.loop = this.startTime === 0 && this.endTime === this.source.duration;
        this.loopOffset = (creationTimeDifference % this.animationDuration) / 1000;
        this.resetLoop();
    }

    async resetLoop(){
        this.source.currentTime = this.startTime + this.loopOffset;
        if(this.ended || this.source.loop) return;
        await this.tryPlay();
        setTimeout(() => {
            this.loopOffset = 0;
            this.resetLoop();
        }, this.animationDuration - (this.loopOffset*1000));
    }

    async endEffect(){
        const durations = [
            this.fadeOut(this.data.extraEndDuration),
            this.fadeOutAudio(this.data.extraEndDuration),
            this.scaleOut(this.data.extraEndDuration),
            this.rotateOut(this.data.extraEndDuration)
        ].filter(Boolean);
        const waitDuration = Math.max(...durations);
        this.resolve(waitDuration);
        return new Promise(resolve => setTimeout(() => {
            super.endEffect()
            resolve();
        }, waitDuration));

    }

}