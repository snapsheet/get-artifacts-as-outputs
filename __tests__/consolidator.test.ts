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
import _ from "lodash";
import { JobInfo } from "../src/jobInfo";
import { jest } from "@jest/globals";

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
          fetch: jest.fn(async (endpoint: string) => {
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
            } else if (/\/actions\/runs\/\d+\/artifacts(.*)$/.test(endpoint)) {
              response = ListWorkflowRunArtifactResponseFactory.generate({
                url: endpoint
              });
            } else if (/\/actions\/runs\/\d+\/jobs(.*)$/.test(endpoint)) {
              response = ListJobsForWorkflowRunFactory.generate({
                url: endpoint
              });
            } else if (/\/actions\/artifacts\/\d+\/zip(.*)$/.test(endpoint)) {
              response = DownloadArtifactResponseFactory.generate({
                url: endpoint
              });
            } else {
              throw Error(`API called but no mock matches ${endpoint}`);
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

  beforeEach(() => {
    subject = new Consolidator();
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

  describe("jobArtifacts", () => {
    it("formats the found artifacts appropriately", async () => {
      const fakeJob = WorkflowJobFactory.generate();
      const otherFakeJob = WorkflowJobFactory.generate();
      jest
        .spyOn(subject, "getWorkflowJobs")
        .mockImplementation(async (run_id: number) => {
          return ListJobsForWorkflowRunFactory.generate({
            url: `/doesnt/matter/${run_id}`
          }).data.jobs;
        });
      jest
        .spyOn(subject, "filterForRelevantJobDetails")
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .mockImplementation(async (_jobs: JobInfo[]) => {
          return {
            job_key_one: { Something: fakeJob },
            job_key_two: { SomethingElse: otherFakeJob },
          };
        });
      const mockArtifactResponse =
        ListWorkflowRunArtifactResponseFactory.generate();
      subject.artifacts = mockArtifactResponse.data.artifacts as ArtifactInfo[];
      subject.artifacts[0].name = fakeJob.id.toString();
      subject.artifacts[1].name = otherFakeJob.id.toString();
      expect(await subject.jobArtifacts()).toEqual({
        job_key_one: {Something: subject.artifacts[0]},
        job_key_two: {SomethingElse: subject.artifacts[1]}
      });
    });
  });

  describe("getWorkflowJobs", () => {
    it("fetches workflow jobs", async () => {
      const results = await subject.getWorkflowJobs(12);
      expect(results.length).not.toEqual(0);
    });
  });

  describe("getRunArtifacts", () => {
    it("attemptes to fetch and load artifacts", async () => {
      expect((await subject.getRunArtifacts()).length).not.toEqual(0);
    });
  });

  describe("filterForRelevantJobDetails", () => {
    beforeEach(() => {
      subject.context.job = "get_the_artifacts_as_outputs";
      subject.schema = {
        jobs: {
          some_job_name: {
            name: "Some Verbose Job Name",
            strategy: {
              matrix: [1, 2, 3]
            }
          },
          some_other_job_name: {
            name: "Some Other Verbose Job Name",
            strategy: {
              matrix: "${{ some.github-interpolated.value }}"
            }
          },
          some_job_name_without_a_matrix: {
            name: "Some Other Job Name Without A Matrix"
          },
          get_the_artifacts_as_outputs: {
            name: "Get the results of previous jobs",
            needs: [
              "some_job_name",
              "some_other_job_name",
              "some_job_name_without_a_matrix"
            ]
          }
        }
      };
    });

    it("finds matrix jobs that start with the job name", async () => {
      const mockJobList = [
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
        WorkflowJobFactory.generate({ name: "Some Other Verbose Job Name (small)" }),
        WorkflowJobFactory.generate({ name: "Some Other Verbose Job Name (medium)" }),
        WorkflowJobFactory.generate({ name: "Some Other Verbose Job Name (large)" }),
        WorkflowJobFactory.generate({ name: "Some Other Job Name Without A Matrix" })
      ];
      const results = await subject.filterForRelevantJobDetails(mockJobList);
      expect(results).toEqual({
        some_job_name: {
          [mockJobList[0].name]: mockJobList[0],
          [mockJobList[1].name]: mockJobList[1],
          [mockJobList[2].name]: mockJobList[2],
          [mockJobList[3].name]: mockJobList[3],
          [mockJobList[4].name]: mockJobList[4]
        },
        some_other_job_name: {
          [mockJobList[5].name]: mockJobList[5],
          [mockJobList[6].name]: mockJobList[6],
          [mockJobList[7].name]: mockJobList[7]
        }
      });
    });

    it("does not find jobs that start with substrings", async () => {
      const mockJobList = [
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
          name: "Some Verbose Job Name" // ...but shouldn't match
        }),
        WorkflowJobFactory.generate({
          name: "Some Verbose Job Name But Not The Same (matrix1)"
        }),
        WorkflowJobFactory.generate({
          name: "Some Verbose Job Name (Also Not The Same) (matrix2)"
        }),
        WorkflowJobFactory.generate({
          name: "Some Verbose Job Name ((not) (the (same))) (matrix2)"
        }),
        WorkflowJobFactory.generate({
          name: "Some Other Job Name Without A Matrix"
        })
      ];
      const results = await subject.filterForRelevantJobDetails(mockJobList);
      expect(results).toEqual({
        some_job_name: {
          [mockJobList[0].name]: mockJobList[0],
          [mockJobList[1].name]: mockJobList[1],
          [mockJobList[2].name]: mockJobList[2]
        }
      });
    });
  });

  describe("getJobOutputs", () => {
    let artifacts: ArtifactInfo[];

    beforeEach(() => {
      const mockArtifactResponse =
        ListWorkflowRunArtifactResponseFactory.generate();
      artifacts = mockArtifactResponse.data.artifacts as ArtifactInfo[];
      const filteredArtifacts = {
        some_job_name: {
          "Some Verbose Job Name (1)": artifacts[0],
          "Some Verbose Job Name (2)": artifacts[1],
          "Some Verbose Job Name (3)": artifacts[2]
        },
        some_other_job_name: {
          "Some Other Verbose Job Name (uno)": artifacts[3],
          "Some Other Verbose Job Name (dos)": artifacts[4],
          "Some Other Verbose Job Name (tres)": artifacts[5]
        }
      };
      jest
        .spyOn(subject, "jobArtifacts")
        .mockImplementation(
          async (): Promise<{ [k: string]: { [k: string]: ArtifactInfo | undefined }}> =>
            filteredArtifacts
        );
      jest
        .spyOn(subject, "downloadArtifactFile")
        .mockImplementation(async (id: number | undefined) => {
          return `path/to/${id}`;
        });
      jest
        .spyOn(subject, "readOutputs")
        .mockImplementation((filepath: string | undefined) => {
          return `Results for ${filepath}`;
        });

      // jest
      // .spyOn(subject, "readOutputs")
      // .mockImplementation((filepath: string | undefined) => {
      //   return _.mapValues(filteredArtifacts, (jobs) => {
      //     return _.mapValues(jobs, (a: ArtifactInfo) => a?.id);
      //   });
      // });
    });

    it("renders the debug info, and formats the results as expected", async () => {
      subject.context.job = "get_the_artifacts_as_outputs";
      subject.schema = {
        jobs: {
          some_job_name: {
            name: "Some Verbose Job Name",
            strategy: {
              matrix: [1, 2, 3]
            }
          },
          some_other_job_name: {
            name: "Some Other Verbose Job Name",
            strategy: {
              matrix: "${{ some.github-interpolated.value }}"
            }
          },
          some_job_name_without_a_matrix: {
            name: "Some Other Job Name Without A Matrix"
          },
          get_the_artifacts_as_outputs: {
            name: "Get the results of previous jobs",
            needs: [
              "some_job_name",
              "some_other_job_name",
              "some_job_name_without_a_matrix"
            ]
          }
        }
      };

      const expectedResults = {
        some_job_name: {
          "Some Verbose Job Name (1)": `Results for path/to/${artifacts[0].id}`,
          "Some Verbose Job Name (2)": `Results for path/to/${artifacts[1].id}`,
          "Some Verbose Job Name (3)": `Results for path/to/${artifacts[2].id}`
        },
        some_other_job_name: {
          "Some Other Verbose Job Name (uno)": `Results for path/to/${artifacts[3].id}`,
          "Some Other Verbose Job Name (dos)": `Results for path/to/${artifacts[4].id}`,
          "Some Other Verbose Job Name (tres)": `Results for path/to/${artifacts[5]?.id}`
        }
      };
      const coreDebugSpy = jest
        .spyOn(core, "debug")
        .mockImplementation((message) => message);
      const result = await subject.getJobOutputs();
      expect(coreDebugSpy).toHaveBeenNthCalledWith(1, "Context:");
      expect(coreDebugSpy).toHaveBeenNthCalledWith(
        2,
        JSON.stringify(subject.context)
      );
      expect(coreDebugSpy).toHaveBeenNthCalledWith(
        3,
        `Found Artifacts (${JSON.stringify(artifacts.slice(0, 6).map((a) => a?.id))})`
      );
      expect(result).toEqual(expectedResults);
    });
  });

  describe("downloadArtifactFile", () => {
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
      const zipperSpy = jest.spyOn(unzipper, "Extract");
      zipperSpy.mockImplementation(() => {
        const mocker = Stream.PassThrough;
        mocker.promise = jest.fn();
        return mocker;
      });
    });

    it("returns undefined if the artifactId is undefined", async () => {
      expect(await subject.downloadArtifactFile(undefined)).toBeUndefined();
    });

    it("tries to download the artifact as expected", async () => {
      const zipperSpy = jest.spyOn(unzipper, "Extract");
      const downloadFileSpy = jest
        .spyOn(subject, "downloadFile")
        .mockImplementation(async (url, path) => [url, path]);
      await subject.downloadArtifactFile(123);
      expect(zipperSpy).toHaveBeenCalled();
      expect(downloadFileSpy).toHaveBeenCalled();
    });
  });

  describe("readOutputs", () => {
    it("returns an undefined value if no artifact path was passed in", async () => {
      const result = subject.readOutputs(undefined);
      expect(result).toBeUndefined();
    });

    it("reads the output file name from the given path", async () => {
      jest.spyOn(fs, "readFileSync").mockImplementation((filePath) => {
        return JSON.stringify({ someArbitrary: "JSON data", from: filePath });
      });

      const result = subject.readOutputs("some/path/to/a/file");
      expect(result).toEqual(
        JSON.stringify({
          someArbitrary: "JSON data",
          from: "some/path/to/a/file/outputFileName.txt"
        })
      );
    });
  });

  describe("downloadFile", () => {
    it("calls the Axios library and resolves a promise with true", async () => {
      const mockedWriteStream = fs.createWriteStream("/dev/null");
      const mockOn = jest
      .spyOn(mockedWriteStream, "on")
      .mockImplementation(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (event: string | symbol, listener: (...args: any[]) => void) => {
            if (event == "close") {
              listener();
            }
            return mockedWriteStream;
          }
        );
        const writeSpy = jest
        .spyOn(fs, "createWriteStream")
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .mockImplementation((_) => mockedWriteStream);
      const mockPipe = jest.fn();
      const mockAdapter = new MockAdapter(axios);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      mockAdapter
        .onGet("https://not-a-real-site-domain-host.name/some/file/url")
        .reply(async (inputConfig) => {
          return [200, { pipe: mockPipe, thing: "stuff", inputConfig }];
        });
      await expect(
        subject.downloadFile(
          "https://not-a-real-site-domain-host.name/some/file/url",
          "/some/local/file/path"
        )
      ).resolves.toBe(true);
      expect(mockPipe).toHaveBeenCalledWith(mockedWriteStream);
      expect(writeSpy).toHaveBeenCalled();
      expect(mockOn).toHaveBeenCalled();
    });

    it("calls the Axios library and rejects the promise with an error message", async () => {
      const mockedWriteStream = fs.createWriteStream("/dev/null");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockOn = jest
        .spyOn(mockedWriteStream, "on")
        .mockImplementation(
          (event: string | symbol, listener: (...args: unknown[]) => void) => {
            if (event == "error") {
              listener("this is an error");
            } else if (event == "close") {
              listener();
            }
            return mockedWriteStream;
          }
        );
      const mockClose = jest.spyOn(mockedWriteStream, "close");
      const writeSpy = jest
      .spyOn(fs, "createWriteStream")
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .mockImplementation((_) => mockedWriteStream);
      const mockPipe = jest.fn();
      const mockAdapter = new MockAdapter(axios);
      mockAdapter
        .onGet("https://not-a-real-site-domain-host.name/some/file/url")
        .reply(async (inputConfig) => {
          return [200, { pipe: mockPipe, thing: "stuff", inputConfig }];
        });
      await expect(
        subject.downloadFile(
          "https://not-a-real-site-domain-host.name/some/file/url",
          "/some/local/file/path"
        )
      ).rejects.toBe("this is an error");
      expect(mockClose).toHaveBeenCalled();
      expect(mockPipe).toHaveBeenCalledWith(mockedWriteStream);
      expect(writeSpy).toHaveBeenCalled();
      expect(mockOn).toHaveBeenCalled();
    });
  });

  describe("run", () => {
    it("sets any outputs that were found", async () => {
      const mockOutputs = {
        "Some Verbose Job Name (1)": "Some results output.",
        "Some Verbose Job Name (2)": "Some results output.",
        "Some Verbose Job Name (3)": "Some results output."
      };
      const getWorkflowSchemaSpy = jest
        .spyOn(subject, "getWorkflowSchema")
        .mockImplementation(async () => workflowContent);
      const getRunArtifactsSpy = jest
        .spyOn(subject, "getRunArtifacts")
        .mockImplementation(async () => []);
      const getJobOutputsSpy = jest
        .spyOn(subject, "getJobOutputs")
        .mockImplementation(
          async (): Promise<{ [k: string]: string }> => mockOutputs
        );
      const setOutputSpy = jest
        .spyOn(core, "setOutput")
        .mockImplementation((jobName, jobOutputs) => [jobName, jobOutputs]);

      await subject.run();

      expect(getWorkflowSchemaSpy).toHaveBeenCalled();
      expect(getRunArtifactsSpy).toHaveBeenCalled();
      expect(getJobOutputsSpy).toHaveBeenCalled();

      _.toPairs(mockOutputs).forEach(([jobName, jobOutputs]) => {
        expect(setOutputSpy).toHaveBeenCalledWith(jobName, jobOutputs);
      });
    });
  });
});
