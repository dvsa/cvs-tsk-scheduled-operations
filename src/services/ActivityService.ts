import { ServiceException } from '@smithy/smithy-client';
import { InvocationRequest, InvokeCommandOutput } from '@aws-sdk/client-lambda';
import { toUint8Array } from '@smithy/util-utf8';
import { LambdaService } from './LambdaService';
import { Configuration } from '../utils/Configuration';
import { ACTIVITY_TYPE, ERRORS } from '../utils/Enums';
import { IActivityParams, IInvokeConfig } from '../models';
import { validateInvocationResponse } from '../utils/validateInvocationResponse';
import { ActivitySchema } from "@dvsa/cvs-type-definitions/types/v1/activity";
import HTTPError from '../models/HTTPError';

class ActivityService {
  private readonly lambdaClient: LambdaService;
  private readonly config: Configuration;

  constructor(lambdaClient: LambdaService) {
    this.lambdaClient = lambdaClient;
    this.config = Configuration.getInstance();
  }

  /**
   * Setup parameters to make the call to get the required type of activities
   * @param activityType Type of activity, visit, wait or unaccountable
   * @param visitStartTime Earliest start time of activities
   * @param testerStaffId Tester Staff Id
   */
  public async getActivitiesList(
    activityType: ACTIVITY_TYPE,
    visitStartTime: string,
    testerStaffId?: string,
  ): Promise<ActivitySchema[]> {
    const defaultStartTime: string = new Date(2020, 0, 1).toISOString();
    const today: string = new Date().toISOString();
    let params: IActivityParams;

    // Get all open visits, from 2020-01-01
    if (activityType === ACTIVITY_TYPE.VISIT) {
      params = {
        fromStartTime: defaultStartTime,
        toStartTime: today,
        activityType,
        isOpen: true,
      };
    } else {
      // Get wait or unaccountable times, from the visit start time, for the given tester staff id
      params = {
        fromStartTime: visitStartTime,
        toStartTime: today,
        activityType,
        isOpen: false,
        testerStaffId,
      };
    }
    return this.getActivities(params);
  }

  /**
   * Invoke the Activities service endpoint to get records based on the provided parameters
   * @param params - getActivities query parameters
   */
  public async getActivities(params: IActivityParams): Promise<ActivitySchema[]> {
    const config: IInvokeConfig = this.config.getInvokeConfig();
    const invokeParams: InvocationRequest = {
      FunctionName: config.functions.activities.name,
      InvocationType: 'RequestResponse',
      LogType: 'Tail',
      Payload: toUint8Array(
        JSON.stringify({
          httpMethod: 'GET',
          path: '/activities/cleanup',
          queryStringParameters: params,
        }),
      ),
    };

    return this.lambdaClient.invoke(invokeParams).then((response: InvokeCommandOutput | ServiceException) => {
      const payload: any = validateInvocationResponse(response); // Response validation
      if (payload) {
        console.log(`After validation - ${params.activityType}: `, payload);
      } else {
        params.activityType === ACTIVITY_TYPE.VISIT
          ? console.log(`No ${params.activityType} activities returned`)
          : console.log(`No ${params.activityType} activities returned for tester staff id - ${params.testerStaffId}`);
      }
      return payload ? JSON.parse(payload.body) : []; // Response conversion
    });
  }

  /**
   * Invoke the Activities service endpoint to close a visit
   * @param activityId - the activity id
   * @param lastActionTime - the last action time
   */
  public async endVisit(activityId: string, lastActionTime: string): Promise<any> {
    const config: IInvokeConfig = this.config.getInvokeConfig();
    const invokeParams: InvocationRequest = {
      FunctionName: config.functions.activities.name,
      InvocationType: 'RequestResponse',
      LogType: 'Tail',
      Payload: toUint8Array(
        JSON.stringify({
          httpMethod: 'PUT',
          path: `/activities/${activityId}/end`,
          pathParameters: {
            activityId,
          },
          body: JSON.stringify({
            endTime: lastActionTime,
          }),
        }),
      ),
    };
    return this.lambdaClient
      .invoke(invokeParams)
      .then((response: InvokeCommandOutput | ServiceException) => {
        const payload: any = validateInvocationResponse(response); // Response validation
        return JSON.parse(payload.body);
      })
      .catch(() => {
        throw new HTTPError(500, ERRORS.END_ACTIVITY_FAILURE);
      });
  }
}

export { ActivityService };
