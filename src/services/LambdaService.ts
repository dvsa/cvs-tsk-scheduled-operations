import { IInvokeConfig } from '../models';
import { Configuration } from '../utils/Configuration';
import { ServiceException } from '@smithy/smithy-client';
import { InvocationRequest, InvokeCommand, InvokeCommandOutput, LambdaClient } from "@aws-sdk/client-lambda";
import AWSXRay from "aws-xray-sdk";

/**
 * Service class for invoking external lambda functions
 */
export class LambdaService {
  public readonly lambdaClient: LambdaClient;

  constructor(lambdaClient: LambdaClient) {
    const config: IInvokeConfig = Configuration.getInstance().getInvokeConfig();
    this.lambdaClient = AWSXRay.captureAWSv3Client(new LambdaClient({ ...lambdaClient, ...config.params }));
  }

  /**
   * Invokes a lambda function based on the given parameters
   * @param params - InvocationRequest params
   */
  public async invoke(
    params: InvocationRequest,
  ): Promise<InvokeCommandOutput | ServiceException> {
    try {
      return await this.lambdaClient.send(new InvokeCommand(params));
    } catch (err) {
      throw err;
    }
  }
}
