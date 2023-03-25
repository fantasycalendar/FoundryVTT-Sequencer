<script>
	import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
  import { writable } from "svelte/store";

  export let setting;
  export let lock;
  export let inverse = false;

  const store = setting.store;
  const isLocked = lock ? lock.store : writable(inverse);
</script>

<label style="text-align: right;">{localize(setting.label)}</label>
<input type="number" disabled={$isLocked !== inverse} bind:value={$store} on:change={() => { if($store === null) $store = 0; }}/>
