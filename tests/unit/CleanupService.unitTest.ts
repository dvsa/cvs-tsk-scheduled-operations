import { CleanupService } from '../../src/services/CleanupService';
import { ActivityService } from '../../src/services/ActivityService';
import activities from '../resources/testActivities.json';
import testResults from '../resources/testTestResults.json';
import { TestResultsService } from '../../src/services/TestResultsService';
import { cloneDeep } from 'lodash';
import dateMock from '../util/dateMockUtils';
import { ERRORS, HTTPRESPONSE } from '../../src/utils/Enums';
import { subMinutes } from 'date-fns';
import { NotificationService } from '../../src/services/NotificationService';
import HTTPError from '../../src/models/HTTPError';
import {ActivitySchema} from "@dvsa/cvs-type-definitions/types/v1/activity";

jest.mock('../../src/services/ActivityService');

describe('Cleanup Service', () => {
  afterEach(() => {
    jest.resetModules();
    dateMock.restoreDateMock();
  });

  describe('With no visit deserving of action', () => {
    it("returns 200 ok, with 'nothing to do' message", async () => {
      expect.assertions(2);
      const mock = jest.spyOn(ActivityService.prototype, 'getActivitiesList').mockResolvedValue([]);
      const svc = new CleanupService(new (jest.fn())());
      const output = await svc.cleanupVisits();
      expect(output.statusCode).toEqual(200);
      expect(output.body).toEqual(JSON.stringify(HTTPRESPONSE.NOTHING_TO_DO));
      mock.mockClear();
    });
  });

  describe('With a visit deserving of no action', () => {
    it("returns 200 ok, with 'nothing to do' message", async () => {
      expect.assertions(2);
      const allActivities: ActivitySchema[] = cloneDeep([activities[0]] as ActivitySchema[]);
      const freshActivities = allActivities.map((a) => {
        a.startTime = new Date().toISOString();
        a.endTime = null;
        return a;
      });
      const mock = jest.spyOn(ActivityService.prototype, 'getActivitiesList').mockResolvedValue(freshActivities);
      const svc = new CleanupService(new (jest.fn())());
      const output = await svc.cleanupVisits();
      expect(output.statusCode).toEqual(200);
      expect(output.body).toEqual(JSON.stringify(HTTPRESPONSE.NOTHING_TO_DO));
      mock.mockClear();
    });
    it("returns 200 ok, with 'nothing to do' message after processing activities that required no action", async () => {
      jest.resetAllMocks();
      console.log = jest.fn();
      const allActivities: ActivitySchema[] = cloneDeep(activities) as ActivitySchema[];
      allActivities[0].startTime = new Date(subMinutes(new Date(), 240)).toISOString();
      allActivities[3].endTime = null;
      allActivities[4].endTime = new Date(subMinutes(new Date(), 30)).toISOString();

      ActivityService.prototype.getActivitiesList = jest.fn().mockResolvedValue(allActivities);
      TestResultsService.prototype.getTestResults = jest.fn().mockImplementation((params) => {
        return testResults.filter((t) => t.testerStaffId === params.testerStaffId);
      });
      const mockNotifyClient = jest.fn();
      const svc = new CleanupService(new NotificationService(mockNotifyClient));
      await svc.cleanupVisits();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Last action time under 3 hours ago'));
      expect(console.log).toHaveBeenCalledTimes(1);
    });
  });

  describe('With a visit deserving of Termination', () => {
    it('correctly tries to terminate the activity using test result end time, without sending a notification', async () => {
      jest.resetAllMocks();
      console.log = jest.fn();
      dateMock.setupDateMock('2020-03-05T17:29:45.938Z');
      const sendNotifyMock = jest.fn();
      const notifySvcMock = jest.fn().mockImplementation(() => {
        return {
          sendVisitExpiryNotifications: sendNotifyMock,
        };
      });
      const allActivities: ActivitySchema[] = cloneDeep([activities[0]] as ActivitySchema[]);
      const staleActivities = allActivities.map((a) => {
        a.endTime = null;
        return a;
      });

      ActivityService.prototype.getActivitiesList = jest.fn().mockResolvedValue(staleActivities);
      ActivityService.prototype.endVisit = jest.fn();
      TestResultsService.prototype.getTestResults = jest.fn().mockImplementation((params) => {
        return testResults.filter((t) => t.testerStaffId === params.testerStaffId);
      });
      const svc = new CleanupService(new notifySvcMock());
      await svc.cleanupVisits();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Closed'));
      expect(console.log).toHaveBeenCalledTimes(1);
    });
    it('correctly tries to terminate the activity using visit start time, without sending a notification', async () => {
      jest.resetAllMocks();
      console.log = jest.fn();
      dateMock.setupDateMock('2020-03-05T17:29:45.938Z');
      const sendNotifyMock = jest.fn();
      const notifySvcMock = jest.fn().mockImplementation(() => {
        return {
          sendVisitExpiryNotifications: sendNotifyMock,
        };
      });
      const allActivities: ActivitySchema[] = cloneDeep([activities[0]] as ActivitySchema[]);
      const staleActivities = allActivities.map((a) => {
        a.endTime = null;
        return a;
      });

      ActivityService.prototype.getActivitiesList = jest.fn().mockResolvedValue(staleActivities);
      ActivityService.prototype.endVisit = jest.fn();
      TestResultsService.prototype.getTestResults = jest.fn().mockResolvedValue([]);
      const svc = new CleanupService(new notifySvcMock());
      await svc.cleanupVisits();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Closed'));
      expect(console.log).toHaveBeenCalledTimes(1);
    });
    it('correctly tries to terminate the activity, but exception is caught', async () => {
      jest.resetAllMocks();
      console.log = jest.fn();
      dateMock.setupDateMock('2020-03-05T17:29:45.938Z');
      const sendNotifyMock = jest.fn();
      const notifySvcMock = jest.fn().mockImplementation(() => {
        return {
          sendVisitExpiryNotifications: sendNotifyMock,
        };
      });
      const allActivities: ActivitySchema[] = cloneDeep([activities[0] as ActivitySchema]);
      const staleActivities = allActivities.map((a) => {
        a.endTime = null;
        return a;
      });

      ActivityService.prototype.getActivitiesList = jest.fn().mockResolvedValue(staleActivities);
      ActivityService.prototype.endVisit = jest.fn().mockImplementation(() => {
        throw new HTTPError(500, ERRORS.END_ACTIVITY_FAILURE);
      });
      TestResultsService.prototype.getTestResults = jest.fn().mockImplementation((params) => {
        return testResults.filter((t) => t.testerStaffId === params.testerStaffId);
      });
      const svc = new CleanupService(new notifySvcMock());
      await svc.cleanupVisits();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('500: Ending activities encountered failures'));
      expect(console.log).toHaveBeenCalledTimes(1);
    });
  });

  describe('With a visit deserving of Notification', () => {
    it('correctly tries to send the notification', async () => {
      jest.resetAllMocks();
      console.log = jest.fn();
      const allActivities: ActivitySchema[] = cloneDeep(activities) as ActivitySchema[];
      allActivities[3].startTime = new Date(subMinutes(new Date(), 240)).toISOString();
      allActivities[3].endTime = null;
      allActivities[4].endTime = new Date(subMinutes(new Date(), 210)).toISOString();

      ActivityService.prototype.getActivitiesList = jest.fn().mockResolvedValue(allActivities);
      TestResultsService.prototype.getTestResults = jest.fn().mockImplementation((params) => {
        return testResults.filter((t) => t.testerStaffId === params.testerStaffId);
      });
      NotificationService.prototype.sendVisitExpiryNotification = jest.fn().mockImplementation((params) => {
        return Promise.resolve();
      });
      const mockNotifyClient = jest.fn();
      const svc = new CleanupService(new NotificationService(mockNotifyClient));
      await svc.cleanupVisits();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Notification email sent'));
      expect(console.log).toHaveBeenCalledTimes(1);
    });
    it('correctly tries to send the notification but exception is caught', async () => {
      jest.resetAllMocks();
      console.log = jest.fn();
      const sendNotifyMock = jest.fn();
      const notifySvcMock = jest.fn().mockImplementation(() => {
        return {
          sendVisitExpiryNotifications: sendNotifyMock,
        };
      });
      const allActivities: ActivitySchema[] = cloneDeep(activities) as ActivitySchema[];
      allActivities[3].startTime = new Date(subMinutes(new Date(), 240)).toISOString();
      allActivities[3].endTime = null;
      allActivities[4].endTime = new Date(subMinutes(new Date(), 210)).toISOString();

      ActivityService.prototype.getActivitiesList = jest.fn().mockResolvedValue(allActivities);
      TestResultsService.prototype.getTestResults = jest.fn().mockImplementation((params) => {
        return testResults.filter((t) => t.testerStaffId === params.testerStaffId);
      });
      const svc = new CleanupService(new notifySvcMock());
      await svc.cleanupVisits();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Notification email failed to send'));
      expect(console.log).toHaveBeenCalledTimes(1);
    });
  });

  describe('With exception caught in try/catch at top level of Cleanup Service', () => {
    it('should log the error', async () => {
      jest.resetAllMocks();
      console.log = jest.fn();
      jest.spyOn(ActivityService.prototype, 'getActivitiesList').mockRejectedValue(new HTTPError(418, 'bad things'));
      const svc = new CleanupService(new (jest.fn())());
      try {
        await svc.cleanupVisits();
      } catch (e) {
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Error: '));
      }
    });
  });
});
