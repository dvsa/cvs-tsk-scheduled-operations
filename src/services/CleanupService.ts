import {LambdaService} from "./LambdaService";
import {ActivityService} from "./ActivityService";
import Lambda = require("aws-sdk/clients/lambda");
import {TestResultsService} from "./TestResultsService";
import {
  getActionableStaffIdsByTime,
  getLastEventTimeByTesterStaffId,
  getMostRecentActivityByTesterStaffId,
  getMostRecentTestResultByTesterStaffId, filterActivitiesByStaffId,
  getStaleOpenVisits, getTesterDetailsFromActivities,
  getTesterStaffIds,
  removeFromMap
} from "../utils/helpers";
import {IActivity, ITesterDetails, ITestResult} from "../models";
import {TIMES} from "../utils/Enums";
import {NotificationService} from "./NotificationService";


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
    const allActivities: IActivity[] = await this.activityService.getRecentActivities();
    // Get stale open visits
    const openVisits: IActivity[] = getStaleOpenVisits(allActivities);
    // Get list of staffIDs from open visits
    const openVisitStaffIds: string[] = getTesterStaffIds(openVisits);
    // Get last activity for each staffId
    const mostRecentActivities: Map<string, IActivity> = getMostRecentActivityByTesterStaffId(allActivities, openVisitStaffIds);

    // Get all Test Results By Staff Id for open visits
    const testResults: Map<string, ITestResult[]> = await this.testResultsService.getRecentTestResultsByTesterStaffId(openVisitStaffIds);
    // Get the most recent Test Result logged by the testers
    const mostRecentTestResults: Map<string, ITestResult> = getMostRecentTestResultByTesterStaffId(testResults, openVisitStaffIds);

    // Get the time of the most recent logged event, of either type taken by each tester
    const lastActionTimes: Map<string, Date> = getLastEventTimeByTesterStaffId(mostRecentActivities, mostRecentTestResults, openVisitStaffIds);

    // Get list of staff visits to close;
    const testersToCloseVisits: string[] = getActionableStaffIdsByTime(lastActionTimes,TIMES.TERMINATION_TIME);
    // Filter out closable visits
    const filteredLastActions: Map<string, Date> = removeFromMap(lastActionTimes, testersToCloseVisits);
    // Get list of staff members to notify;
    const testersToNotify: string[] = getActionableStaffIdsByTime(filteredLastActions, TIMES.NOTIFICATION_TIME);

    // Send notifications
    const userDetails: ITesterDetails[] = getTesterDetailsFromActivities(openVisits, testersToNotify);
    this.notificationService.sendVisitExpiryNotifications(userDetails);

    // Close visits
    const closingActivityDetails = filterActivitiesByStaffId(openVisits, testersToCloseVisits);
    this.activityService.endActivities(closingActivityDetails);

    return Promise.resolve();
  }
}
