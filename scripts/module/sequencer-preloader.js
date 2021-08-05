import { emitSocketEvent, SOCKET_HANDLERS } from "../sockets.js";
import SequencerFileCache from "./sequencer-file-cache.js";

const SequencerPreloader = {

	responseResolve: false,
	doneResolve: false,
	clientsDone: new Set(),
	expectedClients: new Set(),
	clientsResponded: new Set(),

	_reset(){
		this.responseResolve = false;
		this.resolve = false;
		this.clientsDone = new Set();
		this.expectedClients = new Set();
		this.clientsResponded = new Set();
	},

	async preloadForClients(src){

		if(!game.user.isGM) return;

		this.expectedClients = new Set(game.users
			.filter(user => user.active && user.id !== game.user.id)
			.map(user => user.id));

		if(!Array.isArray(src)){
			src = [src];
		}

		emitSocketEvent(SOCKET_HANDLERS.PRELOAD, src);

		await new Promise(resolve => {
			this.responseResolve = resolve;
		});

		return new Promise((resolve) => {
			this.doneResolve = resolve;
		});

	},

	handleResponse(userId){
		this.clientsResponded.add(userId);
		if(this.expectedClients.size !== this.clientsResponded.size) return;
		this.responseResolve();
	},

	handleDone(userId){
		this.clientsDone.add(userId);
		if(this.clientsDone.size !== this.clientsResponded.size) return;
		this.doneResolve();
		this._reset();
	},

	preload(srcs){
		emitSocketEvent(SOCKET_HANDLERS.PRELOAD_RESPONSE, game.user.id);
		Promise.all(srcs.map(src => SequencerFileCache.loadFile(src)))
			.then(() => {
				emitSocketEvent(SOCKET_HANDLERS.PRELOAD_DONE, game.user.id)
			});
	},

}

export default SequencerPreloader;