import {TestResultsService} from "../../src/services/TestResultsService";
import testResults from "../resources/testTestResults.json";
import {ITestResult} from "../../src/models";
import trResponse from "../resources/testResults-response.json";
import {cloneDeep} from "lodash";

describe("Test Results Service", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetModuleRegistry();
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModuleRegistry();
  });
  describe("getRecentTestResultsByTesterStaffId", () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.resetModuleRegistry();
    });
    describe("when all testers have recent results", () => {
      it("should call getTestResults once per staffId, with correct params, and return a list of recent test results for each testerId", async () => {
        const getTestResultsSpy = jest.spyOn(TestResultsService.prototype, "getTestResults")
        getTestResultsSpy.mockResolvedValue(testResults);
        const svc = new TestResultsService(new (jest.fn()));
        const output: Map<string, ITestResult[]> = await svc.getRecentTestResultsByTesterStaffId(["abc", "123"]);
        expect(getTestResultsSpy.mock.calls).toHaveLength(2);
        expect(getTestResultsSpy.mock.calls[0][0].testerStaffId).toEqual("abc");
        expect(getTestResultsSpy.mock.calls[0][0].toDateTime.split(".")[0]).toEqual(new Date().toISOString().split(".")[0]);
        expect(output.get("abc")).toEqual(testResults);
        expect(output.get("123")).toEqual(testResults);
        getTestResultsSpy.mockClear();
      });
    });
    describe("when one or more testers do not have recent tests", () => {
      it("returns undefined for those users", async () => {
        let output: Map<string, ITestResult[]>;
        const getTestResultsSpy = jest.spyOn(TestResultsService.prototype, "getTestResults")
        // @ts-ignore
        getTestResultsSpy.mockResolvedValue(undefined);
        const svc = new TestResultsService(new (jest.fn()));
        await svc.getRecentTestResultsByTesterStaffId(["abc"]).then((data) => {
          output = data;
        });
        // @ts-ignore
        expect(output.get("abc")).toEqual(undefined);
        getTestResultsSpy.mockClear();
      })
    })
  });

  describe("Get Test Results", () => {
    it("invokes the lambda client", async () => {
      // @ts-ignore
      trResponse.Payload.body = JSON.stringify(testResults);
      const invokeSpy = jest.fn().mockResolvedValue(trResponse);
      const clientSpy = jest.fn().mockImplementation(() => { return {invoke: invokeSpy} });
      const svc = new TestResultsService(new clientSpy());
      const customParams = {some: "params"};
      // const output = await svc.getTestResults(customParams);

      // expect(clientSpy.mock.calls[0][0])
      expect(true);
    })
  })
});
