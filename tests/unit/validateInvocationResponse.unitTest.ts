import { validateInvocationResponse } from "../../src/utils/validateInvocationResponse";
import HTTPError from "../../src/models/HTTPError";

describe("validateInvocationResponse function", () => {
  describe("when passed a response without a payload and a sub-400 error code", () => {
    it("should throw an error with the error code", () => {
      expect.assertions(1);
      try {
        validateInvocationResponse({ StatusCode: 222 });
      } catch (error) {
        expect(error.statusCode).toEqual(222);
      }
    });
  });
});
