import SequencerDatabase from "../../modules/sequencer-database.js";
import { SequencerFileBase } from "../../modules/sequencer-file.js";
import CONSTANTS from "../../constants.js";
import * as lib from "../../lib/lib.js";
import { writable, get } from "svelte/store";
import TreeViewEntry from "./TreeViewEntry.svelte";
import TreeViewSeparator from "./TreeViewSeparator.svelte";

let lastFile = false;

function getFileData(entryText) {
  let entry = SequencerDatabase.getEntry(entryText);

  if (Array.isArray(entry)) {
    if (entry.includes(lastFile) && entry.length > 1) {
      entry.splice(entry.indexOf(lastFile), 1);
    }
    entry = lib.random_array_element(entry);
    lastFile = entry;
  }

  let previewFile = entry?.file ?? entry;
  if (entry instanceof SequencerFileBase) {
    previewFile = entry.clone().getPreviewFile(entryText);
  }

  let lowerCaseEntry = previewFile ? previewFile.toLowerCase() : "unknown.jpg";

  const isAudio =
    lowerCaseEntry.endsWith("ogg") ||
    lowerCaseEntry.endsWith("mp3") ||
    lowerCaseEntry.endsWith("wav");
  const isImage = !lowerCaseEntry.endsWith("webm") && !isAudio;
  const isVideo = !isAudio && !isImage;
  const icon = previewFile
    ? isVideo
      ? "fa-film"
      : isAudio
      ? "fa-volume-high"
      : "fa-image"
    : "fa-question-mark";
  const title = previewFile
    ? isVideo
      ? "Animated WebM"
      : isAudio
      ? "Audio"
      : "Image"
    : "Unknown";

  return {
    file: previewFile ?? "unknown.jpg",
    dbEntry: entry,
    icon,
    title,
    isAudio,
    isImage,
    isVideo,
  };
}

function copyPath(dbPath, getFilepath, quotes = false) {
  const tempInput = document.createElement("input");
  tempInput.value = `${dbPath}`;

  let entry;
  if (getFilepath) {
    entry = Sequencer.Database.getEntry(dbPath);
    if (Array.isArray(entry)) {
      entry = lib.random_array_element(entry);
    }
    if (entry instanceof SequencerFileBase) {
      const specificFt = dbPath.match(CONSTANTS.FEET_REGEX);
      if (specificFt) {
        const ft = specificFt[0].replaceAll(".", "");
        entry = entry.getFile(ft);
      } else {
        const files = entry.getAllFiles();
        if (Array.isArray(files)) {
          const index = Math.floor(lib.interpolate(0, files.length - 1, 0.5));
          entry = files[index];
        }
      }
    }

    tempInput.value = `${entry?.file ?? entry}`;
  }

  if (quotes) {
    tempInput.value = `"${tempInput.value}"`;
  }

  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand("copy");
  document.body.removeChild(tempInput);
  document.execCommand("copy");
}

function playFile(entry) {
  const { file, isAudio, isImage, isVideo } = getFileData(entry);

  databaseStore.elements.audio.classList.toggle("hidden", !isAudio);
  databaseStore.elements.image.classList.toggle("hidden", !isImage);
  databaseStore.elements.player.classList.toggle("hidden", !isVideo);

  if (isImage) {
    databaseStore.elements.image.src = file;
    databaseStore.metadata.set({
      type: "Image",
      duration: "n/a",
    });
    return;
  }

  const element = isAudio
    ? databaseStore.elements.audio
    : databaseStore.elements.player;

  element.onerror = () => {
    const error = `Sequencer Database Viewer | Could not play file: ${file}`;
    ui.notifications.error(error);
    console.error(error);
  };

  element.oncanplay = () => {
    element.play();
  };

  element.onloadedmetadata = () => {
    databaseStore.metadata.set({
      type: isVideo ? "Video" : isAudio ? "Audio" : "Image",
      duration: isImage ? "n/a" : element.duration * 1000 + "ms",
    });
  };

  element.src = file;
}

const treeStore = writable({});
const visibleTreeStore = writable([]);
let flattenedEntries = [];
const entriesStore = SequencerDatabase.entriesStore;
const packStore = writable(SequencerDatabase.publicModules);
const selectedPackStore = writable("all");
const searchStore = writable("");
const cleanSearchStore = writable("");
const searchRegexStore = writable(new RegExp("", "gu"));

SequencerDatabase.entriesStore.subscribe(() => {
  packStore.set(SequencerDatabase.publicModules);
});

const databaseStore = {
  metadata: writable(false),
  allRanges: writable(false),
  subLists: writable(false),
  listView: writable(false),
  packStore: packStore,
  selectedPackStore: selectedPackStore,
  visibleTreeStore: visibleTreeStore,
  search: searchStore,
  cleanSearchStore: cleanSearchStore,
  searchRegex: searchRegexStore,
  elements: {},
  copyPath,
  playFile,
  openTreePath,
};

entriesStore.subscribe(() => {
  filterFlattenedEntries();
});

databaseStore.allRanges.subscribe(() => {
  filterFlattenedEntries();
});

databaseStore.subLists.subscribe(() => {
  filterFlattenedEntries();
});

databaseStore.selectedPackStore.subscribe(() => {
  filterFlattenedEntries();
});

searchStore.subscribe((val) => {
  const cleanSearch = lib.str_to_search_regex_str(val).replace(/\s+/g, "|");
  cleanSearchStore.set(cleanSearch);
  searchRegexStore.set(new RegExp(cleanSearch, "gu"));
  updateVisualTree();
});

function filterFlattenedEntries() {
  const selectedPack = get(selectedPackStore);
  const search = get(searchStore);
  const searchRegex = get(searchRegexStore);
  const subLists = get(databaseStore.subLists);
  const allRanges = get(databaseStore.allRanges);
  flattenedEntries = lib.make_array_unique(
    SequencerDatabase.publicFlattenedEntries
      .filter((e) => {
        return (
          (selectedPack === "all" || e.startsWith(selectedPack + ".")) &&
          (!search || e.match(searchRegex))
        );
      })
      .map((e) => (!subLists ? e.split(CONSTANTS.ARRAY_REGEX)[0] : e))
      .map((e) => (!allRanges ? e.split(CONSTANTS.FEET_REGEX)[0] : e))
  );
  treeStore.set(
    flattenedEntries.reduce((acc, entry) => {
      let path = "";
      for (const part of entry.split(".")) {
        const fullPath = path ? path + "." + part : part;
        path = path ? path + ".children." + part : part;
        if (!foundry.utils.getProperty(acc, path)) {
          foundry.utils.setProperty(
            acc,
            path,
            foundry.utils.mergeObject(
              {
                path: part,
                fullPath,
                open: false,
                children: {},
              },
              foundry.utils.getProperty(acc, path)
            )
          );
        }
      }
      return acc;
    }, {})
  );
}

function openTreePath(fullPath, open, openAll = false) {
  treeStore.update((tree) => {
    const fullTreePath = fullPath.split(".").join(".children.");
    const node = foundry.utils.getProperty(tree, fullTreePath);
    foundry.utils.setProperty(tree, fullTreePath + ".open", open);
    if ((!open || openAll) && !foundry.utils.isEmpty(node.children)) {
      recurseOpenTree(node.children, open);
    }
    return tree;
  });
}

function recurseOpenTree(children, open) {
  for (const node of Object.values(children)) {
    node.open = open;
    if (!foundry.utils.isEmpty(node.children)) {
      recurseOpenTree(node.children, open);
    }
  }
}

treeStore.subscribe(() => {
  updateVisualTree();
});

function updateVisualTree() {
  const tree = get(treeStore);
  const visibleTree = recurseTree(tree)
    .deepFlatten()
    .filter((e) => e.visible);
  visibleTreeStore.set(visibleTree);
}

function recurseTree(tree, path = "", depth = 0) {
  const search = get(searchStore);
  const searchRegex = get(searchRegexStore);
  const searchParts = get(cleanSearchStore).split("|");
  return Object.entries(tree).map(([key, data]) => {
    const fullPath = path ? path + "." + key : key;

    const children = recurseTree(
      data.children,
      fullPath,
      depth + 1
    ).deepFlatten();

    const matchParts = lib.make_array_unique(fullPath.match(searchRegex) || []);
    const open =
      data.open ||
      (search &&
        (matchParts.length >= searchParts.length ||
          children.filter((e) => e.visible).length));
    let visible = !search || matchParts.length >= searchParts.length;

    if (visible) {
      children.forEach((e) => (e.visible = true));
    } else {
      visible = children.filter((e) => e.visible).length;
    }

    const entry = {
      class: TreeViewEntry,
      path: key,
      fullPath: fullPath,
      open,
      visible,
      hasChildren: !foundry.utils.isEmpty(data.children),
      depth,
    };

    const leaf = [entry];
    if ((data.open || entry.open) && entry.hasChildren) {
      leaf.push(...children, {
        fullPath: foundry.utils.randomID(),
        class: TreeViewSeparator,
      });
    }
    return leaf;
  });
}

export { databaseStore };
