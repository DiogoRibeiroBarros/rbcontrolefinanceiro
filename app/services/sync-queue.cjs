'use strict';

/** Serialize writes arriving from all paired devices without rejecting concurrent clients. */
function createSyncWriteQueue() {
  let tail = Promise.resolve();
  let pending = 0;
  let active = false;
  return {
    enqueue(task) {
      pending += 1;
      const run = tail.catch(() => {}).then(async () => {
        pending -= 1;
        active = true;
        try { return await task(); }
        finally { active = false; }
      });
      tail = run.catch(() => {});
      return run;
    },
    status() { return { pending, active }; }
  };
}

module.exports = { createSyncWriteQueue };
