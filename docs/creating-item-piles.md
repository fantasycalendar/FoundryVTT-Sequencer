# Creating item piles

## How does Item Piles work?

When you first drag out an item onto the scene, the module will create the `Default Item Pile` actor in your sidebar.

**Note:** This actor acts as the default behavior of the all item piles created by dragging and dropping items onto scenes.

As a GM, you can configure the default item pile, but keep in mind that the default item pile is designed to be
temporary and used by players, so modifying it comes with risks and unintended behavior. If you want to experiment with
different item pile setups, duplicate the default item pile, and then configure it by opening the actor sheet and
clicking on "Item Pile" in the sheet's the header bar.

![Dropping an item in the scene](images/wiki-drop.jpg)

### Avoid changing the default item pile

![Default Item Pile](images/wiki-default.jpg)

### Duplicate and change copy instead

![Duplicate Item Pile](images/wiki-copy.jpg)

## Adding items to existing item piles

If you drag and drop an item on an existing item pile, you will be prompted whether you want to add it to that pile.
Again, holding **Left Alt** before drag and dropping the item will circumvent the dialog and add one of that item to the
item pile.

You can also open the item pile and drag and drop items into the interface.

![Duplicate Item Pile](images/wiki-drop-into.jpg)

*Chest is
from [Forgotten Adventures](https://www.forgotten-adventures.net/product/map-making/assets/table-clutter-pack-08/)*

## Inspecting pile as character

If you are a player, you can inspect piles by double-clicking on them. You need to have a token next to the item pile in
order to inspect it, unless the item pile configured has a larger interaction distance (see documentation).

As a GM, you can inspect any pile by first selecting a token on the scene, then holding **Left Control** and
double-clicking on the item pile. This way you inspect **as** that token, which means any items you take from the pile
will be added to that character's inventory.

![Inspecting as player 2](images/wiki-inspect-as.png)

*Chest is
from [Forgotten Adventures](https://www.forgotten-adventures.net/product/map-making/assets/table-clutter-pack-08/)*

## Modifying default sharing behavior

The default item pile has been set up to best suit common table rules, where items are relatively free for all, whilst
currencies _must_ be split with the rest of the party. All of this can be configured through the item piles
configuration interface. By clicking on the default item pile in the right-hand actor sidebar, you can then click on
the **Configure** button in the header to configure its settings.

The image below shows the various options available to change about the default behavior of item piles:

![The sharing configuration for the default item pile](images/item-piles-sharing-config.png)

