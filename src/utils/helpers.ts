import { IActivity, ITesterDetails, ITestResult } from '../models';
import { uniq, maxBy } from 'lodash';
import { TIMES } from './Enums';
import { subHours, isBefore, isAfter } from 'date-fns';

export const getStaleOpenVisits = (openVisits: IActivity[]): IActivity[] => {
  const warningTime = subHours(new Date(), TIMES.NOTIFICATION_TIME);
  const staleVisits = openVisits
    .filter((a) => a.activityType === 'visit')
    .filter((a) => a.endTime === null)
    .filter((a) => isBefore(new Date(a.startTime), warningTime));
  return staleVisits;
};

export const getTesterStaffIds = (activities: IActivity[]): string[] => {
  return uniq(activities.map((a) => a.testerStaffId));
};

export const getMostRecentActivityByTesterStaffId = (
  activities: IActivity[],
  staffIds: string[],
): Map<string, IActivity> => {
  const mostRecentActivities = new Map<string, IActivity>();
  staffIds.forEach((id) => {
    const mostRecentActivity = maxBy(
      activities.filter((a) => a.testerStaffId === id),
      getActivityDateTime,
    ) as IActivity;
    mostRecentActivities.set(id, mostRecentActivity);
  });
  return mostRecentActivities;
};

export const getMostRecentTestResultByTesterStaffId = (
  testResults: Map<string, ITestResult[]>,
  staffIds: string[],
): Map<string, ITestResult> => {
  const mostRecentTestResults = new Map<string, ITestResult>();
  staffIds.forEach((id) => {
    const mostRecentTestResult = maxBy(testResults.get(id), getTestResultEndDateTime) as ITestResult;
    mostRecentTestResults.set(id, mostRecentTestResult);
  });
  return mostRecentTestResults;
};

export const getActivityDateTime = (activity: IActivity): Date => {
  // Use an end time if available, otherwise use the start time
  return new Date(activity.endTime || activity.startTime);
};

export const getTestResultEndDateTime = (testResult: ITestResult): Date => {
  return testResult?.testEndTimestamp ? new Date(testResult.testEndTimestamp) : new Date(0);
};

export const getLastEventTimeByTesterStaffId = (
  activities: Map<string, IActivity>,
  testResults: Map<string, ITestResult>,
  staffIds: string[],
): Map<string, Date> => {
  const events = new Map<string, Date>();
  staffIds.forEach((id) => {
    const activityDate = getActivityDateTime(activities.get(id) as IActivity);
    const testResultDate = getTestResultEndDateTime(testResults.get(id) as ITestResult);
    const maxDate = isAfter(activityDate, testResultDate) ? activityDate : testResultDate;
    events.set(id, maxDate);
  });
  return events;
};

export const getActionableStaffIdsByTime = (
  lastActionsByStaffId: Map<string, Date>,
  NotificationTime: number,
): string[] => {
  const notificationThresholdTime = subHours(new Date(), NotificationTime);
  const notifiableStaffIDs: string[] = [];
  lastActionsByStaffId.forEach((lastActionTime, staffID) => {
    if (isBefore(lastActionTime, notificationThresholdTime)) {
      notifiableStaffIDs.push(staffID);
    }
  });
  return notifiableStaffIDs;
};

export const removeFromMap = (map: Map<string, any>, removeIds: string[]): Map<string, any> => {
  const newMap: Map<string, any> = new Map<string, any>();
  map.forEach((val, key) => {
    if (!removeIds.includes(key)) {
      newMap.set(key, val);
    }
  });
  return newMap;
};

export const getTesterDetailsFromActivities = (activities: IActivity[], staffIds: string[]): ITesterDetails[] => {
  const details: ITesterDetails[] = [];
  staffIds.forEach((id) => {
    const email = activities?.filter((a) => a.testerStaffId === id)[0]?.testerEmail;
    if (email) {
      details.push({ email });
    }
  });
  return details;
};

/**
 * Takes a list of stale open visits, and a list of staffIds
 * @param openVisitList -
 * @param testerIds
 */
export const filterActivitiesByStaffId = (openVisitList: IActivity[], testerIds: string[]) => {
  return openVisitList.filter((visit) => testerIds.includes(visit.testerStaffId));
};
