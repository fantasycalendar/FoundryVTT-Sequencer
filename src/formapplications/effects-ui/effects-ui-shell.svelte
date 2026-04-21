<script>

  let localize = game.i18n.localize.bind(game.i18n);
  import HowTo from "./HowTo.svelte";
  import Tabs from "./Tabs.svelte";
  import Manager from "./Manager.svelte";
  import Player from "./Player.svelte";
  import Sequences from "./Sequences.svelte";

  let { tab } = $props();

  let tabs = [
    { value: "player", label: localize("SEQUENCER.Player.Title"), icon: "fas fa-play-circle", component: Player },
    { value: "manager", label: localize("SEQUENCER.Manager.Title"), icon: "fas fa-film", component: Manager },
    { value: "sequences", label: localize("SEQUENCER.Sequences.Title"), icon: "fas fa-play", component: Sequences },
    { value: "howto", label: localize("SEQUENCER.HowTo.Title"), icon: "fas fa-chalkboard-teacher", component: HowTo },
  ];

  let activeTab = $state(tab ?? "manager");
  let component = $state(tabs[0].component);
	$effect(() => {
		component = tabs.find(t => t.value === activeTab)?.component;
	})

</script>

<svelte:options accessors={true}/>

<div>

	<Tabs bind:activeTab {tabs}/>

	<svelte:component this={component}/>

</div>
