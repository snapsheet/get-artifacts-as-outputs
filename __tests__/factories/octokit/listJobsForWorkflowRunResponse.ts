import { faker } from "@faker-js/faker";
import { ResponseFactory } from "../response";
import { WorkflowContentFactory } from "../workflowContent";
import { WorkflowJobFactory } from "./workflowJob";
import { JobInfo } from "../../../src/jobInfo";

export class ListJobsForWorkflowRunFactory extends ResponseFactory {
  static generate(
    mocks?: {
      status?: number;
      url?: string;
      headers?: unknown;
      data?: unknown;
    },
    orgName?: string,
    repoName?: string
  ) {
    const workflowContent = WorkflowContentFactory.generate();

    const run_id = faker.number.int({ min: 1000000000, max: 2000000000 });
    const head_branch = "DNM-TEST-SRE-2250";
    const head_sha = faker.string.hexadecimal({ length: 40, casing: "lower" });
    const run_attempt = faker.number.int({ min: 1, max: 20 });

    const job_params = {
      run_id,
      workflow_name: workflowContent["run-name"],
      head_branch,
      run_url: `https://api.github.com/repos/${orgName}/${repoName}/actions/runs/${run_id}`,
      head_sha,
      run_attempt
    };

    const jobs: JobInfo[] = [];

    // for each workflow config, simulate jobs
    Object.keys(workflowContent.jobs).forEach((jobName) => {
      const jobDefinition = workflowContent.jobs[jobName];
      // simulate matrix sections
      if (jobDefinition?.strategy?.matrix) {
        ["stack1", "stack2", "stack3", "stack4", "stack5"].forEach((matrixName) => {
          const job_id = faker.number.int({ min: 1000000000, max: 2000000000 });
          jobs.push(
            WorkflowJobFactory.generate(
              {
                ...job_params,
                id: job_id,
                url: `https://api.github.com/repos/${orgName}/${repoName}/actions/jobs/${job_id}`,
                html_url: `https://github.com/${orgName}/${repoName}/actions/runs/${run_id}/job/${job_id}`,
                name: `${jobDefinition.name} (${matrixName})`,
                check_run_url: `https://api.github.com/repos/${orgName}/${repoName}/check-runs/${job_id}`,
              }
            )
          );
        });
      } else {
        const job_id = faker.number.int({ min: 1000000000, max: 2000000000 });
        jobs.push(
          WorkflowJobFactory.generate(
            {
              ...job_params,
              id: job_id,
              url: `https://api.github.com/repos/${orgName}/${repoName}/actions/jobs/${job_id}`,
              html_url: `https://github.com/${orgName}/${repoName}/actions/runs/${run_id}/job/${job_id}`,
              name: "default_setup",
              check_run_url: `https://api.github.com/repos/${orgName}/${repoName}/check-runs/${job_id}`,
            }
          )
        );
      }
    });

    const data = { total_count: jobs.length, jobs };

    return {
      ...ResponseFactory.generate(mocks),
      data,
      json: async (): Promise<unknown> => data
    };
  }
}
