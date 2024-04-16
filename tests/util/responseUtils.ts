import { InvocationResponse } from "@aws-sdk/client-lambda";

const wrapLambdaResponse = (payload: any) => {
  const response : InvocationResponse = {
    StatusCode: 200,
    Payload: payload
  }
  return response;
};

const wrapLambdaErrorResponse = (code: number, payload: any) => {
  const response : InvocationResponse = {
    StatusCode: code,
    Payload: payload
  }
  return response;
};

export { wrapLambdaResponse, wrapLambdaErrorResponse };
