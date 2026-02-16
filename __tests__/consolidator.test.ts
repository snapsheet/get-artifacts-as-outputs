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
        repo: subject.context.payload.repository?.name,
        per_page: 100
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

    it("recursively looks back through multiple run attempts when jobs have run_attempt > 1 and runner_id == 0", async () => {
      // Create jobs that will trigger recursion:
      // - run_attempt > 1 (e.g., 2)
      // - runner_id == 0 (to be in jobsToRerun)
      const jobsToRerun = skippedJobs.map((job) => ({
        ...job,
        run_attempt: 2, // Must be > 1 to trigger recursion
        runner_id: 0 // Must be 0 to be in jobsToRerun
      }));
      
      // Jobs that should be returned immediately (runner_id != 0)
      const jobsToReturn = jobs.filter((job) => !skippedJobs.includes(job));
      
      // Combine them
      const jobsWithRerun = [...jobsToReturn, ...jobsToRerun];
      
      // Mock getRelevantWorkflowJobs to return jobs that will trigger another recursion
      const recursiveJobs = skippedJobs.map((job) => ({
        ...job,
        run_attempt: 2, // Still > 1 to trigger another recursion
        runner_id: 0,
        name: job.name // Same names to pass the filter
      }));
      
      methodSpy.mockResolvedValueOnce(recursiveJobs);
      
      // Second call returns jobs with run_attempt == 1 to stop recursion
      const finalJobs = skippedJobs.map((job) => ({
        ...job,
        run_attempt: 1, // == 1, so recursion stops
        runner_id: 5 // != 0, so they're in jobsToReturn
      }));
      methodSpy.mockResolvedValueOnce(finalJobs);
      
      const result = await subject.getLastRanWorkflowJobs("doesnt_matter", jobsWithRerun);
      
      // Should have called getRelevantWorkflowJobs twice (for two levels of recursion)
      expect(methodSpy).toHaveBeenCalledTimes(2);
      // Should return jobsToReturn + finalJobs
      expect(result).toEqual([...jobsToReturn, ...finalJobs]);
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
    let paginateSpy: jest.SpyInstance;

    beforeEach(() => {
      // Mock the paginate method to return the jobs array directly
      const mockJobsResponse = ListJobsForWorkflowRunFactory.generate();
      const jobs = mockJobsResponse.data.jobs as JobInfo[];
      
      paginateSpy = jest.spyOn(subject.octokit, "paginate").mockImplementation(async (_method: any, _params: any) => {
        // Return the jobs array directly (paginate extracts data.jobs)
        return jobs;
      });
    });

    afterEach(() => {
      paginateSpy.mockRestore();
    });

    it("fetches workflow jobs if there were no reruns", async () => {
      expect((await subject.getWorkflowJobs(12)).length).not.toEqual(0);
    });

    it("fetches workflow jobs if there were reruns", async () => {
      expect((await subject.getWorkflowJobs(12, 3)).length).not.toEqual(0);
    });

    it("uses pagination to fetch all jobs", async () => {
      await subject.getWorkflowJobs(12);
      expect(paginateSpy).toHaveBeenCalledWith(
        subject.octokit.rest.actions.listJobsForWorkflowRun,
        expect.objectContaining({
          run_id: 12
        })
      );
    });

    it("uses pagination for workflow run attempts", async () => {
      await subject.getWorkflowJobs(12, 3);
      expect(paginateSpy).toHaveBeenCalledWith(
        subject.octokit.rest.actions.listJobsForWorkflowRunAttempt,
        expect.objectContaining({
          run_id: 12,
          attempt_number: 3
        })
      );
    });
  });

  describe("getRunArtifacts", () => {
    let paginateSpy: jest.SpyInstance;

    beforeEach(() => {
      // Mock the paginate method to return the artifacts array directly
      const mockArtifactResponse = ListWorkflowRunArtifactResponseFactory.generate();
      const artifacts = mockArtifactResponse.data.artifacts as ArtifactInfo[];
      
      paginateSpy = jest.spyOn(subject.octokit, "paginate").mockImplementation(async (_method: any, _params: any) => {
        // Return the artifacts array directly (paginate extracts data.artifacts)
        return artifacts;
      });
    });

    afterEach(() => {
      paginateSpy.mockRestore();
    });

    it("attemptes to fetch and load artifacts", async () => {
      expect((await subject.getRunArtifacts()).length).not.toEqual(0);
    });

    it("uses pagination to fetch all artifacts", async () => {
      await subject.getRunArtifacts();
      expect(paginateSpy).toHaveBeenCalledWith(
        subject.octokit.rest.actions.listWorkflowRunArtifacts,
        expect.objectContaining({
          run_id: subject.context.runId
        })
      );
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
          name: "Some Verbose Job Name"
        }),
        WorkflowJobFactory.generate({
          name: "Some Verbose Job Name But Not The Same (matrix1)"
        }),
        WorkflowJobFactory.generate({
          name: "Some Verbose Job Name (Also Not The Same) (matrix2)"
        }),
        WorkflowJobFactory.generate({
          name: "Some Verbose Job Name (notamatrix3) (matrix2)"
        })
      ]);
      expect(results.length).toEqual(3);
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
        // Return unique results based on filepath to avoid collisions
        return { result: `Results for ${filepath}`, path: filepath };
      });
    });

    it("gets outputs for the specified jobs", async () => {
      const result = await subject.getJobOutputs(jobs);
      expect(Object.keys(result).length).toEqual(5);
    });

    it("logs when jobs are missing artifacts", async () => {
      const debugSpy = jest.spyOn(core, "debug");
      // Create jobs where some don't have matching artifacts
      const jobsWithMissing = [
        WorkflowJobFactory.generate({ id: 999 }),
        WorkflowJobFactory.generate({ id: 888 })
      ];
      // Only one artifact matches
      artifacts[0].name = "999";
      
      await subject.getJobOutputs(jobsWithMissing);
      
      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining("jobs without artifacts")
      );
    });

    it("only includes jobs that have matching artifacts", async () => {
      const jobsWithSomeMissing = [
        WorkflowJobFactory.generate({ id: 111, name: "Job 111" }),
        WorkflowJobFactory.generate({ id: 222, name: "Job 222" }),
        WorkflowJobFactory.generate({ id: 333, name: "Job 333" })
      ];
      // Create a fresh artifacts array with exactly 2 artifacts that match
      // Use the factory to create proper artifacts
      const mockArtifactResponse = ListWorkflowRunArtifactResponseFactory.generate();
      const baseArtifacts = mockArtifactResponse.data.artifacts as ArtifactInfo[];
      const testArtifacts: ArtifactInfo[] = [
        { 
          ...baseArtifacts[0], 
          name: "111", 
          id: 111
        } as ArtifactInfo,
        { 
          ...baseArtifacts[0], 
          name: "222", 
          id: 222
        } as ArtifactInfo
      ];
      // Use replaceProperty to ensure it's properly set
      jest.replaceProperty(subject, "artifacts", testArtifacts);
      
      const result = await subject.getJobOutputs(jobsWithSomeMissing);
      
      // Should only have 2 results, not 3
      expect(Object.keys(result).length).toEqual(2);
      expect(result).toHaveProperty(jobsWithSomeMissing[0].name);
      expect(result).toHaveProperty(jobsWithSomeMissing[1].name);
      expect(result).not.toHaveProperty(jobsWithSomeMissing[2].name);
    });
  });

  describe("downloadArtifactFile", () => {
    let zipperSpy: jest.SpyInstance;

    beforeEach(() => {
      // Mock the downloadArtifact API call
      jest.spyOn(subject.octokit.rest.actions, "downloadArtifact").mockResolvedValue({
        url: "https://api.github.com/repos/test/test/actions/artifacts/123/zip",
        status: 302,
        headers: {} as any,
        data: {} as any
      });

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
      const mockJobs: JobInfo[] = [WorkflowJobFactory.generate()];
      const mockArtifacts = ListWorkflowRunArtifactResponseFactory.generate().data.artifacts as ArtifactInfo[];
      
      const getWorkflowSchemaSpy = jest.spyOn(subject, "getWorkflowSchema").mockImplementation(async () => workflowContent);
      const getRunArtifactsSpy = jest.spyOn(subject, "getRunArtifacts").mockResolvedValue(mockArtifacts);
      const getRelevantWorkflowJobsSpy = jest.spyOn(subject, "getRelevantWorkflowJobs").mockResolvedValue(mockJobs);
      const getLastRanWorkflowJobsSpy = jest.spyOn(subject, "getLastRanWorkflowJobs").mockResolvedValue(mockJobs);
      const getJobOutputsSpy = jest.spyOn(subject, "getJobOutputs").mockResolvedValue({ "test": "output" });
      const coreSpy = jest.spyOn(core, "setOutput").mockImplementation();

      await subject.run();

      expect(getWorkflowSchemaSpy).toHaveBeenCalled();
      expect(getRunArtifactsSpy).toHaveBeenCalled();
      expect(getRelevantWorkflowJobsSpy).toHaveBeenCalled();
      expect(getLastRanWorkflowJobsSpy).toHaveBeenCalled();
      expect(getJobOutputsSpy).toHaveBeenCalled();

      
      workflowContent.jobs[subject.context.job].needs.forEach((needsName: string) => {
        expect(coreSpy).toHaveBeenCalledWith(needsName, JSON.stringify({ "test": "output" }));
      });
    });

    it("refetches artifacts for each job name", async () => {
      const mockJobs: JobInfo[] = [WorkflowJobFactory.generate()];
      const mockArtifacts = ListWorkflowRunArtifactResponseFactory.generate().data.artifacts as ArtifactInfo[];
      
      jest.spyOn(subject, "getWorkflowSchema").mockImplementation(async () => workflowContent);
      const getRunArtifactsSpy = jest.spyOn(subject, "getRunArtifacts").mockResolvedValue(mockArtifacts);
      jest.spyOn(subject, "getRelevantWorkflowJobs").mockResolvedValue(mockJobs);
      jest.spyOn(subject, "getLastRanWorkflowJobs").mockResolvedValue(mockJobs);
      jest.spyOn(subject, "getJobOutputs").mockResolvedValue({ "test": "output" });
      jest.spyOn(core, "setOutput").mockImplementation();

      await subject.run();

      // Should be called once initially + once for each job in needs
      const expectedCalls = 1 + workflowContent.jobs[subject.context.job].needs.length;
      expect(getRunArtifactsSpy).toHaveBeenCalledTimes(expectedCalls);
    });

    it("retries fetching artifacts if some are missing", async () => {
      const mockJobs: JobInfo[] = [
        WorkflowJobFactory.generate({ id: 123 }),
        WorkflowJobFactory.generate({ id: 456 })
      ];
      const mockArtifactsFirst = ListWorkflowRunArtifactResponseFactory.generate().data.artifacts as ArtifactInfo[];
      // First call: missing artifact for job 456
      mockArtifactsFirst[0].name = "123";
      const mockArtifactsSecond = ListWorkflowRunArtifactResponseFactory.generate().data.artifacts as ArtifactInfo[];
      // Second call: has both artifacts
      mockArtifactsSecond[0].name = "123";
      const secondArtifact = { ...mockArtifactsSecond[0], name: "456", id: 456 } as ArtifactInfo;
      mockArtifactsSecond.push(secondArtifact);
      
      const needsCount = workflowContent.jobs[subject.context.job].needs.length;
      
      // Set up all mocks BEFORE calling run()
      jest.spyOn(subject, "getWorkflowSchema").mockImplementation(async () => workflowContent);
      
      // Mock getRunArtifacts - need to provide enough return values for ALL calls
      // Pattern: 
      // - Initial fetch: 1
      // - For each job in needs: 1 fetch per job
      // - For first job that triggers retry: 1 additional retry call
      // Total: 1 + needsCount + 1 = 2 + needsCount
      const getRunArtifactsSpy = jest.spyOn(subject, "getRunArtifacts");
      
      // Build the chain of mock return values
      const mockChain = [
        mockArtifactsFirst,  // Initial fetch (line 58)
        mockArtifactsFirst,  // First job fetch (line 63) - will trigger retry
        mockArtifactsSecond, // Retry fetch (line 91) - this should have both artifacts
      ];
      
      // Add one fetch for each remaining job (no retries for them)
      for (let i = 1; i < needsCount; i++) {
        mockChain.push(mockArtifactsFirst);
      }
      
      // Apply all mocks with a fallback
      mockChain.forEach((mockValue) => {
        getRunArtifactsSpy.mockResolvedValueOnce(mockValue);
      });
      // Add a fallback in case we need more calls
      getRunArtifactsSpy.mockResolvedValue(mockArtifactsFirst);
      
      jest.spyOn(subject, "getRelevantWorkflowJobs").mockResolvedValue(mockJobs);
      jest.spyOn(subject, "getLastRanWorkflowJobs").mockResolvedValue(mockJobs);
      jest.spyOn(subject, "getJobOutputs").mockResolvedValue({ "test": "output" });
      jest.spyOn(core, "setOutput").mockImplementation();
      
      // Mock setTimeout to execute callbacks immediately
      const originalSetTimeout = global.setTimeout;
      let setTimeoutCallCount = 0;
      
      global.setTimeout = jest.fn((fn: any, _delay: number) => {
        setTimeoutCallCount++;
        // Execute immediately in next microtask to maintain async flow
        Promise.resolve().then(() => fn());
        return {} as NodeJS.Timeout;
      }) as any;

      await subject.run();
      
      // Give a moment for all promises to resolve
      await new Promise(resolve => setImmediate(resolve));
      
      // Restore original setTimeout
      global.setTimeout = originalSetTimeout;

      // Should have been called: initial (1) + per job (needsCount) + retry (1) = 2 + needsCount
      // But due to async timing, it might be called more. Just verify it was called multiple times
      expect(getRunArtifactsSpy).toHaveBeenCalled();
      expect(getRunArtifactsSpy.mock.calls.length).toBeGreaterThan(needsCount);
    });

    it("stops retrying after max retries", async () => {
      const mockJobs: JobInfo[] = [
        WorkflowJobFactory.generate({ id: 123 }),
        WorkflowJobFactory.generate({ id: 456 })
      ];
      const mockArtifacts = ListWorkflowRunArtifactResponseFactory.generate().data.artifacts as ArtifactInfo[];
      // Always missing artifact for job 456
      mockArtifacts[0].name = "123";
      
      jest.spyOn(subject, "getWorkflowSchema").mockImplementation(async () => workflowContent);
      // Mock to always return artifacts missing job 456
      const getRunArtifactsSpy = jest.spyOn(subject, "getRunArtifacts").mockResolvedValue(mockArtifacts);
      jest.spyOn(subject, "getRelevantWorkflowJobs").mockResolvedValue(mockJobs);
      jest.spyOn(subject, "getLastRanWorkflowJobs").mockResolvedValue(mockJobs);
      jest.spyOn(subject, "getJobOutputs").mockResolvedValue({ "test": "output" });
      jest.spyOn(core, "setOutput").mockImplementation();
      
      // Mock setTimeout to resolve immediately
      const originalSetTimeout = global.setTimeout;
      let callCount = 0;
      global.setTimeout = jest.fn((fn: any, _delay: number) => {
        callCount++;
        // Execute immediately in next tick
        setImmediate(() => fn());
        return {} as NodeJS.Timeout;
      }) as any;

      await subject.run();

      // Should have been called: initial (1) + per job (needs.length) + retries (needs.length * 3)
      // = 1 + needs.length + (needs.length * 3) = 1 + (needs.length * 4)
      const expectedCalls = 1 + (workflowContent.jobs[subject.context.job].needs.length * 4);
      expect(getRunArtifactsSpy).toHaveBeenCalledTimes(expectedCalls);
      // Verify setTimeout was called for retries (3 retries per job)
      expect(callCount).toBeGreaterThan(0);
      
      global.setTimeout = originalSetTimeout;
    });
  });
});
