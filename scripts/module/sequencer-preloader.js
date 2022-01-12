import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import SequencerFileCache from "./sequencer-file-cache.js";
import LoadingBar from "./lib/loadingBar.js";
import * as lib from './lib/lib.js';

const SequencerPreloader = {

    _userId: undefined,
    _responseResolve: false,
    _doneResolve: false,
    _clientsDone: new Set(),
    _expectedClients: new Set(),
    _clientsResponded: new Set(),

    /**
     *  Caches provided file(s) locally, vastly improving loading speed of those files.
     *
     * @param {Array|String}        inSrcs
     * @param {Boolean}             showProgressBar
     * @returns {Promise<void>}
     */
    preload(inSrcs, showProgressBar = false){

        this._reset();

        if (!Array.isArray(inSrcs)) {
            inSrcs = [inSrcs];
        }

        inSrcs = this._cleanSrcs(inSrcs);

        if (inSrcs.length === 0) throw lib.custom_error("Sequencer", "preloadForClients - You need to provide files to preload");

        return this._preloadLocal(inSrcs, showProgressBar);

    },

    /**
     *  Causes each connected client (including the caller) to fetch and cache the provided file(s) locally, vastly
     *  improving loading speed of those files.
     *
     * @param {Array|String}        inSrcs
     * @param {Boolean}             showProgressBar
     * @returns {Promise<void>}
     */
    async preloadForClients(inSrcs, showProgressBar = false) {

        this._reset();

        if (!Array.isArray(inSrcs)) {
            inSrcs = [inSrcs];
        }

        inSrcs = this._cleanSrcs(inSrcs);

        if (inSrcs.length === 0) throw lib.custom_error("Sequencer", "preloadForClients - You need to provide files to preload");

        if (!lib.user_can_do("permissions-_preload")){
            return this._preload({
                inSrcs,
                local: true,
                push: false
            });
        }

        this._expectedClients = new Set(game.users
            .filter(user => user.active)
            .map(user => user.id));

        let responses = new Promise(resolve => {
            this._responseResolve = resolve;
        });

        sequencerSocket.executeForOthers(SOCKET_HANDLERS.PRELOAD, {
            inSrcs,
            showProgressBar,
            senderId: game.user.id,
            push: true
        });

        this._preloadRemote({
            inSrcs,
            showProgressBar,
            local: true,
            push: false
        });

        await responses;

        return new Promise((resolve) => {
            this._doneResolve = resolve;
        });

    },

    /**
     * Resets local variables to a base set
     *
     * @private
     */
    _reset() {
        this._doneResolve = false;
        this._responseResolve = false;
        this._clientsDone = new Set();
        this._expectedClients = new Set();
        this._clientsResponded = new Set();
    },

    /**
     * Filters and cleans up file paths given to the preload methods
     *
     * @private
     */
    _cleanSrcs(inSrcs) {
        return lib.make_array_unique(inSrcs.filter(Boolean).map(src => {
            if (window.Sequencer.Database.entryExists(src)) {
                return window.Sequencer.Database.getAllFileEntries(src);
            }
            return src;
        })).deepFlatten();
    },

    /**
     * Handle response from a client, resolving once every client has responded
     *
     * @private
     */
    _handleResponse(userId, senderId) {
        if (senderId === undefined) senderId = game.user.id;
        if (game.user.id !== senderId) return;
        this._clientsResponded.add(userId);
        if (this._expectedClients.size !== this._clientsResponded.size) return;
        this._responseResolve();
    },

    /**
     * Handle the final response and resolve the main promise
     *
     * @private
     */
    _handleDone(userId, senderId, filesFailedToLoad) {

        if (senderId === undefined) senderId = game.user.id;

        if (game.user.id !== senderId) return;

        this._clientsDone.add({ userId, filesFailedToLoad });

        if (this._expectedClients.size !== this._clientsResponded.size) return;
        if (this._clientsDone.size !== this._clientsResponded.size) return;

        this._clientsDone.forEach(user => {
            if (filesFailedToLoad > 0) {
                lib.debug(`${game.users.get(user.userId).name} preloaded files, failed to preload ${filesFailedToLoad} files`);
            } else {
                lib.debug(`${game.users.get(user.userId).name} preloaded files successfully`);
            }
        });
        lib.debug(`All clients responded to file preloads`);

        this._doneResolve();

        this._reset();

    },

    /**
     * The method that is called when preloading files for clients, ensuring each one responds eventually
     *
     * @private
     */
    _preloadRemote({ inSrcs, showProgressBar = false, senderId, local = false, push = false } = {}) {

        if (push) sequencerSocket.executeForOthers(SOCKET_HANDLERS.PRELOAD_RESPONSE, game.user.id, senderId);
        if (local) this._handleResponse(game.user.id);

        return this._preloadLocal(inSrcs, showProgressBar)
            .then(({ numFilesFailedToLoad }={}) => {
                if (push) sequencerSocket.executeForOthers(SOCKET_HANDLERS.PRELOAD_DONE, game.user.id, senderId, numFilesFailedToLoad);
                if (local) this._handleDone(game.user.id, game.user.id, numFilesFailedToLoad);
            });
    },

    /**
     * The method that actually preloads files locally, with an optional progress bar
     *
     * @private
     */
    _preloadLocal(inSrcs, showProgressBar){

        let startTime = performance.now()
        let numFilesToLoad = inSrcs.length;

        lib.debug(`Preloading ${numFilesToLoad} files...`);
        if (showProgressBar) LoadingBar.init(`Sequencer - Preloading ${numFilesToLoad} files`, numFilesToLoad);

        return new Promise(async (resolve) => {
            let numFilesFailedToLoad = 0;
            for(let src of inSrcs){
                await SequencerFileCache.loadFile(src).then(() => {
                    if (showProgressBar) LoadingBar.incrementProgress();
                }).catch(() => {
                    if (showProgressBar) LoadingBar.incrementProgress();
                    numFilesFailedToLoad++;
                });
            }
            const timeTaken = (performance.now() - startTime) / 1000;
            resolve({ numFilesFailedToLoad, timeTaken });
        }).then(({ numFilesFailedToLoad, timeTaken }={}) => {
            let failedToLoad = ` (${numFilesFailedToLoad} failed to load)`;
            lib.debug(`Preloading ${numFilesToLoad} files took ${timeTaken}s` + failedToLoad);
        })

    }

}

export default SequencerPreloader;