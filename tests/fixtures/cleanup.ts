/** Run disposable-record cleanup callbacks in their declared dependency order. */
export async function cleanupInDependencyOrder(
  ...steps: Array<() => Promise<unknown>>
) {
  for (const cleanupStep of steps) {
    await cleanupStep();
  }
}
