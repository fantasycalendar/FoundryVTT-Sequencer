const PASTE_BATCH_STALE_MS = 5000;

const PasteManager = {

	userId: null,
	documentName: null,
	sourceUuids: null,
	cursor: 0,
	capturedAt: 0,
	consumed: new WeakMap(),

	setup() {
		for (const documentName of ["Token", "Drawing", "Tile", "MeasuredTemplate", "Region"]) {
			Hooks.on(`paste${documentName}`, (objects, data, opts) => {
				if (opts?.cut) return;
				this.capture(documentName, objects.map((o) => o.document.uuid));
			});
		}
	},

	/**
	 * Records the source UUIDs of a paste operation on the originating client, keyed by document type and
	 * cursor position. Consumed in lockstep order by the matching createDocumentName hook handlers.
	 *
	 * @param {string} documentName
	 * @param {string[]} sourceUuids
	 */
	capture(documentName, sourceUuids) {
		this.userId = game.user.id;
		this.documentName = documentName;
		this.sourceUuids = sourceUuids;
		this.cursor = 0;
		this.capturedAt = Date.now();
	},

	/**
	 * Returns the source UUID corresponding to the given newly-created document, or null if no paste batch is
	 * available for this client and document type. The result is memoized per document instance, so multiple
	 * managers (effect and sound) hooking the same createDocumentName event resolve to the same source UUID.
	 *
	 * @param {foundry.abstract.Document} inDocument
	 * @returns {string|null}
	 */
	consume(inDocument) {
		if (this.consumed.has(inDocument)) return this.consumed.get(inDocument);
		if (!this.sourceUuids) return null;
		if (this.userId !== game.user.id) return null;
		if (this.documentName !== inDocument.documentName) return null;
		if (Date.now() - this.capturedAt > PASTE_BATCH_STALE_MS) {
			this.sourceUuids = null;
			return null;
		}
		if (this.cursor >= this.sourceUuids.length) {
			this.sourceUuids = null;
			return null;
		}
		const sourceUuid = this.sourceUuids[this.cursor++];
		this.consumed.set(inDocument, sourceUuid);
		return sourceUuid;
	},

};

export default PasteManager;
