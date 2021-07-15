import { AWSError, Lambda, Response } from "aws-sdk";

const wrapLambdaResponse = (payload: any) => {
  const response = new Response<Lambda.Types.InvocationResponse, AWSError>();
  Object.assign(response, {
    data: {
      StatusCode: 200,
      Payload: payload,
    },
  });
  return {
    $response: response,
    StatusCode: 200,
    Payload: payload,
  };
};

const wrapLambdaErrorResponse = (code: number, payload: any) => {
  const response = new Response<Lambda.Types.InvocationResponse, AWSError>();
  Object.assign(response, {
    data: {
      StatusCode: code,
      Payload: payload,
    },
  });
  return {
    $response: response,
    StatusCode: code,
    Payload: payload,
  };
};

export { wrapLambdaResponse, wrapLambdaErrorResponse };
