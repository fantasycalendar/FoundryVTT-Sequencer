### <img src="../images/siren.gif" width="22px" height="22px" alt="Siren"> Word Of Warning <img src="../images/siren.gif" width="22px" height="22px" alt="Siren">

Use the preloader with **caution** and **consideration** - not every client can afford to preload hundreds of megabytes of files, as they may be on a limited connection or they might be on an internet plan where they pay by gigabyte. In any case, this is **not** to be used casually.

## Global Reference

You can access the global Sequencer preloader through:

```js
Sequencer.Preloader;
```

## Preload For Clients

```js
Sequencer.Preloader.preloadForClients(files = string|array<string>, showProgressBar = boolean)
```

<details>
  <summary><strong>------ Click for examples ------</strong></summary><br />

```js
// Preload a single file:
await Sequencer.Preloader.preloadForClients("single/path/to/file.webm");

// Preloading a list of files:
await Sequencer.Preloader.preloadForClients([
  "an/array/of/files.webm",
  "that/all/gets/loaded.webm",
]);

// Preload a single database path (which may contain multiple files)
await Sequencer.Preloader.preloadForClients("jb2a.fire_bolt");

// Preload a list of database paths:
await Sequencer.Preloader.preloadForClients([
  "jb2a.fire_bolt",
  "jb2a.ray_of_frost",
]);

// Preloading a list of files and show the progress bar:
await Sequencer.Preloader.preloadForClients(
  ["an/array/of/files.webm", "that/all/gets/loaded.webm"],
  true
);
```

<strong>--------------------------------</strong>

</details>

Causes each connected client (including the caller) to fetch and cache the provided file(s) locally, vastly improving loading speed of those files.

The first argument is either a string of a path to a single file, an array of filepaths, a single database path, or an array of database paths. Database path(s) will automatically figure out which files to load within the given path. Use this sparingly.

A second optional boolean argument will also cause a progress bar to be shown for each client.

Returns a promise which resolves when every client has preloaded the file(s) provided.

## Preload

```js
Sequencer.Preloader.preload(files = string|array<strings>, showProgressBar = boolean)
```

<details>
  <summary><strong>------ Click for examples ------</strong></summary><br />

```js
// Preload a single file:
await Sequencer.Preloader.preload("single/path/to/file.webm");

// Preloading a list of files:
await Sequencer.Preloader.preload([
  "an/array/of/files.webm",
  "that/all/gets/loaded.webm",
]);

// Preload a single database path (which may contain multiple files)
await Sequencer.Preloader.preload("jb2a.fire_bolt");

// Preload a list of database paths:
await Sequencer.Preloader.preload(["jb2a.fire_bolt", "jb2a.ray_of_frost"]);

// Preloading a list of files and show the progress bar:
await Sequencer.Preloader.preload(
  ["an/array/of/files.webm", "that/all/gets/loaded.webm"],
  true
);
```

<strong>--------------------------------</strong>

</details>

Similar to the previous method in every way, except that it only preloads the files locally.

Can be used in a world script or module to preload a set of files for clients when they connect.
