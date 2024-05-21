import { faker } from "@faker-js/faker";
import { ResponseFactory } from "../response";

export class ListWorkflowRunArtifactResponseFactory extends ResponseFactory {
  static generate(mocks?: {
    status?: number;
    url?: string;
    headers?: unknown;
    data?: unknown;
  }) {
    const orgName = faker.word.noun().toLowerCase();
    const repoName = faker.word.noun().toLowerCase();
    const id = faker.number.int({ min: 1000000000, max: 2000000000 });
    const workflow_run_id = faker.number.int({
      min: 1000000000,
      max: 2000000000
    });
    const repository_id = faker.number.int({ min: 10000000, max: 20000000 });
    const head_branch = "DNM-TEST-SRE-2250";
    const head_sha = "c837361b2e8c687d001bff4e4f0eab3f2f452d94";
    const total_count = faker.number.int({ min: 5, max: 10 });
    const artifacts: unknown[] = [];
    for (let i = 0; i < total_count; i++) {
      artifacts.push({
        id,
        node_id: faker.string.alphanumeric({ length: 28 }),
        name: "24834938703",
        size_in_bytes: 354,
        url: `https://api.github.com/repos/${orgName}/${repoName}/actions/artifacts/${id}`,
        archive_download_url: `https://api.github.com/repos/${orgName}/${repoName}/actions/artifacts/${id}/zip`,
        expired: false,
        created_at: faker.date.soon().toISOString(),
        updated_at: faker.date.soon().toISOString(),
        expires_at: faker.date.soon().toISOString(),
        workflow_run: {
          id: workflow_run_id,
          repository_id,
          head_repository_id: repository_id,
          head_branch,
          head_sha
        }
      });
    }
    const data = { total_count, artifacts, ...(mocks?.data || {}) };

    return {
      ...ResponseFactory.generate(mocks),
      data,
      json: async (): Promise<unknown> => data
    };
  }
}
