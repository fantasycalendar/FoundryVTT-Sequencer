import { reactiveEl as html } from "../lib/html.js";

const MAX_NODES = 24

// const template = html``
export default class SequencerDatabaseViewer extends FormApplication {
  constructor(dialogData = {}, options = {}) {
    super(dialogData, options);
    this.filter = "all";
    this.search = "";
    this.autoplay = true;
    this.packs = Object.keys(window.Sequencer.Database.entries);
    this.entries = window.Sequencer.Database.flattenedEntries.map((entry) => {
      return {
        pack: entry.split(".")[0],
        entry: entry,
      };
    });
    this.list = false;

    this.listItems = Array.from(
      { length: Math.min(this.getFilteredEntries().length, MAX_NODES)  },
      () => {
        const el = html`<div class="database-entry" data-id="{{ entry }}">
          <button type="button" class="btn_play">
            <i class="fas fa-play"></i>
          </button>
          <button type="button" class="btn_copy_filepath">
            <i class="fas fa-copy"></i> Filepath
          </button>
          <button type="button" class="btn_copy_databasepath">
            <i class="fas fa-copy"></i> Database
          </button>
          <div class="database-entry-text" title="{{entry}}">{{ entry }}</div>
        </div>`

        el.addEventListener('click', e => {
          const entry = e.currentTarget.dataset.id
          switch (e.target.className) {
            case "btn_play":
              this.playAsset(entry)
              break
            case "btn_copy_filepath":
              this.copyText($(e.target), entry, true)
              break
            case "btn_copy_databasepath":
              this.copyText($(e.target), entry, false)
              break
          }
        })

        return el
      }
    );
  }

  static show(inFocus = false) {
    if (!game.user.isTrusted) return;
    for (let app of Object.values(ui.windows)) {
      if (app instanceof this) {
        return app.render(true, { focus: inFocus });
      }
    }
    return new this().render(true);
  }

  static get isVisible() {
    for (let app of Object.values(ui.windows)) {
      if (app instanceof this) return app;
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
    return this.entries.filter((part) => {
      return (
        (this.filter === "all" || this.filter === part.pack) &&
        (search === "" || part.entry.match(regex)?.length >= searchParts.length)
      );
    });
  }

  /* -------------------------------------------- */

  refreshView(html) {
    if (!this.list) this.list = html.find(".database-entries");
    let search = this.search
      .replace(/[^A-Za-z0-9 .*_-]/g, "")
      .replace(".", ".")
      .replace("*", "(.*?)");

    let filteredEntries = this.getFilteredEntries(search).map(
      (part) => part.entry
    );

    let regex = new RegExp(search.split(" ").join("|"), "g");

    this.list.children().each(function () {
      let index = filteredEntries.indexOf($(this).attr("data-id"));
      $(this).toggleClass("hidden", index === -1);
      let innerHtmlElement = $(this).find(".database-entry-text");
      let entry = innerHtmlElement.text();
      innerHtmlElement.html(
        search !== ""
          ? entry.replace(regex, (str) => {
              return `<mark>${str}</mark>`;
            })
          : entry
      );
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    let data = super.getData();
    data.packs = this.packs;
    data.entries = this.getFilteredEntries().slice(0, 20);
    return data;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    const scroller = html.find(".database-entries");
    const wrapper = html.find(".database-entries-wrapper");

    scroller[0].addEventListener("scroll", () => {
      const entries = this.getFilteredEntries()
      const scrollTop = clamp(scroller[0].scrollTop - 100, parseInt(wrapper[0].style.height))
      const scrolledIndex = (Math.floor(scroller[0].scrollTop/20) - 5)
      const startIndex = clamp(scrolledIndex, entries.length - MAX_NODES)

      this.listItems.forEach((el,i) => el.update(entries[startIndex + i]))

      wrapper[0].style.paddingTop= (scrollTop) + "px"
    });

    wrapper.height(this.getFilteredEntries().length * 20);
    wrapper.append(...this.listItems)

    let filter = html.find('select[name="pack-select"]');
    let input = html.find('input[name="search-field"]');
    this.player = html.find(".database-player");
    this.image = html.find(".database-image");

    let filterDebounce = debounce(() => {
      this.search = input.val();
      this.filter = filter.val();
      this.refreshView(html);
    }, 500);

    filter.change(filterDebounce);
    input.keyup(function (e) {
      filterDebounce();
    });

    let self = this;
    // html.find(".btn_play").click(function () {
    //   let entry = $(this).siblings(".database-entry-text").text();
    //   self.playAsset.bind(self)(entry);
    // });
    // html.find(".btn_copy_databasepath").click(function () {
    //   let entry = $(this).siblings(".database-entry-text").text();
    //   self.copyText($(this), entry, false);
    // });
    // html.find(".btn_copy_filepath").click(function () {
    //   let entry = $(this).siblings(".database-entry-text").text();
    //   self.copyText($(this), entry, true);
    // });
  }

  playAsset(entryText) {
    if (!this.autoplay) return;

    let entry = window.Sequencer.Database.getEntry(entryText);

    entry = entry?.file ?? entry;

    let isImage = !entry.toLowerCase().endsWith("webm");

    this.player.toggleClass("hidden", isImage);
    this.image.toggleClass("hidden", !isImage);

    if (isImage) {
      this.image[0].src = entry;
      return;
    }

    this.player[0].onerror = () => {
      let error = `Sequencer Database Viewer | Could not play file: ${entry}`;
      ui.notifications.error(error);
      console.error(error);
    };

    this.player[0].oncanplay = () => {
      this.player[0].play();
    };

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
    document.execCommand("copy");

    button.fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
  }

  async _onSubmit(event) {
    super._onSubmit(event, { preventClose: true });
  }

  async _updateObject() {}
}

function clamp (num,max,min = 0){
  const _max = Math.max(min,max)
  const _min = Math.min(min,max)
  return Math.max(_min, Math.min(_max, num))
}
