import {
  filterActivitiesByStaffId,
  getActivityDateTime,
  getLastEventTimeByTesterStaffId,
  getMostRecentActivityByTesterStaffId,
  getMostRecentTestResultByTesterStaffId,
  getStaleOpenVisits,
  getTesterDetailsFromActivities,
  getTesterStaffIds,
  getTestResultEndDateTime,
  removeFromMap,
} from "../../src/utils/helpers";
import testActivities from "../resources/testActivities.json";
import testResults from "../resources/testTestResults.json";
import { cloneDeep } from "lodash";
import { IActivity, ITesterDetails, ITestResult } from "../../src/models";
import HTTPResponse from "../../src/models/HTTPResponse";

describe("Activity Helper functions", () => {
  describe("getMostRecentActivityByTesterStaffId", () => {
    describe("when passed an array of activities and a staffId with activities in the array", () => {
      const activities: IActivity[] = cloneDeep(testActivities);
      const staffID = "abc123";
      const output: Map<string, IActivity> =
        getMostRecentActivityByTesterStaffId(activities, [staffID]);
      it("Should only use records matching the staffId", () => {
        expect((output.get(staffID) as IActivity).testerStaffId).toEqual(
          staffID
        );
      });
      it("Should the latest record for the staffId", () => {
        expect(output.get(staffID) as IActivity).toEqual(activities[1]);
      });
      it("Should use startTime for sorting if endTime is missing", () => {
        const activities2: IActivity[] = cloneDeep(testActivities);
        activities2[1].endTime = null;
        const output2: Map<string, IActivity> =
          getMostRecentActivityByTesterStaffId(activities2, [staffID]);
        expect(output2.get(staffID) as IActivity).toEqual(activities2[1]);
      });
    });
    describe("when passed an empty array", () => {
      it("should return a map of size matching the staffId array, but empty results", () => {
        const output = getMostRecentActivityByTesterStaffId([], ["anything"]);
        expect(output).toBeInstanceOf(Map);
        expect(output.size).toEqual(1);
        expect(output.get("anything")).toEqual(undefined);
      });
    });
  });

  describe("getStaleOpenVisits", () => {
    describe("when passed an array of activities", () => {
      describe("and a visit with no end time, and an old start time is present", () => {
        it(`only returns visit activities, with no endTime, with a startTime more than NOTIFICATION_TIME hours old`, () => {
          const activities: IActivity[] = cloneDeep(testActivities);
          activities[0].startTime = new Date().toISOString();
          activities[0].activityType = "visit";
          activities[0].endTime = null;
          activities[0].startTime = "2020-03-05T13:29:45.938Z";
          expect(getStaleOpenVisits(activities)).toHaveLength(1);
        });
      });
      describe("and no stale visits are present", () => {
        it(`returns an empty array, and does not error`, () => {
          const endedActivities = testActivities.filter((a) => a.endTime);
          expect.assertions(1);
          const output = getStaleOpenVisits(endedActivities);
          expect(output).toEqual([]);
        });
      });
    });
  });

  describe("getTesterStaffIds", () => {
    describe("when passed an array of activities", () => {
      const activities: IActivity[] = cloneDeep(testActivities);
      const output = getTesterStaffIds(activities);
      it("extracts the IDs into a new array", () => {
        expect(output[0]).toEqual(activities[0].testerStaffId);
        expect(output[1]).toEqual(activities[4].testerStaffId);
      });
      it("only returns unique values", () => {
        expect(output).toHaveLength(2);
      });
    });
  });

  describe("getActivityDateTime", () => {
    const activities: IActivity[] = cloneDeep(testActivities);
    it("should extract endTime from an activity, if present", () => {
      expect(activities[0].endTime).not.toBeUndefined();
      expect(activities[0].endTime).not.toBeNull();
      expect(getActivityDateTime(activities[0])).toEqual(
        new Date(activities[0].endTime as string)
      );
    });
    it("should extract the startTime from activity, if endTime is not present", () => {
      activities[1].endTime = null;
      expect(getActivityDateTime(activities[1])).toEqual(
        new Date(activities[1].startTime)
      );
    });
  });

  describe("getTestResultEndDateTime", () => {
    describe("when passed a valid test result wth defined testEndTimestamp", () => {
      it("extract the endDate of a test result, as a date object", () => {
        const tests = cloneDeep(testResults);
        const output = getTestResultEndDateTime(tests[0]);
        expect(output instanceof Date).toBeTruthy();
        expect(output).toEqual(new Date(tests[0].testEndTimestamp));
      });
    });
    describe("when passed a test result wth a falsy testEndTimestamp", () => {
      it("returns the default Linux Epoch 'beginning of time' date", () => {
        const tests = cloneDeep(testResults);
        // @ts-ignore
        tests[0].testEndTimestamp = null;
        expect(getTestResultEndDateTime(tests[0])).toEqual(
          new Date("1970-01-01T00:00:00.000Z")
        );
        // @ts-ignore
        tests[0].testEndTimestamp = undefined;
        expect(getTestResultEndDateTime(tests[0])).toEqual(
          new Date("1970-01-01T00:00:00.000Z")
        );
        delete tests[0].testEndTimestamp;
        expect(getTestResultEndDateTime(tests[0])).toEqual(
          new Date("1970-01-01T00:00:00.000Z")
        );
        // @ts-ignore
        expect(getTestResultEndDateTime(undefined)).toEqual(
          new Date("1970-01-01T00:00:00.000Z")
        );
      });
    });
  });

  describe("removeFromMap", () => {
    it("should remove KeyVal pairs specified with the specified keys and return all others", () => {
      const myMap = new Map([
        ["key1", "val1"],
        ["key2", "val2"],
        ["key3", "val3"],
        ["key4", "val4"],
      ]);
      expect(myMap.size).toEqual(4);
      const output = removeFromMap(myMap, ["key1", "key4"]);
      expect(output.size).toEqual(2);
      expect(output.get("key1")).toBeUndefined();
      expect(output.get("key2")).toEqual("val2");
    });
  });

  describe("getTesterDetailsFromActivities", () => {
    describe("when passed a list of activities", () => {
      describe("and the passed staff IDs are present in the activities list", () => {
        it("extracts the tester details from the activities", () => {
          const activities: IActivity[] = cloneDeep(testActivities);
          const output: ITesterDetails[] = getTesterDetailsFromActivities(
            activities,
            [activities[0].testerStaffId]
          );
          expect(output).toHaveLength(1);
          expect(output[0].email).toEqual(activities[0].testerEmail);
        });
      });

      describe("and the passed staff IDs are not present in the activities list", () => {
        it("should return an empty array", () => {
          const activities: IActivity[] = cloneDeep(testActivities);
          const output: ITesterDetails[] = getTesterDetailsFromActivities(
            activities,
            ["not present"]
          );
          expect(output).toHaveLength(0);
        });
      });
    });

    describe("when passed no activities", () => {
      it("should return an empty array", () => {
        // @ts-ignore
        const output: ITesterDetails[] = getTesterDetailsFromActivities(
          undefined as any,
          ["not present"]
        );
        expect(output).toHaveLength(0);
      });
    });
  });

  describe("filterActivitiesByStaffId", () => {
    it("removes array members with non-matching staff IDs", () => {
      const activities = cloneDeep(testActivities);
      activities[0].testerStaffId = "aaaa";
      activities[1].testerStaffId = "bbbb";
      activities[2].testerStaffId = "cccc";
      activities[3].testerStaffId = "cccc";
      const output = filterActivitiesByStaffId(activities, ["aaaa", "cccc"]);
      expect(output).toHaveLength(3);
      expect(output).toContain(activities[0]);
      expect(output).toContain(activities[2]);
      expect(output).toContain(activities[3]);
      expect(output).not.toContain(activities[1]);
    });
  });

  describe("getMostRecentActivityByTesterStaffId", () => {
    describe("when passed an array of activities", () => {
      const activities: IActivity[] = cloneDeep(testActivities);
      describe("and the specified tester ID has activities in the array", () => {
        const testerId = activities[0].testerStaffId;
        it("should return a map with just the latest activity, per tester ID", () => {
          const output = getMostRecentActivityByTesterStaffId(activities, [
            testerId,
          ]);
          expect(output.get(testerId)).not.toBeUndefined();
          expect(output.get(testerId)).toEqual(activities[1]);
        });
      });

      describe("and the specified tester ID does not have activities in the array", () => {
        const testerId = "something";
        it("should not add the record to the map", () => {
          const output = getMostRecentActivityByTesterStaffId(activities, [
            testerId,
          ]);
          expect(output.get(testerId)).toBeUndefined();
        });
      });
    });

    describe("when passed an empty array of activities", () => {
      const testerId = "something";
      it("should not add a date to the map", () => {
        const output = getMostRecentActivityByTesterStaffId([], [testerId]);
        expect(output.get(testerId)).toBeUndefined();
      });
    });
  });

  describe("getMostRecentTestResultByTesterStaffId", () => {
    describe("when passed a Map of Test Results", () => {
      const results = cloneDeep(testResults);
      const testerId = results[0].testerStaffId;
      const testerResults = results.filter((t) => t.testerStaffId === testerId);
      const resultsMap = new Map([[testerId, testerResults]]);
      describe("and the specified tester ID is present in the map", () => {
        it("should return a map with just the latest activity, per tester ID", () => {
          const output = getMostRecentTestResultByTesterStaffId(resultsMap, [
            testerId,
          ]);
          expect(output.get(testerId)).not.toBeUndefined();
          expect(output.get(testerId)).toEqual(results[1]);
          expect(output.size).toEqual(1);
        });
      });

      describe("and the specified tester ID is NOT present in the map", () => {
        const newTesterId = "something";
        it("should not add a date to the map", () => {
          const output = getMostRecentTestResultByTesterStaffId(resultsMap, [
            newTesterId,
          ]);
          expect(output.get(newTesterId)).toBeUndefined();
        });
      });
    });

    describe("when passed an empty array of activities", () => {
      const testerId = "something";
      it("should not add the record to the map", () => {
        const output = getMostRecentTestResultByTesterStaffId(
          new Map<string, ITestResult[]>(),
          [testerId]
        );
        expect(output.get(testerId)).toBeUndefined();
      });
    });
  });

  describe("getLastEventTimeByTesterStaffId", () => {
    describe("When passed two maps, containing a single test record and a single activity, per staffID", () => {
      const testerID = "abc123";
      const activities = cloneDeep(testActivities);
      const results = cloneDeep(testResults);
      describe("and the Test is newer than the activity", () => {
        it("returns a map, with the values for a the given staff ID being a date object of the test result", () => {
          activities[0].endTime = "2020-03-04T13:29:45.938Z";
          results[0].testEndTimestamp = "2021-03-04T13:29:45.938Z";
          const actMap: Map<string, IActivity> = new Map([
            [testerID, activities[0]],
          ]);
          const testResMap: Map<string, ITestResult> = new Map([
            [testerID, results[0]],
          ]);
          expect(
            getLastEventTimeByTesterStaffId(actMap, testResMap, [testerID]).get(
              testerID
            )
          ).toEqual(new Date(results[0].testEndTimestamp));
        });
      });
      describe("and the activity is newer than the test", () => {
        it("returns a date object of the activity", () => {
          activities[0].endTime = "2021-03-04T13:29:45.938Z";
          results[0].testEndTimestamp = "2020-03-04T13:29:45.938Z";
          const actMap: Map<string, IActivity> = new Map([
            [testerID, activities[0]],
          ]);
          const testResMap: Map<string, ITestResult> = new Map([
            [testerID, results[0]],
          ]);
          expect(
            getLastEventTimeByTesterStaffId(actMap, testResMap, [testerID]).get(
              testerID
            )
          ).toEqual(new Date(activities[0].endTime));
        });
      });
    });

    describe("when one of the maps has undefined for the staff ID", () => {
      const testerID = "abc123";
      const activities = cloneDeep(testActivities);
      const results = cloneDeep(testResults);
      it("should return the value of the other without erroring", () => {
        const actMap: Map<string, IActivity> = new Map([
          [testerID, activities[0]],
        ]);
        // @ts-ignore
        const testResMap: Map<string, ITestResult> = new Map([
          [testerID, undefined],
        ]);
        expect(
          getLastEventTimeByTesterStaffId(actMap, testResMap, [testerID]).get(
            testerID
          )
        ).toEqual(new Date(activities[0].endTime));
      });
    });
  });
});
