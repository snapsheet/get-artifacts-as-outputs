import * as core from "@actions/core";

describe("index run", () => {
  let runSpy: jest.SpyInstance;

  beforeEach(() => {
    /**
     * Mock the Consolidator, because it will be tested separately.
     */
    jest.mock<typeof import("../src/consolidator")>("../src/consolidator", () => {
      // Require the original module to not be mocked...
      const originalConsolidator = jest.requireActual<typeof import("../src/consolidator")>("../src/consolidator");
      const mockConsolidator = new originalConsolidator.Consolidator();
      runSpy = jest.spyOn(mockConsolidator, "run").mockImplementation(async () => {
        const something = "nothing";
        something;
      });
      return {
        ...originalConsolidator,
        Consolidator: jest.fn(() => {
          return mockConsolidator;
        })
      };
    });
  });

  it("calls the Consolidator when loaded", async () => {
    await require("../src/index");
    expect(runSpy).toHaveBeenCalled();
  });
});

describe("index errors", () => {
  let setFailedSpy: jest.SpyInstance;

  beforeEach(() => {
    setFailedSpy = jest.spyOn(core, "setFailed").mockImplementation();
    // Clear the module cache to allow re-mocking
    jest.resetModules();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  

  it("handles non-Error exceptions", async () => {
    // Mock Consolidator to throw a non-Error
    jest.doMock("../src/consolidator", () => {
      return {
        Consolidator: jest.fn().mockImplementation(() => {
          return {
            run: jest.fn().mockRejectedValue("string error")
          };
        })
      };
    });

    // Import the run function directly to test it
    const indexModule = await import("../src/index");
    
    // Call run() directly (instead of relying on module-level execution)
    await indexModule.default();
    
    // Should not call setFailed for non-Error exceptions
    expect(setFailedSpy).not.toHaveBeenCalled();
  });
});
