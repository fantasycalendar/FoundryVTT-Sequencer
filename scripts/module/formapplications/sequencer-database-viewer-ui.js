import { cache } from "../lib/cache.js";
import { reactiveEl as html } from "../lib/html.js";
import { SequencerFile } from "../sequencer-file.js";
import * as lib from "../lib/lib.js";

const MAX_NODES = 24;

export default class SequencerDatabaseViewer extends FormApplication {
    constructor(dialogData = {}, options = {}) {
        super(dialogData, options);
        this.filter = "all";
        this.search = "";
        this.autoplay = true;
        this.packs = Sequencer.Database.publicModules;
        this.allRanges = false;

        // cache getFilteredEntries method, breaking cache whenever search or filter property changes
        cache(this, "getFilteredEntries", ["search", "filter"]);
        cache(this, "getSearchRegex", ["search"]);

        this.listItems = Array.from(
            { length: Math.min(this.getFilteredEntries().length, MAX_NODES) },
            () => {
                const el = html`<div
                    class="database-entry"
                    data-id="{{ entry }}"
                >
                    <button type="button" class="btn_play">
                        <i class="fas fa-play"></i>
                    </button>
                    <button type="button" class="btn_copy_filepath">
                        <i class="fas fa-copy"></i> {{ fileButton }}
                    </button>
                    <button type="button" class="btn_copy_databasepath">
                        <i class="fas fa-copy"></i> {{ dbButton }}
                    </button>
                    <div class="database-entry-text" title="{{entry}}">
                        <div class="database-entry-text-highlight"></div>
                        {{ entry }}
                    </div>
                </div>`;

                const highlight = el.querySelector(
                    ".database-entry-text-highlight"
                );

                el.addEventListener("update", (e) => {
                    highlight.replaceChildren();
                    if (!this.search) return;
                    const entry = e.detail.data?.entry ?? "";
                    const regex = this.getSearchRegex();

                    highlight.innerHTML = entry.replace(
                        regex,
                        "<mark>$&</mark>"
                    );
                });

                el.addEventListener("click", (e) => {
                    const entry = e.currentTarget.dataset.id;
                    switch (e.target.className) {
                        case "btn_play":
                            this.playAsset(entry);
                            break;
                        case "btn_copy_filepath":
                            this.copyText($(e.target), entry, true);
                            break;
                        case "btn_copy_databasepath":
                            this.copyText($(e.target), entry, false);
                            break;
                    }
                });

                return el;
            }
        );
    }

    static show(inFocus = false) {
        for (const app of Object.values(ui.windows)) {
            if (app instanceof this) {
                return app.render(true, { focus: inFocus });
            }
        }
        return new this().render(true);
    }

    static get isVisible() {
        for (const app of Object.values(ui.windows)) {
            if (app instanceof this) return app;
        }
    }

    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: game.i18n.localize("SEQUENCER.Database.Title"),
            template: `modules/sequencer/templates/sequencer-database-template.html`,
            classes: ["dialog"],
            width: 900,
            height: 425,
        });
    }

    getSearchRegex() {
        return new RegExp(this.search, "gu");
    }

    getFilteredEntries() {
        const searchParts = this.search.split("|");
        const { search, filter } = this;
        return this.entries.filter((part) => {
            return (
                (filter === "all" || filter === part.pack) &&
                (search === "" ||
                    part.entry.match(this.getSearchRegex())?.length >=
                        searchParts.length)
            );
        });
    }

    get entries(){
        const entries = this.allRanges
            ? Sequencer.Database.publicFlattenedEntries
            : Sequencer.Database.publicFlattenedSimpleEntries;

        let localizedFilepathButton = game.i18n.localize("SEQUENCER.Database.ButtonFilepath");
        let localizedDatabaseButton = game.i18n.localize("SEQUENCER.Database.ButtonDatabasePath");

        return entries.map(
            (entry) => {
                return {
                    pack: entry.split(".")[0],
                    entry: entry,
                    fileButton: localizedFilepathButton,
                    dbButton: localizedDatabaseButton,
                };
            }
        );
    }

    /* -------------------------------------------- */

    /** @override */
    getData() {
        const data = super.getData();
        data.packs = this.packs;
        return data;
    }

    /** @override */
    activateListeners($html) {
        super.activateListeners($html);

        const [html] = $html;

        const scroller = html.querySelector(".database-entries");
        const wrapper = html.querySelector(".database-entries-wrapper");

        const rerenderList = () => {
            const entries = this.getFilteredEntries();

            const wrapperHeight = entries.length * 20;

            const scrolledIndex = Math.floor(scroller.scrollTop / 20) - 5;
            const startIndex = lib.clamp(
                scrolledIndex,
                0,
                Math.max(entries.length - MAX_NODES, 0)
            );

            this.listItems.forEach((el, i) =>
                el.update(entries[startIndex + i])
            );

            wrapper.style.height = `${wrapperHeight}px`;
            wrapper.style.paddingTop = startIndex * 20 + "px";
        };

        rerenderList();
        scroller.addEventListener("scroll", rerenderList, { passive: true });

        wrapper.append(...this.listItems);

        const filter = html.querySelector('select[name="pack-select"]');
        const input = html.querySelector('input[name="search-field"]');
        const allRanges = html.querySelector('#database-all-ranges');
        this.player = html.querySelector(".database-player");
        this.image = html.querySelector(".database-image");

        const filterDebounce = debounce(() => {
            this.allRanges = allRanges.checked;
            this.search = lib.str_to_search_regex_str(input.value).replace(/\s+/g, "|");
            this.filter = filter.value;
            scroller.scrollTop = 0;
            rerenderList();
        }, 400);

        filter.addEventListener("change", filterDebounce);
        input.addEventListener("input", filterDebounce);
        allRanges.addEventListener("change", filterDebounce);
    }

    playAsset(entryText) {

        if (!this.autoplay) return;
        const { player, image } = this;

        let entry = Sequencer.Database.getEntry(entryText);

        if(entry instanceof SequencerFile){
            entry = entry.clone();
            entry = entry.getPreviewFile(entryText);
        }

        entry = entry?.file ?? entry;

        const isImage = !entry.toLowerCase().endsWith("webm");

        player.classList.toggle("hidden", isImage);
        image.classList.toggle("hidden", !isImage);

        if (isImage) {
            image.src = entry;
            return;
        }

        player.onerror = () => {
            const error = `Sequencer Database Viewer | Could not play file: ${entry}`;
            ui.notifications.error(error);
            console.error(error);
        };

        player.oncanplay = () => {
            player.play();
        };

        player.src = entry;
    }

    copyText(button, entry, getFilepath) {
        if (getFilepath) {
            entry = Sequencer.Database.getEntry(entry);

            if(entry instanceof SequencerFile){
                const files = entry.getAllFiles();
                if(Array.isArray(files)) {
                    const index = Math.floor(lib.interpolate(0, files.length - 1, 0.5));
                    entry = files[index];
                }
            }

            entry = entry?.file ?? entry;
        }

        const tempInput = document.createElement("input");
        tempInput.value = `${entry}`;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        document.execCommand("copy");

        button.fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
    }

    async _onSubmit(event) {
        super._onSubmit(event, { preventClose: true });
    }

    async _updateObject() {}
}
