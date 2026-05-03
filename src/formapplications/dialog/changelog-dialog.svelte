<script>
	import { marked } from "marked";
	import changelogText from "../../../changelog.md?raw";

	const GITHUB_CHANGELOG_URL =
		"https://github.com/fantasycalendar/FoundryVTT-Sequencer/blob/master/changelog.md";
	const PATREON_URL = "https://patreon.com/cw/fantasycomputerworks";

	function parseChangelog(raw) {
		const firstHeader = raw.search(/^# Version /m);
		const body = firstHeader >= 0 ? raw.slice(firstHeader) : raw;

		const chunks = body.split(/^(?=# Version )/m).filter((c) => c.trim().length);

		return chunks.map((chunk) => {
			const headerMatch = chunk.match(/^# Version\s+(.+?)\s*$/m);
			const version = headerMatch ? headerMatch[1].trim() : "Unknown";
			const content = chunk.replace(/^# Version.*$/m, "").trim();
			return {
				version,
				html: marked.parse(content),
			};
		});
	}

	let error = $state(null);
	let entries = $state([]);

	try {
		entries = parseChangelog(changelogText);
	} catch (e) {
		error = e?.message ?? String(e);
	}

	const loading = false;
</script>

<div class="sequencer-changelog">

	<header class="sequencer-changelog-header">
		<a
			class="sequencer-changelog-header-link"
			href={GITHUB_CHANGELOG_URL}
			target="_blank"
			rel="noopener noreferrer"
			title="View the changelog on GitHub"
		>
			<i class="fab fa-github"></i> View on GitHub
		</a>
		<a
			class="sequencer-changelog-header-link sequencer-changelog-header-patreon"
			href={PATREON_URL}
			target="_blank"
			rel="noopener noreferrer"
			title="Support Sequencer development on Patreon"
		>
			<i class="fab fa-patreon"></i> Support Sequencer
		</a>
	</header>

	<div class="sequencer-changelog-content">
		{#if loading}
			<div class="sequencer-changelog-status">
				<i class="fas fa-spinner fa-spin"></i> Loading changelog...
			</div>
		{:else if error}
			<div class="sequencer-changelog-status sequencer-changelog-error">
				<p>Failed to load changelog: {error}</p>
				<p>
					<a href={GITHUB_CHANGELOG_URL} target="_blank" rel="noopener noreferrer">
						View on GitHub
					</a>
				</p>
			</div>
		{:else if entries.length === 0}
			<div class="sequencer-changelog-status">No changelog entries found.</div>
		{:else}
			<div class="sequencer-changelog-entries">
				{#each entries as entry, index (entry.version)}
					<details class="sequencer-changelog-entry" open={index === 0}>
						<summary>
							<span class="sequencer-changelog-version">v{entry.version}</span>
							{#if index === 0}
								<span class="sequencer-changelog-latest-badge">Latest</span>
							{/if}
							<i class="fas fa-chevron-down sequencer-changelog-chevron"></i>
						</summary>
						<div class="sequencer-changelog-body">
							{@html entry.html}
						</div>
					</details>
				{/each}
			</div>
		{/if}
	</div>

</div>
