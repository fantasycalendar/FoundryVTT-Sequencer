<script>

  import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
  import { localize } from '@typhonjs-fvtt/runtime/svelte/helper';
  import { getContext } from "svelte";
  import HowTo from "./HowTo.svelte";
  import Tabs from "./Tabs.svelte";
  import EffectsList from "./EffectsList.svelte";
  import Player from "./Player.svelte";

  const { application } = getContext("#external");

  export let elementRoot;

  let tabs = [
    { value: "player", label: localize("SEQUENCER.Player.Title"), icon: "fas fa-play-circle", component: Player },
    { value: "manager", label: localize("SEQUENCER.Manager.Title"), icon: "fas fa-film", component: EffectsList },
    { value: "howto", label: localize("SEQUENCER.HowTo.Title"), icon: "fas fa-chalkboard-teacher", component: HowTo },
  ];

  let activeTab = application.options.tab ?? "manager";
  $: component = tabs.find(tab => tab.value === activeTab).component;

</script>

<svelte:options accessors={true}/>

<ApplicationShell bind:elementRoot>

	<Tabs bind:activeTab {tabs}/>

	<svelte:component this={component}/>

</ApplicationShell>
