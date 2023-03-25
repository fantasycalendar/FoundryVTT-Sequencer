<script>
  import { localize } from '@typhonjs-fvtt/runtime/svelte/helper';

  export let activeTab;
  export let tabs;
  export let underscore = false;
  export let separateElements = false;

</script>

<nav class="tabs" data-group="primary" style={$$props.style}>
	{#each tabs.filter(tab => !tab.hidden) as tab, index (tab.value)}
		{#if separateElements && index > 0}
			<div style="border-right: 1px solid rgba(0,0,0,0.5); margin: 0 10px;"></div>
		{/if}
		<div on:click={() => { activeTab = tab.value}}
				 class="item item-piles-flexrow item-piles-clickable-link"
				 class:underscore={underscore}
				 class:active={activeTab === tab.value}
				 data-tab="rest">
			{#if tab.icon} <i class="icon {tab.icon}"></i> {/if}
			{localize(tab.label)}
		</div>
	{/each}
</nav>


<style lang="scss">

  .tabs {
		flex: 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.25);
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
  }

  .item {
    display: flex;
    flex-direction: row;
    align-items: center;
    border-bottom: 2px solid transparent;

    &.active {
      text-shadow: 0 0 10px rgba(255,0,0,1);

      &.underscore {
        text-shadow: none;
        border-bottom: 2px solid rgba(125, 0, 0, 0.5);
      }
    }
  }

  .icon {
    margin-right: 0.25rem;
  }

</style>
