<script>

	let { foundryApp, component } = $props();

</script>

<div class="standard-form">
	<section>
		<svelte:component this={component}/>
	</section>
	<footer class="form-footer">
		<button onclick={() => foundryApp.close()} type="submit"><i class="fas fa-check"></i> Okay</button>
	</footer>
</div>
