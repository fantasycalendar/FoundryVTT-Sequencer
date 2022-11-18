# Sample Macros

This page contains a few different macros that you may find useful in your game.

### Show interface of Item Pile or Merchant for all active players

Replace `ACTOR_NAME_HERE` with the actor name of the item pile or merchant you wish to show the interface for.

Remove the `userIds` portion to only show the interface for yourself.

```js
game.itempiles.API.renderItemPileInterface(game.actors.getName("ACTOR_NAME_HERE"), {
  userIds: game.users.map(user => user.id)
});
```

### Make tokens lootable

Select tokens, run macro. They can now be looted.

```js
if (!canvas.tokens.controlled.length) return;
game.itempiles.API.turnTokensIntoItemPiles(canvas.tokens.controlled)
```

### Revert tokens from being lootable

Select tokens, run macro. They can not be looted anymore.

```js
if (!canvas.tokens.controlled.length) return;
game.itempiles.API.revertTokensFromItemPiles(canvas.tokens.controlled)
```

### Populate loot via table

This macro rolls on a table you choose (see `MY_TABLE_NAME_HERE`), gathers the items from rolling on the table and
adds it to the selected tokens. Each selected token will gets its own rolls and unique items.

Change `MY_TABLE_NAME_HERE` to be the name of the table you want to roll on. You can change the `timesToRoll` to flat
number or a roll formula, and you can change `removeExistingActorItems` to be `true` to make this macro clear all of
that character's items.

**Note:** The macro only deletes items that could be looted. Features and other things are
preserved.

**The deletion of items is not undoable.**

```js
if (!canvas.tokens.controlled.length) return;
for (const selected_token of canvas.tokens.controlled) {
  await game.itempiles.API.rollItemTable("MY_TABLE_NAME_HERE", {
    timesToRoll: "1d4+1",
    targetActor: selected_token.actor,
    removeExistingActorItems: false
  });
}
await game.itempiles.API.turnTokensIntoItemPiles(canvas.tokens.controlled);
```

