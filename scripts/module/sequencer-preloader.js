import { emitSocketEvent, SOCKET_HANDLERS } from "../sockets.js";
import SequencerFileCache from "./sequencer-file-cache.js";
import loadingBar from "./lib/loadingBar.js";
import * as lib from './lib/lib.js';

const SequencerPreloader = {

    _userId: undefined,
    _debug: undefined,
    responseResolve: false,
    doneResolve: false,
    clientsDone: new Set(),
    expectedClients: new Set(),
    clientsResponded: new Set(),

    get debug() {
        if (this._debug === undefined) {
            this._debug = game.settings.get('sequencer', 'debug');
        }
        return this._debug;
    },

    get userId() {
        if (this._userId === undefined) {
            this._userId = game.user.id;
        }
        return this._userId;
    },

    _reset() {
        this.responseResolve = false;
        this.resolve = false;
        this.clientsDone = new Set();
        this.expectedClients = new Set();
        this.clientsResponded = new Set();
    },

    cleanSrcs(inSrcs) {
        return lib.makeArrayUnique(inSrcs.map(src => {
            if (window.Sequencer.Database.entryExists(src)) {
                return window.Sequencer.Database.getAllFilesUnder(src);
            }
            return src;
        })).deepFlatten();
    },

    async preloadForClients(inSrcs, showProgressBar = false) {

        if (!Array.isArray(inSrcs)) {
            inSrcs = [inSrcs];
        }

        if (inSrcs.length === 0) return;

        inSrcs = this.cleanSrcs(inSrcs);

        if (!game.user.isGM) return;

        this.expectedClients = new Set(game.users
            .filter(user => user.active)
            .map(user => user.id));

        emitSocketEvent(SOCKET_HANDLERS.PRELOAD, {
            inSrcs,
            showProgressBar,
            senderId: this.userId,
            push: true
        });

        let responses = new Promise(resolve => {
            this.responseResolve = resolve;
        });

        this.preload({
            inSrcs,
            showProgressBar,
            senderId: this.userId,
            local: true,
            push: false
        });

        await responses;

        return new Promise((resolve) => {
            this.doneResolve = resolve;
        });

    },

    handleResponse(userId, senderId) {
        if (senderId === undefined) senderId = this.userId;
        if (this.userId !== senderId) return;
        this.clientsResponded.add(userId);
        if (this.expectedClients.size !== this.clientsResponded.size) return;
        if (this.responseResolve) this.responseResolve();
    },

    handleDone(userId, senderId, filesFailedToLoad) {
        if (senderId === undefined) senderId = this.userId;
        if (this.userId !== senderId) return;

        this.clientsDone.add({ userId, filesFailedToLoad });

        if (this.clientsDone.size !== this.clientsResponded.size) return;

        if (this.debug) {
            this.clientsDone.forEach(user => {
                if (filesFailedToLoad > 0) {
                    console.log(`${game.users.get(user.userId).name} preloaded files, failed to preload ${filesFailedToLoad} files`);
                } else {
                    console.log(`${game.users.get(user.userId).name} preloaded files successfully`);
                }
            });
            console.log(`All clients responded to file preloads`);
        }

        if (this.doneResolve) this.doneResolve();

        this._reset();
    },

    preload({ inSrcs, showProgressBar = false, senderId, local = false, push = false } = {}) {

        inSrcs = this.cleanSrcs(inSrcs);

        if (push) emitSocketEvent(SOCKET_HANDLERS.PRELOAD_RESPONSE, this.userId, senderId);
        if (local) this.handleResponse(this.userId);

        let startTime = performance.now()
        if (this.debug) console.log(`Preloading ${inSrcs.length} files...`);
        let numFilesToLoad = inSrcs.length;

        if (showProgressBar) loadingBar.init("Sequencer - Preloading files", numFilesToLoad, this.debug);

        let filesSucceeded = 0;
        Promise.allSettled(
            inSrcs.map(src => SequencerFileCache.loadFile(src).then(() => {
                if (showProgressBar) loadingBar.incrementProgress();
                filesSucceeded++;
            }).catch(() => {
                if (showProgressBar) loadingBar.incrementProgress();
            }))
        ).then(() => {
            if (showProgressBar) loadingBar.hide();
            if (push) emitSocketEvent(SOCKET_HANDLERS.PRELOAD_DONE, this.userId, senderId, numFilesToLoad - filesSucceeded);
            if (local) this.handleDone(this.userId, this.userId, numFilesToLoad - filesSucceeded);
            if (this.debug) console.log(`Preloading ${numFilesToLoad - filesSucceeded} files took ${(performance.now() - startTime) / 1000}s`);
        });
    },

}

export default SequencerPreloader;