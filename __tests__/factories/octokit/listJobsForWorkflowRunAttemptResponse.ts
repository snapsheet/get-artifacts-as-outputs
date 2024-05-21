// import { faker } from "@faker-js/faker";
import { ResponseFactory } from "../response";

export class ListJobsForWorkflowRunAttemptFactory extends ResponseFactory {
  static generate(mocks?: {
    status?: number;
    url?: string;
    headers?: unknown;
    data?: unknown;
  }) {
    const data = {};
    return {
      ...ResponseFactory.generate(mocks),
      data,
      json: async (): Promise<unknown> => data
    };
  }
}
