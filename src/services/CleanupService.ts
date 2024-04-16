import { LambdaService } from './LambdaService';
import { ActivityService } from './ActivityService';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { TestResultsService } from './TestResultsService';
import { IActivity, ILogVisit, ITestResult } from '../models';
import { ACTIVITY_TYPE, HTTPRESPONSE, LOG_ACTIONS, LOG_REASONS, LOG_STATUS, TIMES } from '../utils/Enums';
import { NotificationService } from './NotificationService';
import HTTPResponse from '../models/HTTPResponse';
import { subHours } from 'date-fns';
import moment from 'moment';

export class CleanupService {
  private readonly lambdaService: LambdaService;
  private readonly activityService: ActivityService;
  private readonly testResultsService: TestResultsService;
  private readonly notificationService: NotificationService;
  private logVisits: ILogVisit[] = [];

  constructor(notifyService: NotificationService) {
    this.lambdaService = new LambdaService(new LambdaClient());
    this.activityService = new ActivityService(this.lambdaService);
    this.testResultsService = new TestResultsService(this.lambdaService);
    this.notificationService = notifyService;
  }

  public async cleanupVisits(): Promise<any> {
    const processStartTime: Date = new Date();
    const recentActivityWindowTime: Date = new Date(subHours(processStartTime, TIMES.NOTIFICATION_TIME));
    const terminationWindowTime: Date = new Date(subHours(processStartTime, TIMES.TERMINATION_TIME));

    try {
      // This goes to get all the open visits
      const openVisits: IActivity[] = await this.activityService.getActivitiesList(ACTIVITY_TYPE.VISIT, '');
      const actionVisits: IActivity[] = [];
      let activities: IActivity[] = [];
      let testResults: ITestResult[] = [];

      // No open visits, log message, return and stop process
      if (openVisits.length === 0) {
        console.log(`200 ${HTTPRESPONSE.NOTHING_TO_DO}`);
        return new HTTPResponse(200, HTTPRESPONSE.NOTHING_TO_DO);
      }

      // Loop around open visits
      for (const visit of openVisits) {
        if (moment(new Date(visit.startTime)).isAfter(recentActivityWindowTime)) {
          // Visit open less than 3 hours, no action needed
          this.addToLogVisits(
            visit.id,
            visit.testerStaffId,
            visit.startTime,
            visit.startTime,
            LOG_ACTIONS.NO_ACTION,
            LOG_REASONS.VISIT_WITHIN_3_HOURS,
            'OK',
          );
        } else {
          // Visit open more than 3 hours, add to array for action
          actionVisits.push(visit);
        }
      }

      // No open visits added to array in previous logic, no action needed
      // log message, return and stop process
      if (actionVisits.length === 0) {
        console.log(`200 ${HTTPRESPONSE.NOTHING_TO_DO}`);
        return new HTTPResponse(200, HTTPRESPONSE.NOTHING_TO_DO);
      }

      // Loop around visits that need actioning
      for (const visit of actionVisits) {
        let visitActionTimes: string[] = [];

        // Get wait and unaccountable times for this visit
        activities = [
          ...(await this.activityService.getActivitiesList(ACTIVITY_TYPE.WAIT, visit.startTime, visit.testerStaffId)),
          ...(await this.activityService.getActivitiesList(
            ACTIVITY_TYPE.UNACCOUNTABLE_TIME,
            visit.startTime,
            visit.testerStaffId,
          )),
        ];

        // Get test results for this visit
        testResults = await this.testResultsService.getRecentTestResultsByTesterStaffId(
          visit.testerStaffId,
          visit.startTime,
        );

        // Concatenate wait, unaccountable and test results into one list
        visitActionTimes = this.populateVisitActionTimes(activities, visitActionTimes);
        visitActionTimes = this.populateVisitActionTimes(testResults, visitActionTimes);

        // Sort list of wait, unaccountable and test results into most recent order
        const mostRecentActionTime = this.sortVisitActionTimes(visitActionTimes);
        const lastActionTime = mostRecentActionTime ? mostRecentActionTime : visit.startTime;

        if (moment(new Date(lastActionTime)).isBefore(terminationWindowTime)) {
          // last action time is more than 4 hours ago, close the visit
          try {
            await this.activityService.endVisit(visit.id, lastActionTime);
            this.addToLogVisits(
              visit.id,
              visit.testerStaffId,
              visit.startTime,
              lastActionTime,
              LOG_ACTIONS.CLOSE,
              LOG_REASONS.LAST_ACTION_OVER_4_HOURS,
              LOG_STATUS.CLOSED_OK,
            );
          } catch (e) {
            this.addToLogVisits(
              visit.id,
              visit.testerStaffId,
              visit.startTime,
              lastActionTime,
              LOG_ACTIONS.CLOSE,
              LOG_REASONS.LAST_ACTION_OVER_4_HOURS,
              LOG_STATUS.CLOSED_FAIL,
              `${e.statusCode}: ${e.body}`,
            );
          }
        } else if (moment(new Date(lastActionTime)).isBefore(recentActivityWindowTime)) {
          // last action time is more than 3 hours but less than 4 hours, send notification email
          try {
            await this.notificationService.sendVisitExpiryNotification(visit);
            this.addToLogVisits(
              visit.id,
              visit.testerStaffId,
              visit.startTime,
              lastActionTime,
              LOG_ACTIONS.NOTIFY,
              LOG_REASONS.LAST_ACTION_OVER_3_HOURS,
              LOG_STATUS.NOTIFY_OK,
            );
          } catch (e) {
            this.addToLogVisits(
              visit.id,
              visit.testerStaffId,
              visit.startTime,
              lastActionTime,
              LOG_ACTIONS.NOTIFY,
              LOG_REASONS.LAST_ACTION_OVER_3_HOURS,
              LOG_STATUS.NOTIFY_FAIL,
              e.message,
            );
          }
        } else {
          // last action time under 3 hours, no action required
          this.addToLogVisits(
            visit.id,
            visit.testerStaffId,
            visit.startTime,
            lastActionTime,
            LOG_ACTIONS.NO_ACTION,
            LOG_REASONS.LAST_ACTION_UNDER_3_HOURS,
            LOG_STATUS.NO_ACTION,
          );
        }
      }
      // Output status of all open visits and what action was taken
      console.log(
        `** RESULTS **\nProcess start time is: ${processStartTime.toISOString()} \n${JSON.stringify(this.logVisits)}`,
      );
      return Promise.resolve();
    } catch (e) {
      console.log('Error: ' + e);
      return Promise.reject();
    }
  }

  /**
   * This method adds the end time for each activity or test result to a list of visitActionTimes
   * @param list List of wait time, unaccountable time and test results
   * @param visitActionTimes List of action times for visit
   */
  public populateVisitActionTimes(list: any[], visitActionTimes: string[]): string[] {
    if (list !== undefined && list.length > 0) {
      list.forEach((x) => {
        // If it is there is an endTime, it will add the endTime (activity) to the list.
        // Otherwise, it will add the testEndTimestamp from the test result
        if (x.endTime) {
          visitActionTimes.push(x.endTime);
        } else if (x.testEndTimestamp) {
          visitActionTimes.push(x.testEndTimestamp);
        }
      });
    }
    return visitActionTimes;
  }

  /**
   * This method sorts the list of visitActionTimes and returns the most recent time
   * @param visitActionTimes List of end times
   */
  public sortVisitActionTimes(visitActionTimes: string[]): string | undefined {
    if (visitActionTimes.length > 0) {
      return visitActionTimes.reduce((a, b) => (a > b ? a : b));
    }
  }

  /**
   * This method is going to add a log visit to the log visit array
   * @param visitId Activity id of visit
   * @param testerStaffId Tester staff id
   * @param visitStartTime Visit start time
   * @param lastActionTime End time used for closure
   * @param action  Action taken
   * @param reason  Reason for action
   * @param status  Status
   * @param message Conditional error message
   */
  public addToLogVisits(
    visitId: string,
    testerStaffId: string,
    visitStartTime: string,
    lastActionTime: string,
    action: string,
    reason: string,
    status: string,
    message?: string,
  ) {
    const logVisit: ILogVisit = {
      visitId,
      testerStaffId,
      visitStartTime,
      lastActionTime,
      action,
      reason,
      status,
      message,
    };
    this.logVisits.push(logVisit);
  }
}
