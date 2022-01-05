import {
  ActivityService,
  ActivityType,
} from "../../src/services/ActivityService";
import { LambdaService } from "../../src/services/LambdaService";
import HTTPError from "../../src/models/HTTPError";
import { wrapLambdaResponse } from "../util/responseUtils";
import activitiesResponse from "../resources/activities-response.json";
import testActivities from "../resources/testActivities.json";
import dateMock from "../util/dateMockUtils";

describe("Activity Service", () => {
  const realDate = Date;

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModuleRegistry();
  });

  describe("Constructor", () => {
    it("should set the local lambdaClient", () => {
      const mockLambdaClient = new (jest.fn())();
      const svc = new ActivityService(mockLambdaClient);
      expect((svc as any).lambdaClient).toEqual(mockLambdaClient);
    });
  });

  describe("getRecentActivities", () => {
    it("is invoking getActivities with correct param", async () => {
      // Param  should be TIMES.TERMINATION_TIME+1 before "now"
      const expectedToStartTime = "2019-05-14T11:01:58.135Z";
      dateMock.setupDateMock(expectedToStartTime);
      const expectedTime = "2019-05-13T19:01:58.135Z";
      const getActivitiesMock = jest.fn();
      jest
        .spyOn(ActivityService.prototype, "getActivities")
        .mockImplementation(getActivitiesMock);

      const svc = new ActivityService(null as unknown as LambdaService);
      await svc.getRecentActivities(ActivityType.VISIT);
      expect(getActivitiesMock.mock.calls[0][0]).toEqual({
        fromStartTime: expectedTime,
        toStartTime: expectedToStartTime,
        activityType: "visit",
      });

      dateMock.restoreDateMock();
    });
  });

  describe("getActivities", () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      jest.resetModuleRegistry();
    });

    context("when no data is returned from database", () => {
      it("should return an empty array, and no error", async () => {
        const invokeMock = jest.fn().mockResolvedValue(
          wrapLambdaResponse(
            JSON.stringify({
              body: "No resources match the search criteria",
              statusCode: 404,
            })
          )
        );
        const lambdaSvcMock = jest.fn().mockImplementation(() => {
          return { invoke: invokeMock };
        });
        const svc = new ActivityService(new lambdaSvcMock());

        expect.assertions(1);

        const output = await svc.getActivities({ fromStartTime: "2020-02-12" });
        expect(output).toEqual([]);
      });
    });

    describe("Lambda client returns a single record in expected format", () => {
      it("returns parsed result", async () => {
        const mockLambdaService = jest.fn().mockImplementation(() => {
          return {
            invoke: () =>
              Promise.resolve(
                wrapLambdaResponse(JSON.stringify(activitiesResponse))
              ),
          };
        });
        const activityService = new ActivityService(new mockLambdaService());
        const result = await activityService.getActivities({
          fromStartTime: "2020-02-12",
        });
        expect(result).toEqual(JSON.parse(activitiesResponse.body));
      });
    });
  });

  describe("endActivities", () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      jest.resetModuleRegistry();
    });

    describe("when the endActivity function throws an error", () => {
      it("endActivities should throw that error upward", async () => {
        jest
          .spyOn(ActivityService.prototype, "endActivity")
          .mockRejectedValue(new HTTPError(418, "bad things"));
        const lambdaSvcMock = jest.fn();
        const svc = new ActivityService(new lambdaSvcMock());
        expect.assertions(2);
        try {
          await svc.endActivities([testActivities[0]]);
        } catch (e) {
          expect(e.statusCode).toEqual(418);
          expect(e.body).toEqual("bad things");
        }
      });
    });

    describe("when no errors are thrown by endActivity service calls", () => {
      it("returns array of results", async () => {
        jest
          .spyOn(ActivityService.prototype, "endActivity")
          .mockResolvedValue("looks good");
        const lambdaSvcMock = jest.fn();
        const svc = new ActivityService(new lambdaSvcMock());
        expect.assertions(2);

        const output: any[] = await svc.endActivities(testActivities);
        expect(output).toHaveLength(testActivities.length);
        expect(output.every((i) => i === "looks good")).toBeTruthy();
      });
    });
  });
});
