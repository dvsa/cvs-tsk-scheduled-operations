import { validateInvocationResponse } from '../../src/utils/validateInvocationResponse';
import { wrapLambdaErrorResponse, wrapLambdaResponse } from '../util/responseUtils';

describe('validateInvocationResponse function', () => {
  describe('when passed a response without a payload and a sub-400 error code', () => {
    it('should throw an error with the error code', () => {
      expect.assertions(1);
      try {
        validateInvocationResponse(wrapLambdaErrorResponse(222, null));
      } catch (error) {
        expect(error.statusCode).toEqual(222);
      }
    });
  });
  describe('when passed a response without a payload that cannot be parsed', () => {
    it('should throw an error with the error code', () => {
      expect.assertions(1);
      try {
        validateInvocationResponse(wrapLambdaErrorResponse(222, 'test'));
      } catch (error) {
        expect(error.statusCode).toEqual(500);
      }
    });
  });
  describe('when passed a response with a payload', () => {
    describe('and the statusCode is 200', () => {
      it('should return the payload', () => {
        expect.assertions(1);
        expect(validateInvocationResponse(wrapLambdaResponse('{"statusCode":200}'))).toEqual({ statusCode: 200 });
      });
    });
    describe('and the statusCode is 201', () => {
      it('should return the payload', () => {
        expect.assertions(1);
        expect(validateInvocationResponse(wrapLambdaResponse('{"statusCode":201}'))).toEqual({ statusCode: 201 });
      });
    });
    describe('and the statusCode is 404', () => {
      it('should return the payload', () => {
        expect.assertions(1);
        expect(validateInvocationResponse(wrapLambdaResponse('{"statusCode":404}'))).toEqual(null);
      });
    });
    describe('and the statusCode is not 200, 201 or 404', () => {
      it('should throw an error with the error code', () => {
        expect.assertions(1);
        try {
          validateInvocationResponse({ Payload: '{"statusCode":418}', StatusCode: 200 });
        } catch (error) {
          expect(error.statusCode).toEqual(418);
        }
      });
    });
  });
});
