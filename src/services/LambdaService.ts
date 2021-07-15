import { IInvokeConfig } from "../models";
import { Configuration } from "../utils/Configuration";
import { AWSError, config as AWSConfig, Lambda } from "aws-sdk";
import { PromiseResult } from "aws-sdk/lib/request";
/* tslint:disable */
const AWSXRay = require("aws-xray-sdk");
/* tslint:enable */

/**
 * Service class for invoking external lambda functions
 */
export class LambdaService {
  public readonly lambdaClient: Lambda;

  constructor(lambdaClient: Lambda) {
    const config: IInvokeConfig = Configuration.getInstance().getInvokeConfig();
    this.lambdaClient = AWSXRay.captureAWSClient(lambdaClient);

    AWSConfig.lambda = config.params;
  }

  /**
   * Invokes a lambda function based on the given parameters
   * @param params - InvocationRequest params
   */
  public async invoke(
    params: Lambda.Types.InvocationRequest
  ): Promise<PromiseResult<Lambda.Types.InvocationResponse, AWSError>> {
    return this.lambdaClient.invoke(params).promise();
  }
}
