import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../src/migrations.js", import.meta.url), "utf8");
// Run the actual migration code with synthetic Foundry documents and no canvas.
const program = source
  .replace(/^import .*;\r?\n/gm, "")
  .replace("export default async function", "async function");

function fixture(tokens) {
  const updates = [];
  const errors = [];
  const context = {
    CONSTANTS: {
      EFFECTS_FLAG: "flags.sequencer.effects",
      REMOVE_EFFECTS_FLAG: "flags.sequencer.-=effects",
    },
    game: {
      actors: [],
      scenes: [{
        id: "scene",
        tokens,
        async updateEmbeddedDocuments(type, data) {
          updates.push({ type, data: structuredClone(data) });
        },
      }],
    },
    foundry: {
      utils: {
        getProperty: (object, key) => key.split(".").reduce((value, part) => value?.[part], object),
        isNewerVersion: (a, b) => a.localeCompare(b, undefined, { numeric: true }) > 0,
      },
    },
    Actor: { async updateDocuments() { assert.fail("No world Actors in this fixture"); } },
    debug() {},
    custom_warning: (...args) => errors.push(args),
    console: { error: (error) => errors.push(error) },
    createJournalDatabase: async () => ({ update: async () => {} }),
    forceDeletionKeyWrapper: (update, key) => { update[key] = null; },
  };
  const migrations = vm.runInNewContext(`${program}\n({ runMigrations, migrate300: migrations["3.0.0"] });`, context);
  return { ...migrations, updates, errors };
}

test("startup migrations do not read Actors of unlinked tokens without effects", async () => {
  let actorReads = 0;
  const tokens = Array.from({ length: 100 }, (_, index) => ({
    id: `token-${index}`, isOwner: true, actorLink: false,
    get actor() { actorReads++; return { prototypeToken: {} }; },
  }));
  const run = fixture(tokens);
  await run.runMigrations();
  assert.equal(actorReads, 0);
  assert.deepEqual(run.updates, []);
  assert.deepEqual(run.errors, []);
});

test("3.0.0 migration retains linked tokens with outdated effects", async () => {
  let actorReads = 0;
  const token = {
    id: "linked", isOwner: true, actorLink: true,
    flags: { sequencer: { effects: [["effect", { flagVersion: "2.0.0" }]] } },
    get actor() { actorReads++; return { prototypeToken: {} }; },
  };
  const run = fixture([token]);
  await run.migrate300("3.0.0");
  assert.equal(actorReads, 1);
  assert.equal(run.updates.length, 1);
  assert.equal(run.updates[0].type, "Token");
  assert.equal(run.updates[0].data[0]._id, "linked");
  assert.equal(run.updates[0].data[0]["flags.sequencer.effects"][0][1].flagVersion, "3.0.0");
});

test("3.0.0 migration excludes unlinked, unowned, current, and missing-Actor cases", async () => {
  let excludedActorReads = 0;
  const tokens = [
    { id: "unlinked", isOwner: true, actorLink: false, get actor() { excludedActorReads++; return null; } },
    { id: "unowned", isOwner: false, actorLink: true, get actor() { excludedActorReads++; return null; } },
    { id: "current", isOwner: true, actorLink: true, actor: { prototypeToken: {} },
      flags: { sequencer: { effects: [["effect", { flagVersion: "3.0.0" }]] } } },
    { id: "missing", isOwner: true, actorLink: true, actor: null },
    { id: "throwing", isOwner: true, actorLink: true, get actor() { throw new Error("Unavailable"); } },
  ];
  const run = fixture(tokens);
  await run.migrate300("3.0.0");
  assert.deepEqual(run.updates, []);
  assert.equal(excludedActorReads, 0);
});

test("3.0.0 migration still checks linked Actor prototype effects", async () => {
  const token = {
    id: "prototype", isOwner: true, actorLink: true,
    flags: { sequencer: { effects: [] } },
    actor: { prototypeToken: { flags: { sequencer: { effects: [["effect", { flagVersion: "2.0.0" }]] } } } },
  };
  const run = fixture([token]);
  await run.migrate300("3.0.0");
  assert.equal(run.updates.length, 1);
  assert.equal(run.updates[0].data[0]._id, "prototype");
});
