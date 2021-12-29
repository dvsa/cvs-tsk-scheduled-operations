import {LambdaService} from "./LambdaService";
import {ActivityService, ActivityType} from "./ActivityService";
import Lambda = require("aws-sdk/clients/lambda");
import { TestResultsService } from "./TestResultsService";
import {
  getActionableStaffIdsByTime,
  getLastEventTimeByTesterStaffId,
  getMostRecentActivityByTesterStaffId,
  getMostRecentTestResultByTesterStaffId,
  filterActivitiesByStaffId,
  getStaleOpenVisits,
  getTesterDetailsFromActivities,
  getTesterStaffIds,
  removeFromMap,
} from "../utils/helpers";
import { IActivity, ITesterDetails, ITestResult } from "../models";
import { HTTPRESPONSE, TIMES } from "../utils/Enums";
import { NotificationService } from "./NotificationService";
import HTTPResponse from "../models/HTTPResponse";

export class CleanupService {
  private lambdaService: LambdaService;
  private activityService: ActivityService;
  private testResultsService: TestResultsService;
  private notificationService: NotificationService;
  constructor(notifyService: NotificationService) {
    this.lambdaService = new LambdaService(new Lambda());
    this.activityService = new ActivityService(this.lambdaService);
    this.testResultsService = new TestResultsService(this.lambdaService);
    this.notificationService = notifyService;
  }
  /**
   *
   */
  public async cleanupVisits(): Promise<any> {
      // Get all activities from last period of interest
      console.log("Getting activities");
      const visitActivities: IActivity[] = await this.activityService.getRecentActivities(ActivityType.VISIT);

      const waitActivities: IActivity[] = await this.activityService.getRecentActivities(ActivityType.WAIT);

      const unaccountableActivities: IActivity[] = await this.activityService.getRecentActivities(ActivityType.UNACCOUNTABLE_TIME);

      const allActivities: IActivity[] = visitActivities.concat(waitActivities,unaccountableActivities);
      console.log("Got Activities: ", allActivities);
      // Get stale open visits
      const openVisits: IActivity[] = getStaleOpenVisits(allActivities);
      console.log("Open Visits: ", openVisits);
      if(openVisits.length === 0) {
        return new HTTPResponse(200, HTTPRESPONSE.NOTHING_TO_DO);
      }

    // Get list of staffIDs from open visits
    const openVisitStaffIds: string[] = getTesterStaffIds(openVisits);
    console.log("Open Visit Staff Ids", openVisitStaffIds);
    // Get last activity for each staffId
    const mostRecentActivities: Map<string, IActivity> =
      getMostRecentActivityByTesterStaffId(allActivities, openVisitStaffIds);
    console.log("Most Recent Activities by Staff Id", mostRecentActivities);
    // Get all Test Results By Staff Id for open visits
    console.log("Getting Test Results");
    const testResults: Map<string, ITestResult[]> =
      await this.testResultsService.getRecentTestResultsByTesterStaffId(
        openVisitStaffIds
      );
    console.log("Test Result: ", testResults);
    // Get the most recent Test Result logged by the testers
    const mostRecentTestResults: Map<string, ITestResult> =
      getMostRecentTestResultByTesterStaffId(testResults, openVisitStaffIds);
    console.log("Most recent test result: ", mostRecentTestResults);
    // Get the time of the most recent logged event, of either type taken by each tester
    const lastActionTimes: Map<string, Date> = getLastEventTimeByTesterStaffId(
      mostRecentActivities,
      mostRecentTestResults,
      openVisitStaffIds
    );
    console.log("last Action by staff Id", lastActionTimes);
    // Get list of staff visits to close;
    const testersToCloseVisits: string[] = getActionableStaffIdsByTime(
      lastActionTimes,
      TIMES.TERMINATION_TIME
    );
    console.log("testers to Close visits: ", testersToCloseVisits);
    // Filter out closable visits
    const filteredLastActions: Map<string, Date> = removeFromMap(
      lastActionTimes,
      testersToCloseVisits
    );
    // Get list of staff members to notify;
    const testersToNotify: string[] = getActionableStaffIdsByTime(
      filteredLastActions,
      TIMES.NOTIFICATION_TIME
    );
    console.log("Testers to Notify: ", testersToNotify);
    // Send notifications
    const userDetails: ITesterDetails[] = getTesterDetailsFromActivities(
      openVisits,
      testersToNotify
    );
    console.log("user details for notification: ", userDetails);
    // Close visits
    const closingActivityDetails = filterActivitiesByStaffId(
      openVisits,
      testersToCloseVisits
    );
    try {
      await this.notificationService.sendVisitExpiryNotifications(userDetails);
      await this.activityService.endActivities(closingActivityDetails);
      return Promise.resolve();
    } catch (e) {
      return Promise.reject();
    }
  }
}
