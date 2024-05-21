import { faker } from "@faker-js/faker";

interface JobStep {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
  started_at: Date;
  completed_at: Date;
}

export interface WorkflowJob {
  id: number;
  run_id: number;
  workflow_name: string;
  head_branch: string;
  run_url: string;
  run_attempt: number;
  node_id: string;
  head_sha: string;
  url: string;
  html_url: string;
  status: string;
  conclusion: string | null;
  created_at: Date;
  started_at: Date;
  completed_at: Date | null;
  name: string;
  steps: JobStep[];
  check_run_url: string;
  labels: string[];
  runner_id: number;
  runner_name: string;
  runner_group_id: number;
  runner_group_name: string;
}

export class WorkflowJobFactory {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static generate(overrides?: any, orgName?: string, repoName?: string) {
    const initialValues = this.defaults();

    return {
      ...initialValues,
      workflow_name: "default workflow",
      run_url: `https://api.github.com/repos/${orgName}/${repoName}/actions/runs/${initialValues.run_id}`,
      url: `https://api.github.com/repos/${orgName}/${repoName}/actions/jobs/${initialValues.id}`,
      html_url: `https://github.com/${orgName}/${repoName}/actions/runs/${initialValues.run_id}/job/${initialValues.id}`,
      check_run_url: `https://api.github.com/repos/${orgName}/${repoName}/check-runs/${initialValues.id}`,
      ...overrides
    };
  }

  static defaults(): Partial<WorkflowJob> {
    return {
      id: faker.number.int({
        min: 20000000000,
        max: 30000000000
      }),
      run_id: faker.number.int({
        min: 1000000000,
        max: 2000000000
      }),
      head_branch: "DNM-TEST-SRE-2250",
      run_attempt: 1,
      node_id: faker.string.alphanumeric({ length: 28 }),
      head_sha: faker.string.hexadecimal({length: 40, casing: "lower"}),
      status: "completed",
      conclusion: "success",
      created_at: faker.date.soon(),
      started_at: faker.date.soon(),
      completed_at: faker.date.soon(),
      name: "default",
      steps: [
        {
          name: "Set up a job",
          status: "completed",
          conclusion: "success",
          number: 1,
          started_at: faker.date.soon(),
          completed_at: faker.date.soon()
        },
        {
          name: "Do a Thing",
          status: "completed",
          conclusion: "success",
          number: 2,
          started_at: faker.date.soon(),
          completed_at: faker.date.soon()
        },
        {
          name: "Post Do a Thing",
          status: "completed",
          conclusion: "success",
          number: 4,
          started_at: faker.date.soon(),
          completed_at: faker.date.soon()
        },
        {
          name: "Complete job",
          status: "completed",
          conclusion: "success",
          number: 5,
          started_at: faker.date.soon(),
          completed_at: faker.date.soon()
        }
      ],
      labels: ["ubuntu-latest"],
      // empty if this is a rerun
      runner_id: faker.number.int({min: 1, max: 1000}),
      runner_name: "GitHub Actions 256",
      runner_group_id: faker.number.int({min: 1, max: 10}),
      runner_group_name: "GitHub Actions"
    };
  }
}
