import { NotificationService } from '../../src/services/NotificationService';
import HTTPError from '../../src/models/HTTPError';
import { ActivitySchema } from "@dvsa/cvs-type-definitions/types/v1/activity";
import { TestStationTypes } from "@dvsa/cvs-type-definitions/types/v1/enums/testStationType.enum";
import { ActivityType } from "@dvsa/cvs-type-definitions/types/v1/enums/activityType.enum";

describe('Notification Service', () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });
  describe('sendVisitExpiryNotifications', () => {
    const visit: ActivitySchema = {
      id: '123',
      activityType: ActivityType.VISIT,
      testerName: 'Tester1',
      testerStaffId: '123456',
      testerEmail: 'test1@test.com',
      startTime: '2022-01-01T12:00:45.938Z',
      endTime: null,
      testStationEmail: "some.name@dvsatest.co.uk",
      testStationName: "Some Name",
      testStationPNumber: "P123",
      testStationType: TestStationTypes.ATF,
    };
    describe('when passed an array of UserDetails', () => {
      it('invokes sendNotification once per arrayItem, with correct Params', async () => {
        expect.assertions(3);
        const sendEmailSpy = jest.fn().mockResolvedValue('');
        const notifSpy = jest.fn().mockImplementation(() => {
          return {
            sendEmail: sendEmailSpy,
          };
        });
        const svc = new NotificationService(new notifSpy());
        await svc.sendVisitExpiryNotification(visit);
        expect(sendEmailSpy.mock.calls).toHaveLength(1);
        expect(sendEmailSpy.mock.calls[0][0]).toEqual('2af4ff8e-af5b-4f32-80a9-d03719180647');
        expect(sendEmailSpy.mock.calls[0][1]).toEqual('test1@test.com');
      });
      describe('and the notifyClient returns success', () => {
        it('returns an array of promise resolution values', async () => {
          expect.assertions(2);
          const sendEmailSpy = jest.fn().mockResolvedValue('all good');
          const notifSpy = jest.fn().mockImplementation(() => {
            return {
              sendEmail: sendEmailSpy,
            };
          });

          const svc = new NotificationService(new notifSpy());
          const output = await svc.sendVisitExpiryNotification(visit);
          expect(output).toHaveLength(8);
          expect(output).toEqual('all good');
        });
      });
      describe('and the notifyClient returns any failure', () => {
        it('throws an error', async () => {
          const sendEmailSpy = jest.fn().mockReturnValue(new HTTPError(418, 'It broke'));
          const notifSpy = jest.fn().mockImplementation(() => {
            return {
              sendEmail: sendEmailSpy,
            };
          });

          const svc = new NotificationService(new notifSpy());
          const output = await svc.sendVisitExpiryNotification(visit).catch((x) => {
            expect.assertions(1);
            expect(output).toThrowError('It broke');
          });
        });
      });
    });
  });
});
