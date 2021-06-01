import {APIGatewayProxyResult, Callback, Context, Handler} from "aws-lambda";
import Path from "path-parser";
import { Configuration } from "./utils/Configuration";
import HTTPResponse from "./models/HTTPResponse";
import {IFunctionEvent} from "./models";
import {HTTPRESPONSE} from "./utils/Enums";

const handler: Handler = async (event: any, context: Context, callback: Callback): Promise<APIGatewayProxyResult> => {
  // Request integrity checks
  if (!event) {
    console.error()
  }

  if (event.body) {
    let payload: any = {};

    try {
      payload = JSON.parse(event.body);
    } catch (e) {
      return new HTTPResponse(400, HTTPRESPONSE.NOT_VALID_JSON);
    }

    Object.assign(event, { body: payload });
  }

  // Finding an appropriate λ matching the request
  const config: Configuration = Configuration.getInstance();
  const functions: IFunctionEvent[] = config.getFunctions();
  // const serverlessConfig: any = config.getConfig().serverless;

  const matchingLambdaEvents: IFunctionEvent[] = functions.filter((fn) => {
      // Find λ with matching event name
      return fn.eventName === event.details.eventName
    });

  // Exactly one λ should match the above filtering.
  if (matchingLambdaEvents.length === 1) {
    const lambdaEvent: IFunctionEvent = matchingLambdaEvents[0];
    const lambdaFn: Handler = lambdaEvent.function;

    console.log(`invoking ${lambdaEvent.name} function `);

    // Explicit conversion because typescript can't figure it out
    return lambdaFn(event, context, callback) as Promise<APIGatewayProxyResult>;
  }
  if (matchingLambdaEvents.length > 1) {
    console.error(`Error: More than one function identified for route ${event.httpMethod} ${event.path} matched ${matchingLambdaEvents.map((lambda) => lambda.name)}
    Dumping event:
    ${JSON.stringify(event)}
    Dumping context:
    ${JSON.stringify(context)}`);
  } else {
    // If filtering results in less or more λ functions than expected, we return an error.
    console.error(`Error: Route ${event.httpMethod} ${event.path} was not found.
    Dumping event:
    ${JSON.stringify(event)}
    Dumping context:
    ${JSON.stringify(context)}`);
  }



  return new HTTPResponse(400, { error: `Route ${event.httpMethod} ${event.path} was not found.` });
};

export { handler };
