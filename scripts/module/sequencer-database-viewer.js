export default class SequencerDatabaseViewer extends FormApplication {

	constructor(dialogData={}, options={}) {
		super(dialogData, options);
		this.filter = "all"
		this.search = "";
		this.autoplay = true;
		this.packs = Object.keys(window.SequencerDatabase.entries);
		this.entries = window.SequencerDatabase.flattenedEntries.map(entry => {
			return {
				pack: entry.split('.')[0],
				entry: entry
			};
		});
		this.list = false;
	}

	getFilteredEntries(search=""){
		let searchParts = search.split(" ");
		let regex = new RegExp(searchParts.join("|"), "g");
		return this.entries.filter(part => {
			return (this.filter === "all" || this.filter === part.pack)
				&& (search === "" || part.entry.match(regex)?.length >= searchParts.length);
		});
	}

	refreshView(html){

		if(!this.list) this.list = html.find(".database-entries");
		this.list.empty();

		let search = this.search.replace(/[^A-Za-z0-9 .*_-]/g, "")
			.replace(".", "\.")
			.replace("*", "(.*?)");

		let filteredEntries = this.getFilteredEntries(search);

		let regex = new RegExp(search.split(" ").join("|"), "g");

		filteredEntries.forEach(part => {
			let entry = search !== "" ? part.entry.replace(regex, (str) => {
				return `<mark>${str}</mark>`
			}) : part.entry;
			this.list.append($(`<div class="database-entry">
				<button type="button" class="btn_play"><i class="fas fa-play"></i></button>
				<button type="button" class="btn_copy_filepath"><i class="fas fa-copy"></i> Filepath</button>
				<button type="button" class="btn_copy_databasepath"><i class="fas fa-copy"></i> Database</button>
				<div class="database-entry-text">${entry}</div>
			</div>`));
		});

		this.setupNewListeners();
	}

	/* -------------------------------------------- */

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
		this.player = html.find('.database-player')[0];

		let filterDebounce = debounce(() => {
			this.search = input.val();
			this.filter = filter.val();
			this.refreshView(html);
		}, 500)

		filter.change(filterDebounce);
		input.keyup(function(e){
			filterDebounce()
		});

		this.setupNewListeners();
	}

	setupNewListeners(){
		let self = this;
		let form = $("#sequencer-database-form");
		form.find('.btn_play').click(function(){
			let entry = $(this).siblings(".database-entry-text").text();
			self.playVideo.bind(self)(entry);
		});
		form.find('.btn_copy_databasepath').click(function(){
			let entry = $(this).siblings(".database-entry-text").text();
			self.copyText($(this), entry, false);
		});
		form.find('.btn_copy_filepath').click(function(){
			let entry = $(this).siblings(".database-entry-text").text();
			self.copyText($(this), entry, true);
		});
	}

	playVideo(entryText){
		if(!this.autoplay) return;

		let entry = SequencerDatabase.getEntry(entryText);

		entry = entry?.file ?? entry;

		this.player.onerror = () => {
			let error = `Sequencer Database Viewer | Could not play file: ${entry}`;
			ui.notifications.error(error);
			console.error(error);
		}

		this.player.oncanplay = () => {
			this.player.play();
		}

		this.player.src = entry;
	}

	copyText(button, entry, getFilepath){

		if(getFilepath) {
			entry = SequencerDatabase.getEntry(entry);
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

	async _onSubmit(event){
		super._onSubmit(event, {preventClose: true})
	}

	async _updateObject(){}

}