import { NotificationService } from '../../src/services/NotificationService';
import HTTPError from '../../src/models/HTTPError';
import { IActivity } from '../../src/models';

describe('Notification Service', () => {
  afterEach(() => {
    jest.resetModuleRegistry();
    jest.restoreAllMocks();
  });
  describe('sendVisitExpiryNotifications', () => {
    const visit: IActivity = {
      id: '123',
      activityType: 'visit',
      testerName: 'Tester1',
      testerStaffId: '123456',
      testerEmail: 'test1@test.com',
      startTime: '2022-01-01T12:00:45.938Z',
      endTime: null,
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
