import { IInvokeConfig, ITestResult } from '../models';
import { PromiseResult } from 'aws-sdk/lib/request';
import { AWSError, Lambda } from 'aws-sdk';
import { LambdaService } from './LambdaService';
import { Configuration } from '../utils/Configuration';
import { validateInvocationResponse } from '../utils/validateInvocationResponse';

class TestResultsService {
  private readonly lambdaClient: LambdaService;
  private readonly config: Configuration;

  constructor(lambdaClient: LambdaService) {
    this.lambdaClient = lambdaClient;
    this.config = Configuration.getInstance();
  }

  /**
   * Setup parameters to make the call to get the list of test results
   * @param testerStaffId tester staff id
   * @param visitStartTime earliest start time of the test results
   */
  public async getRecentTestResultsByTesterStaffId(
    testerStaffId: string,
    visitStartTime: string,
  ): Promise<ITestResult[]> {
    const params = {
      testerStaffId,
      fromDateTime: visitStartTime,
      toDateTime: new Date().toISOString(),
    };
    return this.getTestResults(params);
  }

  /**
   * Invoke the Test Result service endpoint to get test results based on the provided parameters
   * @param params - getTestResultsByTesterStaffId query parameters
   */
  async getTestResults(params: any): Promise<ITestResult[]> {
    const config: IInvokeConfig = this.config.getInvokeConfig();
    const invokeParams: any = {
      FunctionName: config.functions.testResults.name,
      InvocationType: 'RequestResponse',
      LogType: 'Tail',
      Payload: JSON.stringify({
        httpMethod: 'GET',
        path: '/test-results/getTestResultsByTesterStaffId',
        queryStringParameters: params,
      }),
    };

    return this.lambdaClient
      .invoke(invokeParams)
      .then((response: PromiseResult<Lambda.Types.InvocationResponse, AWSError>) => {
        const payload: any = validateInvocationResponse(response); // Response validation
        payload
          ? console.log(`After validation: `, payload)
          : console.log(`No Test Results Returned for tester staff id - ${params.testerStaffId}`);
        return payload ? JSON.parse(payload.body) : []; // Response conversion
      });
  }
}

export { TestResultsService };
