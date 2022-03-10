import { handler } from "../../src/handler";
import { Context } from "aws-lambda";
import { CleanupService } from "../../src/services/CleanupService";
import { Configuration } from "../../src/utils/Configuration";

describe("Handler", () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  process.env.SECRET_NAME = "something";
  // @ts-ignore
  const ctx: Context = null;
  describe("parsing cleanup event", () => {
    it("invokes the cleanup function", async () => {
      const cleanupVisits = jest.fn().mockResolvedValue({});
      jest
        .spyOn(CleanupService.prototype, "cleanupVisits")
        .mockImplementation(cleanupVisits);
      jest
        .spyOn(Configuration.prototype, "getNotifyConfig")
        .mockResolvedValue({ api_key: "something", templateId: "something" });
      const event = {
        details: {
          eventName: "cleanup",
        },
      };
      await handler(event, ctx, () => {
        return;
      });
      expect(cleanupVisits).toHaveBeenCalled();
    });
  });
});
