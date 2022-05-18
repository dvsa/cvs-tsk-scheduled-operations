import HTTPError from '../models/HTTPError';
/**
 * Validates the invocation response
 * @param response - the invocation response
 */
export const validateInvocationResponse = (response: any) => {
  if ((!response.Payload || response.Payload === '') && response.StatusCode && response.StatusCode < 400) {
    throw new HTTPError(
      response.StatusCode,
      `Lambda invocation returned error: ${response.StatusCode} with empty payload.`,
    );
  }

  let payload: any;

  try {
    payload = JSON.parse(response.Payload);
  } catch (error) {
    console.log('validateInvocationResponse response parse error', response);
    throw new HTTPError(500, `Lambda invocation returned bad data: ${response.Payload}`);
  }

  switch (payload.statusCode) {
    case 200:
    case 201:
      return payload;
    case 404:
      return null;
    default:
      throw new HTTPError(payload.statusCode, `Lambda invocation returned error: ${payload.statusCode} ${payload}`);
  }
};
