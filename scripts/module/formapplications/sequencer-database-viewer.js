export default class SequencerDatabaseViewer extends FormApplication {

    constructor(dialogData = {}, options = {}) {
        super(dialogData, options);
        this.filter = "all"
        this.search = "";
        this.autoplay = true;
        this.packs = Object.keys(window.Sequencer.Database.entries);
        this.entries = window.Sequencer.Database.flattenedEntries.map(entry => {
            return {
                pack: entry.split('.')[0],
                entry: entry
            };
        });
        this.list = false;
    }

    static show(inFocus = false){
        for(let app of Object.values(ui.windows)){
            if(app instanceof this){
                return app.render(true, { focus: inFocus });
            }
        }
        return new this().render(true);
    }

    static get isVisible(){
        for(let app of Object.values(ui.windows)){
            if(app instanceof this) return app;
        }
    }

    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: "Sequencer Database Viewer",
            template: `modules/sequencer/templates/sequencer-database-template.html`,
            classes: ["dialog"],
            width: 900,
            height: 425,
        });
    }

    getFilteredEntries(search = "") {
        let searchParts = search.split(" ");
        let regex = new RegExp(searchParts.join("|"), "g");
        return this.entries.filter(part => {
            return (this.filter === "all" || this.filter === part.pack)
                && (search === "" || part.entry.match(regex)?.length >= searchParts.length);
        });
    }

    /* -------------------------------------------- */

    refreshView(html) {

        if (!this.list) this.list = html.find(".database-entries");

        let search = this.search.replace(/[^A-Za-z0-9 .*_-]/g, "")
            .replace(".", "\.")
            .replace("*", "(.*?)");

        let filteredEntries = this.getFilteredEntries(search).map(part => part.entry);

        let regex = new RegExp(search.split(" ").join("|"), "g");

        this.list.children().each(function () {
            let index = filteredEntries.indexOf($(this).attr("data-id"));
            $(this).toggleClass('hidden', index === -1);
            let innerHtmlElement = $(this).find('.database-entry-text');
            let entry = innerHtmlElement.text()
            innerHtmlElement.html(search !== "" ? entry.replace(regex, (str) => {
                return `<mark>${str}</mark>`
            }) : entry);
        });
    }

    /* -------------------------------------------- */

    /** @override */
    getData() {
        let data = super.getData();
        data.packs = this.packs;
        data.entries = this.getFilteredEntries();
        return data;
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        let filter = html.find('select[name="pack-select"]');
        let input = html.find('input[name="search-field"]');
        this.player = html.find('.database-player');
        this.image = html.find('.database-image');

        let filterDebounce = debounce(() => {
            this.search = input.val();
            this.filter = filter.val();
            this.refreshView(html);
        }, 500)

        filter.change(filterDebounce);
        input.keyup(function (e) {
            filterDebounce()
        });

        let self = this;
        html.find('.btn_play').click(function () {
            let entry = $(this).siblings(".database-entry-text").text();
            self.playAsset.bind(self)(entry);
        });
        html.find('.btn_copy_databasepath').click(function () {
            let entry = $(this).siblings(".database-entry-text").text();
            self.copyText($(this), entry, false);
        });
        html.find('.btn_copy_filepath').click(function () {
            let entry = $(this).siblings(".database-entry-text").text();
            self.copyText($(this), entry, true);
        });
    }

    playAsset(entryText) {
        if (!this.autoplay) return;

        let entry = window.Sequencer.Database.getEntry(entryText);

        entry = entry?.file ?? entry;

        let isImage = !entry.toLowerCase().endsWith("webm");

        this.player.toggleClass('hidden', isImage)
        this.image.toggleClass('hidden', !isImage)

        if (isImage) {
            this.image[0].src = entry;
            return;
        }

        this.player[0].onerror = () => {
            let error = `Sequencer Database Viewer | Could not play file: ${entry}`;
            ui.notifications.error(error);
            console.error(error);
        }

        this.player[0].oncanplay = () => {
            this.player[0].play();
        }

        this.player[0].src = entry;
    }

    copyText(button, entry, getFilepath) {

        if (getFilepath) {
            entry = window.Sequencer.Database.getEntry(entry);
            entry = entry?.file ?? entry;
        }

        let tempInput = document.createElement("input");
        tempInput.value = `${entry}`;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        document.execCommand('copy');

        button.fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
    }

    async _onSubmit(event) {
        super._onSubmit(event, { preventClose: true })
    }

    async _updateObject() {
    }

}