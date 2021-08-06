import { emitSocketEvent, SOCKET_HANDLERS } from "../sockets.js";
import SequencerFileCache from "./sequencer-file-cache.js";

const SequencerPreloader = {

	_userId: undefined,
	_debug: undefined,
	responseResolve: false,
	doneResolve: false,
	clientsDone: new Set(),
	expectedClients: new Set(),
	clientsResponded: new Set(),

	get debug(){
		if(this._debug === undefined){
			this._debug = game.settings.get('sequencer', 'debug');
		}
		return this._debug;
	},

	get userId(){
		if(this._userId === undefined){
			this._userId = game.user.id;
		}
		return this._userId;
	},

	_reset(){
		this.responseResolve = false;
		this.resolve = false;
		this.clientsDone = new Set();
		this.expectedClients = new Set();
		this.clientsResponded = new Set();
	},

	async preloadForClients(inSrcs, showProgressBar=false){

		if(!Array.isArray(inSrcs)){
			inSrcs = [inSrcs];
		}

		if(inSrcs.length === 0) return;

		if(!game.user.isGM) return;

		this.expectedClients = new Set(game.users
			.filter(user => user.active)
			.map(user => user.id));

		emitSocketEvent(SOCKET_HANDLERS.PRELOAD, {
			inSrcs,
			senderId: this.userId,
			push: true,
			showProgressBar
		});

		let responses = new Promise(resolve => {
			this.responseResolve = resolve;
		});

		this.preload({
			inSrcs,
			senderId: this.userId,
			showProgressBar,
			local: true,
			push: false
		});

		await responses;

		return new Promise((resolve) => {
			this.doneResolve = resolve;
		});

	},

	handleResponse(userId, senderId){
		if(senderId === undefined) senderId = this.userId;
		if(this.userId !== senderId) return;
		this.clientsResponded.add(userId);
		if(this.expectedClients.size !== this.clientsResponded.size) return;
		this.responseResolve();
	},

	handleDone(userId, senderId){
		if(senderId === undefined) senderId = this.userId;
		if(this.userId !== senderId) return;

		this.clientsDone.add(userId);

		if(this.clientsDone.size !== this.clientsResponded.size) return;

		if(this.debug) {
			this.clientsDone.forEach(userId => {
				console.log(`${game.users.get(userId).name} preloaded files successfully`);
			});
			console.log(`All clients preloaded files successfully`);
		}

		this.doneResolve();

		this._reset();
	},

	preload({inSrcs, senderId, showProgressBar, local=false, push=false}={}){

		if(push) emitSocketEvent(SOCKET_HANDLERS.PRELOAD_RESPONSE, this.userId, senderId);
		if(local) this.handleResponse(this.userId);

		let startTime = performance.now()
		if(this.debug) console.log(`Preloading ${inSrcs.length} files...`);
		let numFilesToLoad = inSrcs.length;

		if(showProgressBar) loadingBar.init("Sequencer - Preloading files", numFilesToLoad, this.debug);

		Promise.allSettled(
			inSrcs.map(src => SequencerFileCache.loadFile(src).then((src) => {
				if(showProgressBar) loadingBar.incrementProgress();
			}))
		).then(() => {
			if(showProgressBar) loadingBar.hide();
			if(push) emitSocketEvent(SOCKET_HANDLERS.PRELOAD_DONE, this.userId, senderId);
			if(local) this.handleDone(this.userId);
			if(this.debug) console.log(`Preloading ${inSrcs.length} files took ${(performance.now() - startTime)/1000}s`);
		});
	},

}

const loadingBar = {

	debug: false,

	loadingParent: false,
	loadingBar: false,
	loadingLabel: false,

	total: 0,
	current: 0,
	lastPerc: 0,

	init(context, total, debug){

		this.context = context;
		this.total = total;
		this.current = 0;
		this.lastPerc = 0;
		this.debug = debug;

	},

	incrementProgress(){

		this.current += 1;
		let perc = this.current / this.total;
		let newPerc = Math.round(perc*100);

		if(newPerc !== this.lastPerc){
			if(this.debug) console.log(`${newPerc}% loaded...`)
			this.setPercentage(newPerc)
		}

		this.lastPerc = newPerc;

	},

	setPercentage(perc){
		SceneNavigation._onLoadProgress(this.context, perc);
	},

	hide(){
		this.setPercentage(100);
		this.total = 0;
		this.current = 0;
		this.lastPerc = 0;
	}

}


export default SequencerPreloader;