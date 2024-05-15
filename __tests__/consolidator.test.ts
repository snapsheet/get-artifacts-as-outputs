import { ContextFactory } from "./factories/github/context";
import { Consolidator } from "../src/consolidator";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";

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

/**
 * Mock the `github` module environment data and API endpoints for test cases.
 */
jest.mock<typeof import("@actions/github")>("@actions/github", () => {
  const originalGithub =
    jest.requireActual<typeof import("@actions/github")>("@actions/github");

  return {
    ...originalGithub,
    context: ContextFactory.generate()
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
});
