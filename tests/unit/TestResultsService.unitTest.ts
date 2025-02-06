import { TestResultsService } from '../../src/services/TestResultsService';
import testResults from '../resources/testTestResults.json';
import trResponse from '../resources/testResults-response.json';
import { cloneDeep } from 'lodash';
import {TestResultSchema} from "@dvsa/cvs-type-definitions/types/v1/test";

describe('Test Results Service', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });
  describe('getRecentTestResultsByTesterStaffId', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.resetModules();
    });
    describe('when all testers have recent results', () => {
      it('should call getTestResults once per staffId, with correct params, and return a list of recent test results for each testerId', async () => {
        const getTestResultsSpy = jest.spyOn(TestResultsService.prototype, 'getTestResults');
        getTestResultsSpy.mockResolvedValue(testResults as TestResultSchema[]);
        const svc = new TestResultsService(new (jest.fn())());
        const output: TestResultSchema[] = await svc.getRecentTestResultsByTesterStaffId('abc123', '');
        expect(getTestResultsSpy.mock.calls).toHaveLength(1);
        expect(getTestResultsSpy.mock.calls[0][0].testerStaffId).toEqual('abc123');
        expect(getTestResultsSpy.mock.calls[0][0].toDateTime.split('.')[0]).toEqual(
          new Date().toISOString().split('.')[0],
        );
        expect(output.filter((x) => x.testerStaffId === 'abc123')[0].testerStaffId).toEqual(
          testResults[0].testerStaffId,
        );
        getTestResultsSpy.mockClear();
      });
    });
    describe('when one or more testers do not have recent tests', () => {
      it('returns undefined for those users', async () => {
        let output: TestResultSchema[];
        const getTestResultsSpy = jest.spyOn(TestResultsService.prototype, 'getTestResults');
        // @ts-ignore
        getTestResultsSpy.mockResolvedValue(undefined);
        const svc = new TestResultsService(new (jest.fn())());
        await svc.getRecentTestResultsByTesterStaffId('abc', '').then((data) => {
          output = data;
        });
        // @ts-ignore
        expect(output).toEqual(undefined);
        getTestResultsSpy.mockClear();
      });
    });
  });

  describe('Get Test Results', () => {
    it('invokes the lambda client once, with correct params', async () => {
      expect.assertions(5);
      const resp: any = cloneDeep(trResponse);
      resp.Payload.body = JSON.stringify(testResults);
      resp.Payload = JSON.stringify(resp.Payload);
      const invokeSpy = jest.fn().mockResolvedValue(resp);
      const clientSpy = jest.fn().mockImplementation(() => {
        return { invoke: invokeSpy };
      });
      const svc = new TestResultsService(new clientSpy());
      const customParams = { some: 'params' };
      await svc.getTestResults(customParams);

      expect(invokeSpy.mock.calls).toHaveLength(1);
      expect(invokeSpy.mock.calls[0][0].FunctionName).toEqual('cvs-svc-test-results');
      const sentPayload = JSON.parse(Buffer.from(invokeSpy.mock.calls[0][0].Payload).toString());
      expect(sentPayload.httpMethod).toEqual('GET');
      expect(sentPayload.path).toEqual('/test-results/getTestResultsByTesterStaffId');
      expect(sentPayload.queryStringParameters).toEqual(customParams);
    });
  });

  describe('Get Test Results', () => {
    it('invokes the lambda client once, no test results found', async () => {
      expect.assertions(5);
      const resp: any = cloneDeep(trResponse);
      resp.Payload.statusCode = 404;
      resp.Payload.body = JSON.stringify(testResults);
      resp.Payload = JSON.stringify(resp.Payload);
      const invokeSpy = jest.fn().mockResolvedValue(resp);
      const clientSpy = jest.fn().mockImplementation(() => {
        return { invoke: invokeSpy };
      });
      const svc = new TestResultsService(new clientSpy());
      const customParams = { some: 'params' };
      await svc.getTestResults(customParams);

      expect(invokeSpy.mock.calls).toHaveLength(1);
      expect(invokeSpy.mock.calls[0][0].FunctionName).toEqual('cvs-svc-test-results');
      const sentPayload = JSON.parse(Buffer.from(invokeSpy.mock.calls[0][0].Payload).toString());
      expect(sentPayload.httpMethod).toEqual('GET');
      expect(sentPayload.path).toEqual('/test-results/getTestResultsByTesterStaffId');
      expect(sentPayload.queryStringParameters).toEqual(customParams);
    });
  });
});
