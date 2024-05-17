import { faker } from "@faker-js/faker";
import { PayloadFactory } from "./context/payload";

export class ContextFactory {
  static generate() {
    const payload = PayloadFactory.generate();

    return {
      payload,
      eventName: "workflow_dispatch",
      sha: "3b530387a3caf0e5caff425210cd9a99955bcb75",
      ref: payload.ref,
      workflow: "Run a CDKTF Diff",
      action: "previous_jobs",
      actor: payload.sender.login,
      job: "generate_output",
      runNumber: faker.number.int({ min: 1, max: 100 }),
      runId: faker.number.int(),
      apiUrl: "https://api.github.com",
      serverUrl: "https://github.com",
      graphqlUrl: "https://api.github.com/graphql",
      issue: { owner: "", repo: "", number: 1 },
      repo: { owner: "", repo: "" }
    };
  }
}
