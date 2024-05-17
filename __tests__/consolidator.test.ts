import { ContextFactory } from "./factories/github/context";
import { Consolidator } from "../src/consolidator";
import { GetContentResponseFactory } from "./factories/octokit/getContentResponse";
import { ResponseFactory } from "./factories/response";
import { ListWorkflowRunArtifactResponseFactory } from "./factories/octokit/listWorkflowRunArtifactResponse";
import { WorkflowContentFactory } from "./factories/workflowContent";
import { ListJobsForWorkflowRunFactory } from "./factories/octokit/listJobsForWorkflowRunResponse";
import { WorkflowJobFactory } from "./factories/octokit/workflowJob";
import { DownloadArtifactResponseFactory } from "./factories/octokit/downloadArtifactResponse";
import core from "@actions/core";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import fs from "fs";
import path from "path";
import unzipper from "unzipper";
import { ArtifactInfo } from "../src/artifactInfo";
import { JobInfo } from "../src/jobInfo";

/**
 * Mock the `core` logging functions so they don't show in test cases.
 */
jest.mock<typeof import("@actions/core")>("@actions/core", () => {
  const originalCore =
    jest.requireActual<typeof import("@actions/core")>("@actions/core");
  return {
    ...originalCore,
    debug: jest.fn(),
    info: jest.fn(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getInput: jest.fn((_) => "outputFileName.txt")
  };
});

const workflowContent = WorkflowContentFactory.generate();

/**
 * Mock the `github` module environment data and API endpoints for test cases.
 */
jest.mock<typeof import("@actions/github")>("@actions/github", () => {
  const originalGithub =
    jest.requireActual<typeof import("@actions/github")>("@actions/github");

  return {
    ...originalGithub,
    context: ContextFactory.generate(),
    getOctokit: jest.fn(() => {
      return originalGithub.getOctokit("no_token", {
        throttle: { enabled: false },
        request: {
          fetch: jest.fn(async (endpoint) => {
            let response: ResponseFactory | null = null;

            if (/\/contents\//.test(endpoint)) {
              response = GetContentResponseFactory.generate({
                url: endpoint,
                data: {
                  content: Buffer.from(
                    JSON.stringify(workflowContent),
                    "utf-8"
                  ).toString("base64")
                }
              });
            } else if (/\/artifacts$/.test(endpoint)) {
              response = ListWorkflowRunArtifactResponseFactory.generate({
                url: endpoint
              });
            } else if (/\/actions\/runs\/\d+\/jobs$/.test(endpoint)) {
              response = ListJobsForWorkflowRunFactory.generate({
                url: endpoint
              });
            } else if (
              /\/actions\/runs\/\d+\/attempts\/\d+\/jobs$/.test(endpoint)
            ) {
              response = ListJobsForWorkflowRunFactory.generate({
                url: endpoint
              });
            } else if (
              /\/actions\/artifacts\/\d+\/zip$/.test(endpoint)
            ) {
              response = DownloadArtifactResponseFactory.generate({
                url: endpoint
              });
            }

            return response;
          })
        }
      });
    })
  };
});

/**
 * Wrap the Consolidator so it will use other mocked attributes when we import it.
 */
jest.mock<typeof import("../src/consolidator")>("../src/consolidator", () => {
  // Require the original module to not be mocked...
  const originalConsolidator = jest.requireActual<
    typeof import("../src/consolidator")
  >("../src/consolidator");
  return {
    ...originalConsolidator
  };
});

/**
 * Mock the `fs` module method that writes to files.
 */
jest.mock<typeof import("fs")>("fs", () => {
  const originalFs = jest.requireActual<typeof import("fs")>("fs");

  return {
    ...originalFs,
    createWriteStream: jest.fn(() => {
      return originalFs.createWriteStream("/dev/null");
    })
  };
});

describe("Consolidator", () => {
  let subject: Consolidator;
  let mockAdapter: MockAdapter;

  beforeAll(() => {
    mockAdapter = new MockAdapter(axios);
  });

  beforeEach(() => {
    subject = new Consolidator();
  });

  afterEach(() => {
    mockAdapter.reset();
  });

  it("should be defined", () => {
    expect(subject).toBeDefined();
  });

  describe("commonQueryParams", () => {
    it("shows expected common query params", async () => {
      expect(subject.commonQueryParams()).toEqual({
        owner: subject.context.payload.organization.login,
        repo: subject.context.payload.repository?.name
      });
    });
  });

  describe("getWorkflowSchema", () => {
    it("queries and parses the workflow file from the content API", async () => {
      expect(await subject.getWorkflowSchema()).toEqual(workflowContent);
    });
  });

  describe("getLastRanWorkflowJobs", () => {
    let jobs: JobInfo[];
    let originalJobs: JobInfo[];
    let skippedJobs: JobInfo[];
    let methodSpy: jest.SpyInstance;
    
    beforeEach(() => {
      const mockJobsResponse = ListJobsForWorkflowRunFactory.generate();
      jobs = mockJobsResponse.data.jobs as JobInfo[];
      originalJobs = jobs.map((j) => { return {...j}; }); // duplicate for test assertions
      skippedJobs = jobs.slice(-5);
      const origSkippedInfo = skippedJobs.map((j) => { return {...j}; });

      // Set 5 of the jobs attributes to look like a rerun occurred.
      skippedJobs.forEach((job) => {
        job.runner_id = 0;
        job.runner_name = "";
        job.runner_group_id = 0;
        job.runner_group_name = "";
      });
      methodSpy = jest.spyOn(subject, "getRelevantWorkflowJobs");
      methodSpy.mockImplementation(async (jobName: string, runId: number, runAttempt?: number | null) => {
        jobName; runId; runAttempt; // for validation...
        
        return origSkippedInfo;
      });
    });

    it("returns the job set that was passed in and makes no queries if no jobs were skipped", async () => {
      // set original values back for skipped jobs
      skippedJobs.forEach((job) => {
        const originalJob = originalJobs.find((oj) => oj.id = job.id);
        job.runner_id = originalJob?.runner_id || 5; // adding 5/"something" so that TypeScript checks pass
        job.runner_name = originalJob?.runner_name || "something";
        job.runner_group_id = originalJob?.runner_group_id || 5;
        job.runner_group_name = originalJob?.runner_group_name || "something";
      });

      const result = await subject.getLastRanWorkflowJobs("doesnt_matter", jobs);
      expect(result).toEqual(jobs);
      expect(methodSpy).not.toHaveBeenCalled();
    });

    it("retries when it finds jobs with run_attempt of zero", async () => {
      const result = await subject.getLastRanWorkflowJobs("doesnt_matter", jobs);
      expect(result).toEqual(originalJobs);
      const runAttempt = (originalJobs[0].run_attempt || 1);
      expect(methodSpy).toHaveBeenCalledWith("doesnt_matter", subject.context.runId, runAttempt - 1);
    });

    it("returns empty results when passed jobs are empty", async () => {
      const result = await subject.getLastRanWorkflowJobs("doesnt_matter", []);
      expect(result).toEqual([]);
    });

    it("uses default of one if there is no run_attempt attribute, making no additional queries", async () => {
      jobs.forEach((job) => delete job.run_attempt);
      await subject.getLastRanWorkflowJobs("doesnt_matter", jobs);
      expect(methodSpy).not.toHaveBeenCalled();
    });
  });

  describe("getRelevantWorkflowJobs", () => {
    it("awaits the query and calls the method to filter results", async () => {
      const spy1 = jest.spyOn(subject, "getWorkflowJobs").mockImplementation();
      const spy2 = jest
        .spyOn(subject, "filterForRelevantJobDetails")
        .mockImplementation();

      await subject.getRelevantWorkflowJobs("someJob", 1234, 3);

      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
    });
  });

  describe("getWorkflowJobs", () => {
    it("fetches workflow jobs if there were no reruns", async () => {
      expect((await subject.getWorkflowJobs(12)).length).not.toEqual(0);
    });

    it("fetches workflow jobs if there were reruns", async () => {
      expect((await subject.getWorkflowJobs(12, 3)).length).not.toEqual(0);
    });
  });

  describe("getRunArtifacts", () => {
    it("attemptes to fetch and load artifacts", async () => {
      expect((await subject.getRunArtifacts()).length).not.toEqual(0);
    });
  });

  describe("filterForRelevantJobDetails", () => {
    beforeEach(() => {
      subject.schema = {
        jobs: {
          some_job_name: {
            name: "Some Verbose Job Name"
          }
        }
      };
    });

    it("finds jobs that start with the job name", async () => {
      const results = subject.filterForRelevantJobDetails("some_job_name", [
        WorkflowJobFactory.generate({
          name: "Some Verbose Job Name (matrix1)"
        }),
        WorkflowJobFactory.generate({
          name: "Some Verbose Job Name (matrix2)"
        }),
        WorkflowJobFactory.generate({
          name: "Some Verbose Job Name (matrix3)"
        }),
        WorkflowJobFactory.generate({
          name: "Some Verbose Job Name (matrix4)"
        }),
        WorkflowJobFactory.generate({
          name: "Some Verbose Job Name (matrix5)"
        }),
        WorkflowJobFactory.generate({ name: "Some other unrelated job" }),
        WorkflowJobFactory.generate({ name: "another unrelated job" })
      ]);
      expect(results.length).toEqual(5);
    });

    it("does not find jobs that start with substrings", async () => {
      const results = subject.filterForRelevantJobDetails("some_job_name", [
        WorkflowJobFactory.generate({
          name: "Some Verbose Job Name (matrix1)"
        }),
        WorkflowJobFactory.generate({
          name: "Some Verbose Job Name (matrix2)"
        }),
        WorkflowJobFactory.generate({
          name: "Some Verbose Job Name (matrix3)"
        }),
        WorkflowJobFactory.generate({
          name: "Some Verbose Job Name (matrix4)"
        }),
        WorkflowJobFactory.generate({
          name: "Some Verbose Job Name (matrix5)"
        }),
        WorkflowJobFactory.generate({ name: "Some other unrelated job" }),
        WorkflowJobFactory.generate({ name: "another unrelated job" }),
        WorkflowJobFactory.generate({
          name: "Some Verbose Job Name But Not The Same (matrix1)"
        }),
        WorkflowJobFactory.generate({
          name: "Some Verbose Job Name But Not The Same (matrix2)"
        }),
        WorkflowJobFactory.generate({
          name: "Some Verbose Job Name But Not The Same (matrix3)"
        })
      ]);
      expect(results.length).toEqual(5);
    });
  });

  describe("getJobOutputs", () => {
    let jobs: JobInfo[];
    let artifacts: ArtifactInfo[];
    
    beforeEach(() => {
      const mockArtifactResponse = ListWorkflowRunArtifactResponseFactory.generate();
      artifacts = mockArtifactResponse.data.artifacts as ArtifactInfo[];
      const mockJobsResponse = ListJobsForWorkflowRunFactory.generate();
      jobs = mockJobsResponse.data.jobs as JobInfo[];

      // Set 5 of the artifact names to match job ids.
      jobs.slice(-5).forEach((job, i) => {
        artifacts[i].name = job.id.toString();
      });
      jest.replaceProperty(subject, "artifacts", artifacts);
      jest.spyOn(subject, "downloadArtifactFile").mockImplementation(async (id: number) => {
        return `path/to/${id}`;
      });
      jest.spyOn(subject, "readOutputs").mockImplementation((filepath: string) => {
        return `Results for ${filepath}`;
      });
    });

    it("gets outputs for the specified jobs", async () => {
      const result = await subject.getJobOutputs(jobs);
      expect(Object.keys(result).length).toEqual(5);
    });
  });

  describe("downloadArtifactFile", () => {
    let zipperSpy: jest.SpyInstance;

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Stream = require("stream");
      const dataStream = fs.createReadStream(__filename);
      jest.spyOn(dataStream, "pipe").mockImplementation((destination) => {
        return destination;
      });
      jest.spyOn(fs, "createReadStream").mockImplementation(() => {
        return dataStream;
      });
      zipperSpy = jest.spyOn(unzipper, "Extract");
      zipperSpy.mockImplementation(() => {
        const mocker = Stream.PassThrough;
        mocker.promise = jest.fn();
        return mocker;
      });
    });

    it("tries to download the artifact as expected", async () => {
      const downloadFileSpy = jest.spyOn(subject, "downloadFile").mockImplementation();
      await subject.downloadArtifactFile(123);
      expect(zipperSpy).toHaveBeenCalled();
      expect(downloadFileSpy).toHaveBeenCalled();
    });
  });

  describe("readOutputs", () => {
    it("reads the output file name from the given path", async () => {
      jest.spyOn(fs, "readFileSync").mockImplementation((filePath) => {
        return `{"someArbitrary": "JSON data", "from": "${filePath}"}`;
      });

      const result = subject.readOutputs("some/path/to/a/file");
      expect(result).toEqual({"someArbitrary": "JSON data", "from": "some/path/to/a/file/outputFileName.txt"});
    });
  });

  describe("run", () => {
    it("iterates over jobs by dependency and gets the data from GitHub", async () => {
      
      const getWorkflowSchemaSpy = jest.spyOn(subject, "getWorkflowSchema").mockImplementation(async () => workflowContent);
      const getRunArtifactsSpy = jest.spyOn(subject, "getRunArtifacts").mockImplementation();
      const getRelevantWorkflowJobsSpy = jest.spyOn(subject, "getRelevantWorkflowJobs").mockImplementation();
      const getLastRanWorkflowJobsSpy = jest.spyOn(subject, "getLastRanWorkflowJobs").mockImplementation();
      const getJobOutputsSpy = jest.spyOn(subject, "getJobOutputs").mockImplementation();
      const coreSpy = jest.spyOn(core, "setOutput").mockImplementation();

      await subject.run();

      expect(getWorkflowSchemaSpy).toHaveBeenCalled();
      expect(getRunArtifactsSpy).toHaveBeenCalled();
      expect(getRelevantWorkflowJobsSpy).toHaveBeenCalled();
      expect(getLastRanWorkflowJobsSpy).toHaveBeenCalled();
      expect(getJobOutputsSpy).toHaveBeenCalled();

      
      workflowContent.jobs[subject.context.job].needs.forEach((needsName: string) => {
        expect(coreSpy).toHaveBeenCalledWith(needsName, undefined);
      });
    });
  });
});
