import { Consolidator } from "./consolidator";

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export default async function run(): Promise<void> {
  const consolidator = new Consolidator();
  await consolidator.run();
}

run();
