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
