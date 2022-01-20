import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import SequencerFileCache from "./sequencer-file-cache.js";
import LoadingBar from "./lib/loadingBar.js";
import * as lib from './lib/lib.js';

const SequencerPreloader = {

    _usersToRespond: new Set(),
    _clientsDone: [],
    _resolve: () => {},

    /**
     *  Caches provided file(s) locally, vastly improving loading speed of those files.
     *
     * @param {Array|String}        inSrcs
     * @param {Boolean}             showProgressBar
     * @returns {Promise<void>}
     */
    preload(inSrcs, showProgressBar = false){

        if(Array.isArray(inSrcs)){
            inSrcs.forEach(str => {
                if(typeof str !== "string"){
                    throw lib.custom_error("Sequencer", "preload | each entry in inSrcs must be of type string")
                }
            })
        }else if(typeof inSrcs !== "string"){
            throw lib.custom_error("Sequencer", "preload | inSrcs must be of type string or array of strings")
        }

        if(typeof showProgressBar !== "boolean"){
            throw lib.custom_error("Sequencer", "preload | showProgressBar must be of type of boolean")
        }

        const srcs = this._cleanSrcs(inSrcs);

        if (srcs.length === 0) return;

        return this._preloadLocal(srcs, showProgressBar);

    },

    /**
     *  Causes each connected client (including the caller) to fetch and cache the provided file(s) locally, vastly
     *  improving loading speed of those files.
     *
     * @param {Array|String}        inSrcs
     * @param {Boolean}             showProgressBar
     * @returns {Promise<void>}
     */
    preloadForClients(inSrcs, showProgressBar = false) {

        if(Array.isArray(inSrcs)){
            inSrcs.forEach(str => {
                if(typeof str !== "string"){
                    throw lib.custom_error("Sequencer", "preloadForClients | each entry in inSrcs must be of type string")
                }
            })
        }else if(typeof inSrcs !== "string"){
            throw lib.custom_error("Sequencer", "preloadForClients | inSrcs must be of type string or array of strings")
        }

        if(typeof showProgressBar !== "boolean"){
            throw lib.custom_error("Sequencer", "preloadForClients | showProgressBar must be of type of boolean")
        }

        const srcs = this._cleanSrcs(inSrcs);

        if (srcs.length === 0) return;

        if (!lib.user_can_do("permissions-preload")){
            lib.custom_warning("Sequencer", "preloadForClients - You do not have permission to force other clients to preload. Preloading locally instead.");
            return this._preloadLocal(srcs, showProgressBar);
        }

        const promise = new Promise(resolve => {
            this._resolve = resolve;
        });

        this._usersToRespond = new Set(game.users
            .filter(user => user.active)
            .map(user => user.id));

        sequencerSocket.executeForEveryone(SOCKET_HANDLERS.PRELOAD, game.user.id, srcs, showProgressBar);

        return promise;
    },

    async respond(inSenderId, inSrcs, showProgressBar) {
        const numFilesFailedToLoad = await this._preloadLocal(inSrcs, showProgressBar);
        return sequencerSocket.executeAsUser(SOCKET_HANDLERS.PRELOAD_RESPONSE, inSenderId, game.user.id, numFilesFailedToLoad);
    },

    handleResponse(inUserId, numFilesFailedToLoad) {
        this._usersToRespond.delete(inUserId);
        this._clientsDone.push({
            userId: inUserId,
            numFilesFailedToLoad: numFilesFailedToLoad
        })
        if (this._usersToRespond.size > 0) return;

        this._clientsDone.forEach(user => {
            if (user.numFilesFailedToLoad > 0) {
                lib.debug(`${game.users.get(user.userId).name} preloaded files, failed to preload ${user.numFilesFailedToLoad} files`);
            } else {
                lib.debug(`${game.users.get(user.userId).name} preloaded files successfully`);
            }
        });
        lib.debug(`All clients responded to file preloads`);

        this._resolve();

        this._usersToRespond = new Set();
        this._clientsDone = [];
        this._resolve = () => {};
    },

    /**
     * Filters and cleans up file paths given to the preload methods
     *
     * @private
     */
    _cleanSrcs(inSrcs) {

        if (!Array.isArray(inSrcs)) {
            inSrcs = [inSrcs];
        }

        if (inSrcs.length === 0){
            lib.custom_warning("Sequencer", "You need to provide files to preload");
            return [];
        }

        inSrcs = lib.make_array_unique(inSrcs.filter(Boolean).map(src => {
            if (Sequencer.Database.entryExists(src)) {
                return Sequencer.Database.getAllFileEntries(src);
            }
            return src;
        })).deepFlatten();

        if(inSrcs.length >= 750){
            lib.custom_warning("Sequencer", "You are preloading over 750 files, you are most likely preloading more files than the system can cache.", true);
        }

        return inSrcs;
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
                const blob = await SequencerFileCache.loadFile(src, true);
                if (showProgressBar) LoadingBar.incrementProgress();
                if(!blob) {
                    numFilesFailedToLoad++;
                }
            }
            const timeTaken = (performance.now() - startTime) / 1000;
            let failedToLoad = ` (${numFilesFailedToLoad} failed to load)`;
            lib.debug(`Preloading ${numFilesToLoad} files took ${timeTaken}s` + failedToLoad);
            resolve(numFilesFailedToLoad);
        })

    }

}


export default SequencerPreloader;