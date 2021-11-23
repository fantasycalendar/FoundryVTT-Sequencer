import { emitSocketEvent, SOCKET_HANDLERS } from "../sockets.js";
import SequencerFileCache from "./sequencer-file-cache.js";
import LoadingBar from "./lib/loadingBar.js";
import * as lib from './lib/lib.js';

const SequencerPreloader = {

    _userId: undefined,
    responseResolve: false,
    doneResolve: false,
    clientsDone: new Set(),
    expectedClients: new Set(),
    clientsResponded: new Set(),

    get userId() {
        if (this._userId === undefined) {
            this._userId = game.user.id;
        }
        return this._userId;
    },

    _reset() {
        this.doneResolve = false;
        this.responseResolve = false;
        this.clientsDone = new Set();
        this.expectedClients = new Set();
        this.clientsResponded = new Set();
    },

    cleanSrcs(inSrcs) {
        return lib.makeArrayUnique(inSrcs.map(src => {
            if (window.Sequencer.Database.entryExists(src)) {
                return window.Sequencer.Database.getAllFileEntries(src);
            }
            return src;
        })).deepFlatten();
    },

    async preloadForClients(inSrcs, showProgressBar = false) {

        this._reset();

        if (!Array.isArray(inSrcs)) {
            inSrcs = [inSrcs];
        }

        if (inSrcs.length === 0) return;

        inSrcs = this.cleanSrcs(inSrcs);

        if (!game.user.can("SEQUENCER_PRELOAD_CLIENTS")) return;

        this.expectedClients = new Set(game.users
            .filter(user => user.active)
            .map(user => user.id));

        let responses = new Promise(resolve => {
            this.responseResolve = resolve;
        });

        emitSocketEvent(SOCKET_HANDLERS.PRELOAD, {
            inSrcs,
            showProgressBar,
            senderId: this.userId,
            push: true
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
        this.responseResolve();
    },

    handleDone(userId, senderId, filesFailedToLoad) {

        if (senderId === undefined) senderId = this.userId;

        if (this.userId !== senderId) return;

        this.clientsDone.add({ userId, filesFailedToLoad });

        if (this.expectedClients.size !== this.clientsResponded.size) return;
        if (this.clientsDone.size !== this.clientsResponded.size) return;

        this.clientsDone.forEach(user => {
            if (filesFailedToLoad > 0) {
                lib.debug(`${game.users.get(user.userId).name} preloaded files, failed to preload ${filesFailedToLoad} files`);
            } else {
                lib.debug(`${game.users.get(user.userId).name} preloaded files successfully`);
            }
        });
        lib.debug(`All clients responded to file preloads`);

        this.doneResolve();

        this._reset();

    },

    preload({ inSrcs, showProgressBar = false, senderId, local = false, push = false } = {}) {

        inSrcs = this.cleanSrcs(inSrcs);

        if (push) emitSocketEvent(SOCKET_HANDLERS.PRELOAD_RESPONSE, this.userId, senderId);
        if (local) this.handleResponse(this.userId);

        let startTime = performance.now()
        lib.debug(`Preloading ${inSrcs.length} files...`);
        let numFilesToLoad = inSrcs.length;

        if (showProgressBar) LoadingBar.init("Sequencer - Preloading files", numFilesToLoad);

        let filesSucceeded = 0;
        new Promise(async (resolve) => {
            for(let src of inSrcs){
                await SequencerFileCache.loadFile(src).then(() => {
                    if (showProgressBar) LoadingBar.incrementProgress();
                    filesSucceeded++;
                }).catch(() => {
                    if (showProgressBar) LoadingBar.incrementProgress();
                });
            }
            resolve();
        }).then(() => {
            if (push) emitSocketEvent(SOCKET_HANDLERS.PRELOAD_DONE, this.userId, senderId, numFilesToLoad - filesSucceeded);
            if (local) this.handleDone(this.userId, this.userId, numFilesToLoad - filesSucceeded);
            lib.debug(`Preloading ${numFilesToLoad - filesSucceeded} files took ${(performance.now() - startTime) / 1000}s`);
        });
    },

}

export default SequencerPreloader;