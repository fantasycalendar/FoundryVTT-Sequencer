import { get, writable } from "svelte/store";
import CONSTANTS from "../constants.js";

const SequenceManager = {
  VisibleEffects: writable({}),
  RunningSounds: writable({}),
  RunningSequences: writable({}),
};

/* ------------------ Effects ------------------ */
SequenceManager.VisibleEffects.get = (id) => {
  return get(SequenceManager.VisibleEffects)[id];
};

SequenceManager.VisibleEffects.add = (id, data) => {
  SequenceManager.VisibleEffects.update((effects) => {
    effects[id] = data;
    return effects;
  });
};

SequenceManager.VisibleEffects.delete = (id) => {
  SequenceManager.VisibleEffects.update((effects) => {
    delete effects[id];
    return effects;
  });
};

SequenceManager.VisibleEffects.values = () => {
  return Object.values(get(SequenceManager.VisibleEffects));
};

/* ------------------ Sounds ------------------ */
SequenceManager.RunningSounds.get = (id) => {
  return get(SequenceManager.RunningSounds)[id];
};

SequenceManager.RunningSounds.add = (id, data) => {
  SequenceManager.RunningSounds.update((effects) => {
    effects[id] = data;
    return effects;
  });
};

SequenceManager.RunningSounds.delete = (id) => {
  SequenceManager.RunningSounds.update((effects) => {
    delete effects[id];
    return effects;
  });
};

SequenceManager.RunningSounds.values = () => {
  return Object.values(get(SequenceManager.RunningSounds));
};

SequenceManager.RunningSounds.keys = () => {
  return Object.keys(get(SequenceManager.RunningSounds));
};

/* ----------------- Sequences ------------------ */
SequenceManager.RunningSequences.get = (id) => {
  return get(SequenceManager.RunningSequences)[id];
};

SequenceManager.RunningSequences.add = (id, sequence) => {
  SequenceManager.RunningSequences.update((sequences) => {
    sequences[id] = sequence;
    return sequences;
  });
};

SequenceManager.RunningSequences.delete = (id) => {
  SequenceManager.RunningSequences.update((sequences) => {
    delete sequences[id];
    return sequences;
  });
};

SequenceManager.RunningSequences.clearFinishedSequences = () => {
  SequenceManager.RunningSequences.update((sequences) => {
    for (const sequence of Object.values(sequences)) {
      if (
        get(sequence.status) === CONSTANTS.STATUS.COMPLETE ||
        get(sequence.status) === CONSTANTS.STATUS.ABORTED
      ) {
        delete sequences[sequence.id];
      }
    }
    return sequences;
  });
};

SequenceManager.RunningSequences.stopAll = () => {
  SequenceManager.RunningSequences.update((sequences) => {
    for (const sequence of Object.values(sequences)) {
      sequence._abort();
    }
    return sequences;
  });
};

SequenceManager.RunningSequences.values = () => {
  return Object.values(get(SequenceManager.RunningSequences));
};

export default SequenceManager;
