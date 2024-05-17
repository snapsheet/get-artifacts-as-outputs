import * as core from "@actions/core";
import { Consolidator } from "./consolidator";

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export default async function run(): Promise<void> {
  try {
    const consolidator = new Consolidator();
    await consolidator.run();
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();
