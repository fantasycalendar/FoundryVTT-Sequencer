import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import SequencerFileCache from "./sequencer-file-cache.js";
import LoadingBar from "../utils/loadingBar.js";
import * as lib from "../lib/lib.js";

const PING_INTERVAL_MS = 5000;
const PING_TIMEOUT_MS = 3000;

const SequencerPreloader = {
  _activeRequests: new Map(),
  _disconnectHookId: null,

  /**
   *  Caches provided file(s) locally, vastly improving loading speed of those files.
   *
   * @param {Array|String}        inSrcs
   * @param {Boolean}             showProgressBar
   * @returns {Promise<void>}
   */
  preload(inSrcs, showProgressBar = false) {
    if (Array.isArray(inSrcs)) {
      inSrcs.forEach((str) => {
        if (typeof str !== "string") {
          throw lib.custom_error(
            "Sequencer",
            "preload | each entry in inSrcs must be of type string"
          );
        }
      });
    } else if (typeof inSrcs !== "string") {
      throw lib.custom_error(
        "Sequencer",
        "preload | inSrcs must be of type string or array of strings"
      );
    }

    if (typeof showProgressBar !== "boolean") {
      throw lib.custom_error(
        "Sequencer",
        "preload | showProgressBar must be of type of boolean"
      );
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
    if (Array.isArray(inSrcs)) {
      inSrcs.forEach((str) => {
        if (typeof str !== "string") {
          throw lib.custom_error(
            "Sequencer",
            "preloadForClients | each entry in inSrcs must be of type string"
          );
        }
      });
    } else if (typeof inSrcs !== "string") {
      throw lib.custom_error(
        "Sequencer",
        "preloadForClients | inSrcs must be of type string or array of strings"
      );
    }

    if (typeof showProgressBar !== "boolean") {
      throw lib.custom_error(
        "Sequencer",
        "preloadForClients | showProgressBar must be of type of boolean"
      );
    }

    const srcs = this._cleanSrcs(inSrcs);

    if (srcs.length === 0) return;

    if (!lib.user_can_do("permissions-preload")) {
      lib.custom_warning(
        "Sequencer",
        "preloadForClients - You do not have permission to force other clients to preload. Preloading locally instead."
      );
      return this._preloadLocal(srcs, showProgressBar);
    }

    const requestId = foundry.utils.randomID();

    const request = {
      id: requestId,
      resolve: null,
      usersToRespond: new Set(
        game.users.filter((user) => user.active).map((user) => user.id)
      ),
      clientsDone: [],
      pingInterval: null,
    };

    const promise = new Promise((resolve) => {
      request.resolve = resolve;
    });

    this._activeRequests.set(requestId, request);
    this._ensureDisconnectHook();

    sequencerSocket.executeForEveryone(
      SOCKET_HANDLERS.PRELOAD,
      requestId,
      game.user.id,
      srcs,
      showProgressBar
    );

    request.pingInterval = setInterval(() => {
      this._pingUnresponsiveClients(requestId);
    }, PING_INTERVAL_MS);

    return promise;
  },

  /**
   * Pings clients that haven't responded yet. If they don't respond to the
   * ping within PING_TIMEOUT_MS, assume they are unreachable and remove them.
   *
   * @private
   */
  _pingUnresponsiveClients(requestId) {
    const request = this._activeRequests.get(requestId);
    if (!request || request.usersToRespond.size === 0) return;

    for (const userId of request.usersToRespond) {
      if (userId === game.user.id) continue;

      const user = game.users.get(userId);
      if (!user?.active) {
        this._removeUserFromRequest(requestId, userId, "disconnected");
        continue;
      }

      const pingId = foundry.utils.randomID();

      if (!request.pendingPings) request.pendingPings = new Map();

      const pingTimeout = setTimeout(() => {
        request.pendingPings?.delete(pingId);
        if (request.usersToRespond.has(userId)) {
          this._removeUserFromRequest(requestId, userId, "unresponsive to ping");
        }
      }, PING_TIMEOUT_MS);

      request.pendingPings.set(pingId, { userId, timeout: pingTimeout });

      sequencerSocket.executeAsUser(
        SOCKET_HANDLERS.PING,
        userId,
        requestId,
        pingId,
        game.user.id
      );
    }
  },

  /**
   * Handles an incoming ping request by immediately responding with a pong.
   */
  respondToPing(requestId, pingId, senderId) {
    sequencerSocket.executeAsUser(
      SOCKET_HANDLERS.PONG,
      senderId,
      requestId,
      pingId
    );
  },

  /**
   * Handles a pong response, confirming the client is still alive.
   */
  handlePong(requestId, pingId) {
    const request = this._activeRequests.get(requestId);
    if (!request?.pendingPings) return;

    const pingData = request.pendingPings.get(pingId);
    if (pingData) {
      clearTimeout(pingData.timeout);
      request.pendingPings.delete(pingId);
    }
  },

  /**
   * Removes a user from a request's wait set and checks if the request is complete.
   *
   * @private
   */
  _removeUserFromRequest(requestId, userId, reason) {
    const request = this._activeRequests.get(requestId);
    if (!request) return;

    if (!request.usersToRespond.has(userId)) return;

    request.usersToRespond.delete(userId);

    const userName = game.users.get(userId)?.name ?? userId;
    lib.debug(`Client "${userName}" removed from preload request (${reason})`);

    if (request.usersToRespond.size === 0) {
      this._resolveRequest(requestId);
    }
  },

  /**
   * Ensures the disconnect hook is registered.
   *
   * @private
   */
  _ensureDisconnectHook() {
    if (this._disconnectHookId !== null) return;
    this._disconnectHookId = Hooks.on("userConnected", (user, connected) => {
      if (connected) return;
      for (const [requestId] of this._activeRequests) {
        this._removeUserFromRequest(requestId, user.id, "disconnected");
      }
    });
  },

  async respond(requestId, inSenderId, inSrcs, showProgressBar) {
    const numFilesFailedToLoad = await this._preloadLocal(
      inSrcs,
      showProgressBar
    );
    return sequencerSocket.executeAsUser(
      SOCKET_HANDLERS.PRELOAD_RESPONSE,
      inSenderId,
      requestId,
      game.user.id,
      numFilesFailedToLoad
    );
  },

  handleResponse(requestId, inUserId, numFilesFailedToLoad) {
    const request = this._activeRequests.get(requestId);
    if (!request) return;

    request.usersToRespond.delete(inUserId);
    request.clientsDone.push({
      userId: inUserId,
      numFilesFailedToLoad: numFilesFailedToLoad,
    });

    if (request.usersToRespond.size > 0) return;

    this._resolveRequest(requestId);
  },

  /**
   * Resolves a preload request, cleans up state, and logs results.
   *
   * @private
   */
  _resolveRequest(requestId) {
    const request = this._activeRequests.get(requestId);
    if (!request) return;

    if (request.pingInterval) {
      clearInterval(request.pingInterval);
    }

    if (request.pendingPings) {
      for (const [, pingData] of request.pendingPings) {
        clearTimeout(pingData.timeout);
      }
      request.pendingPings.clear();
    }

    request.clientsDone.forEach((user) => {
      if (user.numFilesFailedToLoad > 0) {
        lib.debug(
          `${
            game.users.get(user.userId).name
          } preloaded files, failed to preload ${
            user.numFilesFailedToLoad
          } files`
        );
      } else {
        lib.debug(
          `${game.users.get(user.userId).name} preloaded files successfully`
        );
      }
    });
    lib.debug(`All clients responded to file preloads`);

    request.resolve();
    this._activeRequests.delete(requestId);

    if (this._activeRequests.size === 0 && this._disconnectHookId !== null) {
      Hooks.off("userConnected", this._disconnectHookId);
      this._disconnectHookId = null;
    }
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

    if (inSrcs.length === 0) {
      lib.custom_warning("Sequencer", "You need to provide files to preload");
      return [];
    }

    inSrcs = lib
      .make_array_unique(
        inSrcs.filter(Boolean).map((src) => {
          if (Sequencer.Database.entryExists(src)) {
            return Sequencer.Database.getAllFileEntries(src);
          }
          return src;
        })
        .deepFlatten()
      );

    if (inSrcs.length >= 750) {
      lib.custom_warning(
        "Sequencer",
        "You are preloading over 750 files, you are most likely preloading more files than the system can cache.",
        true
      );
    }

    return inSrcs;
  },

  /**
   * The method that actually preloads files locally, with an optional progress bar
   *
   * @private
   */
  _preloadLocal(inSrcs, showProgressBar) {
    let startTime = performance.now();
    let numFilesToLoad = inSrcs.length;

    lib.debug(`Preloading ${numFilesToLoad} files...`);
    if (showProgressBar) {
	    LoadingBar.init(
		    `Sequencer - Preloading ${numFilesToLoad} files`,
		    numFilesToLoad
	    );
    }

    return new Promise(async (resolve) => {
      let numFilesFailedToLoad = 0;
      const loadingPromises = inSrcs.map(async (src) => {
        const blob = await SequencerFileCache.loadFile(src, true);
        if (showProgressBar) LoadingBar.incrementProgress();
        if (!blob) {
          numFilesFailedToLoad++;
        }
      })
      await Promise.allSettled(loadingPromises)
      const timeTaken = (performance.now() - startTime) / 1000;
      let failedToLoad = ` (${numFilesFailedToLoad} failed to load)`;
      lib.debug(
        `Preloading ${numFilesToLoad} files took ${timeTaken}s` + failedToLoad
      );
      resolve(numFilesFailedToLoad);
    });
  },
};

export default SequencerPreloader;
