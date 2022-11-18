# API

* [System settings methods](#system-settings-methods)
    * [ACTOR_CLASS_TYPE](#ACTOR_CLASS_TYPE)
    * [CURRENCIES](#CURRENCIES)
    * [CURRENCY_DECIMAL_DIGITS](#CURRENCY_DECIMAL_DIGITS)
    * [ITEM_PRICE_ATTRIBUTE](#ITEM_PRICE_ATTRIBUTE)
    * [ITEM_QUANTITY_ATTRIBUTE](#ITEM_QUANTITY_ATTRIBUTE)
    * [ITEM_FILTERS](#ITEM_FILTERS)
    * [ITEM_SIMILARITIES](#ITEM_SIMILARITIES)
    * [setActorClassType](#setActorClassType)
    * [setCurrencies](#setCurrencies)
    * [setCurrencyDecimalDigits](#setCurrencyDecimalDigits)
    * [setItemQuantityAttribute](#setItemQuantityAttribute)
    * [setItemPriceAttribute](#setItemPriceAttribute)
    * [setItemFilters](#setItemFilters)
    * [setItemSimilarities](#setItemSimilarities)


* [Item piles methods](#item-piles-methods)
    * [createItemPile](#createItemPile)
    * [turnTokensIntoItemPiles](#turnTokensIntoItemPiles)
    * [revertTokensFromItemPiles](#revertTokensFromItemPiles)
    * [openItemPile](#openItemPile)
    * [closeItemPile](#closeItemPile)
    * [toggleItemPileClosed](#toggleItemPileClosed)
    * [lockItemPile](#lockItemPile)
    * [unlockItemPile](#unlockItemPile)
    * [toggleItemPileLocked](#toggleItemPileLocked)
    * [rattleItemPile](#rattleItemPile)
    * [isItemPileLocked](#isItemPileLocked)
    * [isItemPileClosed](#isItemPileClosed)
    * [isItemPileContainer](#isItemPileContainer)
    * [updateItemPile](#updateItemPile)
    * [deleteItemPile](#deleteItemPile)
    * [splitItemPileContents](#splitItemPileContents)
    * [renderItemPileInterface](#renderItemPileInterface)


* [Item and attribute methods](#item-and-attribute-methods)
    * [addItems](#addItems)
    * [removeItems](#removeItems)
    * [transferItems](#transferItems)
    * [transferAllItems](#transferAllItems)
    * [setAttributes](#setAttributes)
    * [addAttributes](#addAttributes)
    * [removeAttributes](#removeAttributes)
    * [transferAttributes](#transferAttributes)
    * [transferAllAttributes](#transferAllAttributes)
    * [transferEverything](#transferEverything)


* [Misc methods](#misc-methods)
    * [rollItemTable](#rollItemTable)
    * [getPricesForItem](#getPricesForItem)
    * [tradeItems](#tradeItems)

## System settings methods

### ACTOR_CLASS_TYPE

`game.itempiles.API.ACTOR_CLASS_TYPE` ⇒ `string`

The actor class type used for the original item pile actor in this system

---

### CURRENCIES

`game.itempiles.API.CURRENCIES` ⇒ `Array<{primary: boolean, name: string, data: Object, img: string, abbreviation: string, exchange: number}>`

The currencies used in this system

---

### CURRENCY_DECIMAL_DIGITS

`game.itempiles.API.CURRENCY_DECIMAL_DIGITS` ⇒ `Number`

The smallest decimal digits shown for any fractional currency amounts. Only used when there is only one currency

---

### ITEM_PRICE_ATTRIBUTE

`game.itempiles.API.ITEM_PRICE_ATTRIBUTE` ⇒ `string`

The attribute used to track the price of items in this system

---

### ITEM_QUANTITY_ATTRIBUTE

`game.itempiles.API.ITEM_QUANTITY_ATTRIBUTE` ⇒ `string`

The attribute used to track the quantity of items in this system

---

### ITEM_FILTERS

`game.itempiles.API.ITEM_FILTERS` ⇒ `Array<{name: string, filters: string}>`

The filters for item types eligible for interaction within this system

---

### ITEM_SIMILARITIES

`game.itempiles.API.ITEM_SIMILARITIES` ⇒ `Array<string>`

The attributes for detecting item similarities

---

### setActorClassType

`game.itempiles.API.setActorClassType(inClassType)` ⇒ `Promise`

Sets the actor class type used for the original item pile actor in this system

| Param | Type |
| --- | --- |
| inClassType | `string` |

---

### setCurrencies

`game.itempiles.API.setCurrencies(inCurrencies)` ⇒ `Promise`

Sets the currencies used in this system

| Param | Type |
| --- | --- |
| inCurrencies | `Array<Object>` |

---

### setCurrencyDecimalDigits

`game.itempiles.API.setCurrencyDecimalDigits(inDecimalDigits)` ⇒ `Promise`

Set the smallest decimal digits shown for any fractional currency amounts. Only used when there is only one currency.

| Param | Type     |
| --- |----------|
| inDecimalDigits | `Number` |

---

### setItemQuantityAttribute

`game.itempiles.API.setItemQuantityAttribute(inAttribute)` ⇒ `Promise`

Sets the attribute used to track the quantity of items in this system

| Param | Type |
| --- | --- |
| inAttribute | `string` |

---

### setItemPriceAttribute

`game.itempiles.API.setItemPriceAttribute(inAttribute)` ⇒ `Promise`

Sets the attribute used to track the price of items in this system

| Param | Type |
| --- | --- |
| inAttribute | `string` |

---

### setItemFilters

`game.itempiles.API.setItemFilters(inFilters)` ⇒ `Promise`

Sets the items filters for interaction within this system

| Param | Type |
| --- | --- |
| inFilters | `Array<{path: string, filters: string}>` |

---

### setItemSimilarities

`game.itempiles.API.setItemSimilarities(inPaths)` ⇒ `Promise`

Sets the attributes for detecting item similarities

| Param | Type |
| --- | --- |
| inPaths | `Array<string>` |

---

## Item piles methods

### createItemPile

`game.itempiles.API.createItemPile(options)` ⇒ `Promise<object>`

Creates an item pile token at a location, or an item pile actor, or both at the same time.

**Returns**: `Promise<object<{tokenUuid: string, actorUuid: string}>>` - The UUID of the token and/or actor that was just created.

| Param                   | Type             | Default | Description                                                                                                |
|-------------------------|------------------|---------|------------------------------------------------------------------------------------------------------------|
| options                 | `object`         |         | Options to pass to the function                                                                            |
| [options.position]      | `object/boolean` | `false` | Where to create the item pile, with x and y coordinates                                                    |
| [options.sceneId]       | `string/boolean` | `false` | Which scene to create the item pile on                                                                     |
| [options.tokenOverrides] | `object`         | `{}`    | Token data to apply onto the newly created token                                                           |
| [options.actorOverrides] | `object`         | `{}`    | Actor data to apply to the newly created actor (if unlinked)                                               |
| [options.itemPileFlags] | `object`         | `{}`    | Item pile specific flags to apply to the token and actor                                                   |
| [options.items]         | `Array/boolean`  | `false` | Any items to create on the item pile                                                                       |
| [options.createActor] | `boolean`        | `false` | Whether to create a new item pile actor                                                                    |
| [options.pileActorName] | `string/boolean` | `false` | The UUID, ID, or name of the actor to use when creating this item pile (not compatible with `createActor`) |

---

### turnTokensIntoItemPiles

`game.itempiles.API.turnTokensIntoItemPiles(targets, options)` ⇒ `Promise<Array>`

Turns tokens and its actors into item piles

**Returns**: `Promise<Array>` - The uuids of the targets after they were turned into item piles

| Param | Type | Description |
| --- | --- | --- |
| targets | `Token/TokenDocument/Array<Token/TokenDocument>` | The targets to be turned into item piles |
| options | `object` | Options to pass to the function |
| options.pileSettings | `object` | Overriding settings to be put on the item piles' settings |
| options.tokenSettings | `object` | Overriding settings that will update the tokens' settings |

---

### revertTokensFromItemPiles

`game.itempiles.API.revertTokensFromItemPiles(targets, options)` ⇒ `Promise<Array>`

Reverts tokens from an item pile into a normal token and actor

**Returns**: `Promise<Array>` - The uuids of the targets after they were reverted from being item piles

| Param | Type | Description |
| --- | --- | --- |
| targets | `Token/TokenDocument/Array<Token/TokenDocument>` | The targets to be reverted from item piles |
| options | `object` | Options to pass to the function |
| options.tokenSettings | `object` | Overriding settings that will update the tokens |

---

### openItemPile

`game.itempiles.API.openItemPile(target, [interactingToken])` ⇒ `Promise/boolean`

Opens a pile if it is enabled and a container

| Param | Type | Default |
| --- | --- | --- |
| target | `Token/TokenDocument` |  | 
| [interactingToken] | `Token/TokenDocument/boolean` | `false` |

---

### closeItemPile

`game.itempiles.API.closeItemPile(target, [interactingToken])` ⇒ `Promise/boolean`

Closes a pile if it is enabled and a container

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| target | `Token/TokenDocument` |  | Target pile to close |
| [interactingToken] | `Token/TokenDocument/boolean` | `false` |  |

---

### toggleItemPileClosed

`game.itempiles.API.toggleItemPileClosed(target, [interactingToken])` ⇒ `Promise/boolean`

Toggles a pile's closed state if it is enabled and a container

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| target | `Token/TokenDocument` |  | Target pile to open or close |
| [interactingToken] | `Token/TokenDocument/boolean` | `false` |  |

---

### lockItemPile

`game.itempiles.API.lockItemPile(target, [interactingToken])` ⇒ `Promise/boolean`

Locks a pile if it is enabled and a container

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| target | `Token/TokenDocument` |  | Target pile to lock |
| [interactingToken] | `Token/TokenDocument/boolean` | `false` |  |

---

### unlockItemPile

`game.itempiles.API.unlockItemPile(target, [interactingToken])` ⇒ `Promise/boolean`

Unlocks a pile if it is enabled and a container

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| target | `Token/TokenDocument` |  | Target pile to unlock |
| [interactingToken] | `Token/TokenDocument/boolean` | `false` |  |

---

### toggleItemPileLocked

`game.itempiles.API.toggleItemPileLocked(target, [interactingToken])` ⇒ `Promise/boolean`

Toggles a pile's locked state if it is enabled and a container

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| target | `Token/TokenDocument` |  | Target pile to lock or unlock |
| [interactingToken] | `Token/TokenDocument/boolean` | `false` |  |

---

### rattleItemPile

`game.itempiles.API.rattleItemPile(target, [interactingToken])` ⇒ `Promise<boolean>`

Causes the item pile to play a sound as it was attempted to be opened, but was locked

| Param | Type | Default |
| --- | --- | --- |
| target | `Token/TokenDocument` |  | 
| [interactingToken] | `Token/TokenDocument/boolean` | `false` |

---

### isItemPileLocked

`game.itempiles.API.isItemPileLocked(target)` ⇒ `boolean`

Whether an item pile is locked. If it is not enabled or not a container, it is always false.

| Param | Type |
| --- | --- |
| target | `Token/TokenDocument` |

---

### isItemPileClosed

`game.itempiles.API.isItemPileClosed(target)` ⇒ `boolean`

Whether an item pile is closed. If it is not enabled or not a container, it is always false.

| Param | Type |
| --- | --- |
| target | `Token/TokenDocument` |

---

### isItemPileContainer

`game.itempiles.API.isItemPileContainer(target)` ⇒ `boolean`

Whether an item pile is a container. If it is not enabled, it is always false.

| Param | Type |
| --- | --- |
| target | `Token/TokenDocument` |

---

### updateItemPile

`game.itempiles.API.updateItemPile(target, newData, options)` ⇒ `Promise`

Updates a pile with new data.

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| target | `Actor/TokenDocument` |  | Target token or actor to update |
| newData | `object` |  | New data to update the actor with |
| options | `object` |  | Options to pass to the function |
| [options.interactingToken] | `Token/TokenDocument/boolean` | `false` | If an actor caused this update, you can pass one here to pass it along to macros that the item pile may run |
| [options.tokenSettings] | `Object/boolean` | `false` | Updates to make to the target token |

---

### deleteItemPile

`game.itempiles.API.deleteItemPile(target)` ⇒ `Promise`

Deletes a pile, calling the relevant hooks.

| Param | Type |
| --- | --- |
| target | `Token/TokenDocument` |

---

### splitItemPileContents

`game.itempiles.API.splitItemPileContents(target, options)` ⇒ `Promise<object/boolean>`

Splits an item pile's content between all players (or a specified set of target actors).

**Returns**: `Promise<object/boolean>` - An object containing the changes to the pile actor and each actor that received items and attributes. It returns `false` if the given actor was not an item pile.

| Param                    | Type                                                     | Description                     |
|--------------------------|----------------------------------------------------------|---------------------------------|
| target                   | `Token/TokenDocument/Actor`                              | The item pile to split          |
| options                  | `object`                                                 | Options to pass to the function |
| [options.targets]    | `boolean/TokenDocument/Actor/Array<TokenDocument/Actor>` | `false`                         |    The targets to receive the split contents |
| [options.instigator] | `boolean/TokenDocument/Actor` | `false`                          | Whether this was triggered by a specific actor        |

---

### renderItemPileInterface

`game.itempiles.API.renderItemPileInterface(target, options)` ⇒ `Promise`

Renders the appropriate interface for a given actor.

**Returns**: `Promise` - Returns a promise that resolves when the interface has been rendered.

| Param                    | Type                  | Description                         |
|--------------------------|-----------------------|-------------------------------------|
| target                   | `Actor/TokenDocument` | The actor whose interface to render |
| options                  | `object`              | Options to pass to the function     |
| [options.userIds]    | `Array<User/string>`  | `false`                             |   An array of users or user ids for each user to render the interface for (defaults to only self) |
| [options.inspectingTarget] | `Actor/TokenDocument` | `false`                             | Sets what actor should be viewing the interface        |
| [options.useDefaultCharacter] | `boolean`             | `false`                             | Whether other users should use their assigned character when rendering the interface        |

---

## Item and attribute methods

### addItems

`game.itempiles.API.addItems(target, items, options)` ⇒ `Promise<array>`

Adds item to an actor, increasing item quantities if matches were found

**Returns**: `Promise<array>` - An array of objects, each containing the item that was added or updated, and the
quantity that was added

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| target | `Actor/TokenDocument/Token` |  | The target to add an item to |
| items | `Array` |  | An array of objects, with the key "item" being an item object or an Item class (the foundry class), with an optional key of "quantity" being the amount of the item to add |
| options | `object` |  | Options to pass to the function |
| [options.mergeSimilarItems] | `boolean` | `true` | Whether to merge similar items based on their name and type |
| [options.removeExistingActorItems] | `boolean` | `false` | Whether to remove the actor's existing items before adding the new ones |
| [options.interactionId] | `string/boolean` | `false` | The interaction ID of this action |

---

### removeItems

`game.itempiles.API.removeItems(target, items, options)` ⇒ `Promise<array>`

Subtracts the quantity of items on an actor. If the quantity of an item reaches 0, the item is removed from the actor.

**Returns**: `Promise<array>` - An array of objects, each containing the item that was removed or updated, the quantity
that was removed, and whether the item was deleted

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| target | `Actor/Token/TokenDocument` |  | The target to remove a items from |
| items | `Array` |  | An array of objects each containing the item id (key "_id") and the quantity to remove (key "quantity"), or Items (the foundry class) or strings of IDs to remove all quantities of |
| options | `object` |  | Options to pass to the function |
| [options.interactionId] | `string/boolean` | `false` | The interaction ID of this action |

---

### transferItems

`game.itempiles.API.transferItems(source, target, items, options)` ⇒ `Promise<object>`

Transfers items from the source to the target, subtracting a number of quantity from the source's item and adding it to
the target's item, deleting items from the source if their quantity reaches 0

**Returns**: `Promise<object>` - An array of objects, each containing the item that was added or updated, and the
quantity that was transferred

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| source | `Actor/Token/TokenDocument` |  | The source to transfer the items from |
| target | `Actor/Token/TokenDocument` |  | The target to transfer the items to |
| items | `Array` |  | An array of objects each containing the item id (key "_id") and the quantity to transfer (key "quantity"), or Items (the foundry class) or strings of IDs to transfer all quantities of |
| options | `object` |  | Options to pass to the function |
| [options.interactionId] | `string/boolean` | `false` | The interaction ID of this action |

---

### transferAllItems

`game.itempiles.API.transferAllItems(source, target, options)` ⇒ `Promise<array>`

Transfers all items between the source and the target.

**Returns**: `Promise<array>` - An array containing all the items that were transferred to the target

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| source | `Actor/Token/TokenDocument` |  | The actor to transfer all items from |
| target | `Actor/Token/TokenDocument` |  | The actor to receive all the items |
| options | `object` |  | Options to pass to the function |
| [options.itemFilters] | `Array/boolean` | `false` | Array of item types disallowed - will default to module settings if none provided |
| [options.interactionId] | `string/boolean` | `false` | The interaction ID of this action |

---

### setAttributes

`game.itempiles.API.setAttributes(target, attributes, options)` ⇒ `Promise<object>`

Sets attributes on an actor

**Returns**: `Promise<object>` - An array containing a key value pair of the attribute path and the quantity of that attribute that was set

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| target | `Actor/Token/TokenDocument` |  | The target whose attribute will have their quantity set |
| attributes | `object` |  | An object with each key being an attribute path, and its value being the quantity to set |
| options | `object` |  | Options to pass to the function |
| [options.interactionId] | `string/boolean` | `false` | The interaction ID of this action |

---

### addAttributes

`game.itempiles.API.addAttributes(target, attributes, options)` ⇒ `Promise<object>`

Adds attributes on an actor

**Returns**: `Promise<object>` - An array containing a key value pair of the attribute path and the quantity of that attribute that was added

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| target | `Actor/Token/TokenDocument` |  | The target whose attribute will have a set quantity added to it |
| attributes | `object` |  | An object with each key being an attribute path, and its value being the quantity to add |
| options | `object` |  | Options to pass to the function |
| [options.interactionId] | `string/boolean` | `false` | The interaction ID of this action |

---

### removeAttributes

`game.itempiles.API.removeAttributes(target, attributes, options)` ⇒ `Promise<object>`

Subtracts attributes on the target

**Returns**: `Promise<object>` - An array containing a key value pair of the attribute path and the quantity of that attribute that was removed

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| target | `Token/TokenDocument` |  | The target whose attributes will be subtracted from |
| attributes | `Array/object` |  | This can be either an array of attributes to subtract (to zero out a given attribute), or an object with each key being an attribute path, and its value being the quantity to subtract |
| options | `object` |  | Options to pass to the function |
| [options.interactionId] | `string/boolean` | `false` | The interaction ID of this action |

---

### transferAttributes

`game.itempiles.API.transferAttributes(source, target, attributes, options)` ⇒ `Promise<object>`

Transfers a set quantity of an attribute from a source to a target, removing it or subtracting from the source and adds it the target

**Returns**: `Promise<object>` - An object containing a key value pair of each attribute transferred, the key being the attribute path and its value being the quantity that was transferred

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| source | `Actor/Token/TokenDocument` |  | The source to transfer the attribute from |
| target | `Actor/Token/TokenDocument` |  | The target to transfer the attribute to |
| attributes | `Array/object` |  | This can be either an array of attributes to transfer (to transfer all of a given attribute), or an object with each key being an attribute path, and its value being the quantity to transfer |
| options | `object` |  | Options to pass to the function |
| [options.interactionId] | `string/boolean` | `false` | The interaction ID of this action |

---

### transferAllAttributes

`game.itempiles.API.transferAllAttributes(source, target, options)` ⇒ `Promise<object>`

Transfers all dynamic attributes from a source to a target, removing it or subtracting from the source and adding them to the target

**Returns**: `Promise<object>` - An object containing a key value pair of each attribute transferred, the key being the attribute path and its value being the quantity that was transferred

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| source | `Actor/Token/TokenDocument` |  | The source to transfer the attributes from |
| target | `Actor/Token/TokenDocument` |  | The target to transfer the attributes to |
| options | `object` |  | Options to pass to the function |
| [options.interactionId] | `string/boolean` | `false` | The interaction ID of this action |

---

### transferEverything

`game.itempiles.API.transferEverything(source, target, options)` ⇒ `Promise<object>`

Transfers all items and attributes between the source and the target.

**Returns**: `Promise<object>` - An object containing all items and attributes transferred to the target

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| source | `Actor/Token/TokenDocument` |  | The actor to transfer all items and attributes from |
| target | `Actor/Token/TokenDocument` |  | The actor to receive all the items and attributes |
| options | `object` |  | Options to pass to the function |
| [options.itemFilters] | `Array/boolean` | `false` | Array of item types disallowed - will default to module settings if none provided |
| [options.interactionId] | `string/boolean` | `false` | The ID of this interaction |

---

## Misc methods

### rollItemTable

`game.itempiles.API.rollItemTable(table, options)` ⇒ `Promise<Array<Item>>`

Rolls on a table of items and collates them to be able to be added to actors and such

**Returns**: `Promise<Array<Item>>` - An array of object containing the item data and their quantity

| Param | Type | Default | Description                                                             |
| --- | --- |---------|-------------------------------------------------------------------------|
| table | `string/RollTable` |         | The name, ID, UUID, or the table itself, or an array of such            |
| options | `object` |         | Options to pass to the function                                         |
| [options.timesToRoll] | `string/number` | `"1"`   | The number of times to roll on the tables, which can be a roll formula  |
| [options.resetTable] | `boolean` | `true`  | Whether to reset the table before rolling it                                                                        |
| [options.displayChat] | `boolean` | `false` | Whether to display the rolls to the chat |
| [options.rollData] | `object` | `{}`    | Data to inject into the roll formula                                    |
| [options.targetActor] | `Actor/string/boolean` | `false` | The target actor to add the items to, or the UUID of an actor           |
| [options.removeExistingActorItems] | `boolean` | `false` | Whether to clear the target actor's items before adding the ones rolled |

---

### getPricesForItem

`game.itempiles.API.getPricesForItem(item, options)` ⇒ `Array`

Get the prices array for a given item

**Returns**: `Array` - Array containing all the different purchase options for this item

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| item | `Item` |  | Item to get the price for |
| options | `object` |  | Options to pass to the function |
| [options.seller] | `Actor/boolean` | `false` | Actor that is selling the item |
| [options.buyer] | `Actor/boolean` | `false` | Actor that is buying the item |
| [options.quantity] | `number` | `1` | Quantity of item to buy |

---

### tradeItems

`game.itempiles.API.tradeItems(seller, buyer, items, [interactionId])` ⇒ `Promise<Object>`

Trades multiple items between one actor to another, and currencies and/or change is exchanged between them

**Returns**: `Promise<Object>` - The items that were created and the attributes that were changed

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| seller | `Actor/Token/TokenDocument` |  | The actor that is selling the item |
| buyer | `Actor/Token/TokenDocument` |  | The actor that is buying the item |
| items | `Array<Object<{item: Item/string, quantity: number, paymentIndex: number}>>` |  | An array of objects containing the item or the id of the                                                                                              item to be sold, the quantity to be sold, and the payment                                                                                              index to be used |
| [interactionId] | `string/boolean` | `false` | The ID of this interaction |

