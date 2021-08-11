import { PromiseResult } from "aws-sdk/lib/request";
import { AWSError, Lambda } from "aws-sdk";
import { LambdaService } from "./LambdaService";
import { Configuration } from "../utils/Configuration";
import { subHours } from "date-fns";
import { ERRORS, TIMES } from "../utils/Enums";
import { IActivity, IActivityParams, IInvokeConfig } from "../models";
import { validateInvocationResponse } from "../utils/validateInvocationResponse";
import HTTPError from "../models/HTTPError";

export enum ActivityType {
  VISIT = "visit",
  WAIT = "wait",
  UNACCOUNTABLE_TIME = "unaccountable time"
}
class ActivityService {
  private readonly lambdaClient: LambdaService;
  private readonly config: Configuration;

  constructor(lambdaClient: LambdaService) {
    this.lambdaClient = lambdaClient;
    this.config = Configuration.getInstance();
  }

  public async getRecentActivities(activityType: ActivityType): Promise<IActivity[]> {
    const toStartTime = new Date();
    // Get unclosed Visit activities from the last period of interest
    const params: IActivityParams = {
      fromStartTime: subHours(toStartTime, TIMES.TERMINATION_TIME + TIMES.ADDITIONAL_WINDOW).toISOString(),
      toStartTime: toStartTime.toISOString(),
      activityType
    };

    return await this.getActivities(params);
  }

  /**
   * Retrieves Activities based on the provided parameters
   * @param params - getActivities query parameters
   */
  public async getActivities(params: IActivityParams): Promise<IActivity[]> {
    const config: IInvokeConfig = this.config.getInvokeConfig();
    const invokeParams: any = {
      FunctionName: config.functions.activities.name,
      InvocationType: "RequestResponse",
      LogType: "Tail",
      Payload: JSON.stringify({
        httpMethod: "GET",
        path: "/activities/cleanup",
        queryStringParameters: params,
      }),
    };
    return (await this.lambdaClient
      .invoke(invokeParams)
      .then(
        (
          response: PromiseResult<Lambda.Types.InvocationResponse, AWSError>
        ) => {
          let payload: any;
          try {
            payload = validateInvocationResponse(response); // Response validation
          } catch (e) {
            if (e.statusCode === 404) {
              return [];
            }
            console.log(ERRORS.GET_ACIVITY_FAILURE, e);
            throw new HTTPError(500, ERRORS.GET_ACIVITY_FAILURE);
          }
          const activityResults: any[] = JSON.parse(payload.body); // Response conversion
          return activityResults;
        }
      )) as IActivity[];
  }

  public async endActivities(activities: IActivity[]): Promise<any[]> {
    const promises: Promise<any>[] = [];
    activities.forEach((activity: IActivity) => {
      promises.push(this.endActivity(activity.id));
    });

    return await Promise.all(promises);
  }

  /**
   *  Closes Activities based on the provided id
   * @param id - the activity id
   */
  public async endActivity(id: string): Promise<any> {
    const config: IInvokeConfig = this.config.getInvokeConfig();
    const invokeParams: any = {
      FunctionName: config.functions.activities.name,
      InvocationType: "RequestResponse",
      LogType: "Tail",
      Payload: JSON.stringify({
        httpMethod: "PUT",
        path: `/activities/${id}/end`,
        pathParameters: {
          id,
        },
      }),
    };
    console.log("Ending activity: ", id);
    return await this.lambdaClient
      .invoke(invokeParams)
      .then(
        (
          response: PromiseResult<Lambda.Types.InvocationResponse, AWSError>
        ) => {
          const payload: any = validateInvocationResponse(response); // Response validation
          const activityResults: any[] = JSON.parse(payload.body); // Response conversion
          return activityResults;
        }
      )
      .catch((error) => {
        console.log(
          `endActivity encountered a failure while ending Activity ${id}: `,
          error
        );
        throw new HTTPError(500, ERRORS.END_ACIVITY_FAILURE);
      });
  }
}

export { ActivityService };
