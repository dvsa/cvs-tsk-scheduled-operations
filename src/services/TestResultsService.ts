import { IInvokeConfig, ITestResult } from "../models";
import { PromiseResult } from "aws-sdk/lib/request";
import { AWSError, Lambda } from "aws-sdk";
import { LambdaService } from "./LambdaService";
import { Configuration } from "../utils/Configuration";
import { validateInvocationResponse } from "../utils/validateInvocationResponse";
import { subHours } from "date-fns";
import { TIMES } from "../utils/Enums";

class TestResultsService {
  private readonly lambdaClient: LambdaService;
  private readonly config: Configuration;

  constructor(lambdaClient: LambdaService) {
    this.lambdaClient = lambdaClient;
    this.config = Configuration.getInstance();
  }

  public async getRecentTestResultsByTesterStaffId(
    testerStaffIds: string[]
  ): Promise<Map<string, ITestResult[]>> {
    const results = new Map<string, ITestResult[]>();
    // Get results from the period of interest, plus one hour
    for (const testerStaffId of testerStaffIds) {
      const params = {
        testerStaffId,
        fromDateTime: subHours(
          Date.now(),
          TIMES.TERMINATION_TIME + 1
        ).toISOString(),
        toDateTime: new Date().toISOString(),
      };
      console.log("Test Result query params: ", params);
      const result: ITestResult[] = await this.getTestResults(params);
      console.log("Result: ", result);
      results.set(testerStaffId, result);
    }
    return results;
  }

  /**
   * Retrieves test results based on the provided parameters
   * @param params - getTestResultsByTesterStaffId query parameters
   */
  async getTestResults(params: any): Promise<ITestResult[]> {
    const config: IInvokeConfig = this.config.getInvokeConfig();
    const invokeParams: any = {
      FunctionName: config.functions.testResults.name,
      InvocationType: "RequestResponse",
      LogType: "Tail",
      Payload: JSON.stringify({
        httpMethod: "GET",
        path: "/test-results/getTestResultsByTesterStaffId",
        queryStringParameters: params,
      }),
    };
    return await this.lambdaClient
      .invoke(invokeParams)
      .then(
        (
          response: PromiseResult<Lambda.Types.InvocationResponse, AWSError>
        ) => {
          console.log("Raw Test Results response: ", response);
          let payload: any;
          try {
            payload = validateInvocationResponse(response); // Response validation
          } catch (e) {
            // Doesn't matter if they don't find any tech records
            if (e.statusCode !== 404) {
              throw e;
            }
          }
          console.log("After validation: ", payload);
          return payload ? JSON.parse(payload.body) : undefined; // Response conversion
        }
      );
  }
}

export { TestResultsService };
