import { get, writable } from "svelte/store";
import CONSTANTS from "../constants.js";

const SequenceManager = {
  VisibleEffects: writable({}),
  RunningSounds: writable({}),
	RunningMotions: writable({}),
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
  SequenceManager.RunningSounds.update((sounds) => {
    sounds[id] = data;
    return sounds;
  });
};

SequenceManager.RunningSounds.delete = (id) => {
  SequenceManager.RunningSounds.update((sounds) => {
    delete sounds[id];
    return sounds;
  });
};

SequenceManager.RunningSounds.values = () => {
  return Object.values(get(SequenceManager.RunningSounds));
};

SequenceManager.RunningSounds.keys = () => {
  return Object.keys(get(SequenceManager.RunningSounds));
};

/* ------------------ Motions ------------------ */
SequenceManager.RunningMotions.get = (id) => {
	return get(SequenceManager.RunningMotions)[id];
};

SequenceManager.RunningMotions.add = (id, data) => {
	SequenceManager.RunningMotions.update((motions) => {
		motions[id] = data;
		return motions;
	});
};

SequenceManager.RunningMotions.delete = (id) => {
	SequenceManager.RunningMotions.update((motions) => {
		delete motions[id];
		return motions;
	});
};

SequenceManager.RunningMotions.values = () => {
	return Object.values(get(SequenceManager.RunningMotions));
};

SequenceManager.RunningMotions.keys = () => {
	return Object.keys(get(SequenceManager.RunningMotions));
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
        sequence.status === CONSTANTS.STATUS.COMPLETE ||
        sequence.status === CONSTANTS.STATUS.ABORTED
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
