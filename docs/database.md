## Global Reference

You can access the global Sequencer database through:

```js
Sequencer.Database;
```

## Register Entries

`Sequencer.Database.registerEntries(moduleName, entries)`

It is recommended this is called in the `ready` hook:

```js
Hooks.on("sequencerReady", () => {
  Sequencer.Database.registerEntries("your_module_name", data);
});
```

This registers a set of entries to the database on the given module name.

The `entries` parameter is expected to be an object in a structure like this:

```js
const database = {
  effects: {
    generic: {
      explosions:
        "modules/your_module_name/Library/VFX/Generic/Explosion/explosion_01.webm",
    },
    lasershot: {
      red: [
        "modules/your_module_name/Library/VFX/LaserShots/lasershot_red_01.webm",
        "modules/your_module_name/Library/VFX/LaserShots/lasershot_red_02.webm",
        "modules/your_module_name/Library/VFX/LaserShots/lasershot_red_03.webm",
      ],
      blue: [
        "modules/your_module_name/Library/VFX/LaserShots/lasershot_red_01.webm",
        "modules/your_module_name/Library/VFX/LaserShots/lasershot_red_02.webm",
        "modules/your_module_name/Library/VFX/LaserShots/lasershot_red_03.webm",
      ],
    },
  },
};
```

The structure can be in any form you want, as long as it eventually ends up at a file path, or an array of file paths (shown above).

Read more on the [How To Use The Database](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/How-to:-Sequencer-Database) article.

## Get Entry

`Sequencer.Database.getEntry(inString)`

This method will get the entry (or entries) under a dot-notated database path.

This will return `SequencerFile` objects, ones used within the Sequencer ecosystem. If multiple entries were found under the path, it will return an array of `SequencerFile` objects, otherwise it will return the single `SequencerFile` object, or false if none were found.

## Get Paths Under

`Sequencer.Database.getPathsUnder(inDatabasePath)`

This method will get all of the keys under a given path. If you have a database like this:

```js
const database = {
    effects: {
        lasershot: {
            red: [...],
            blue: [...]
        }
    }
}
```

Doing `Sequencer.Database.getPathsUnder("my_module_name.effects.lasershot")`, it will return an array like this: `["red", "blue"]`

## Get all file entries

`Sequencer.Database.getAllFileEntries(inModule)`

Gets all of the files based on the module that registered it.

Returns a list of strings.

## Validate Entries

`Sequencer.Database.validateEntries(inModule)`

This goes through each of the registered entries under a module name and checks if the paths exist and are spelled correctly.
