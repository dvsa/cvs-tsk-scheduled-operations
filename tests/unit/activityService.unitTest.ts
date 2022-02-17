import { ActivityService } from '../../src/services/ActivityService';
import { LambdaService } from '../../src/services/LambdaService';
import HTTPError from '../../src/models/HTTPError';
import {wrapLambdaResponse} from '../util/responseUtils';
import activitiesResponse from '../resources/activities-response.json';
import testActivities from '../resources/testActivities.json';
import dateMock from '../util/dateMockUtils';
import { ACTIVITY_TYPE } from '../../src/utils/Enums';

describe('Activity Service', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModuleRegistry();
  });

  describe('Constructor', () => {
    it('should set the local lambdaClient', () => {
      const mockLambdaClient = new (jest.fn())();
      const svc = new ActivityService(mockLambdaClient);
      expect((svc as any).lambdaClient).toEqual(mockLambdaClient);
    });
  });

  describe('getActivitiesList', () => {
    it('is invoking getActivities with correct param for a visit activity', async () => {
      // Param  should be TIMES.TERMINATION_TIME+1 before "now"
      const expectedToStartTime = '2020-05-14T11:01:58.135Z';
      dateMock.setupDateMock(expectedToStartTime);
      const expectedTime = '2020-01-01T00:00:00.000Z';
      const getActivitiesMock = jest.fn();
      jest.spyOn(ActivityService.prototype, 'getActivities').mockImplementation(getActivitiesMock);

      const svc = new ActivityService(null as unknown as LambdaService);
      await svc.getActivitiesList(ACTIVITY_TYPE.VISIT, expectedToStartTime);
      expect(getActivitiesMock.mock.calls[0][0]).toEqual({
        fromStartTime: expectedTime,
        isOpen: true,
        toStartTime: expectedToStartTime,
        activityType: 'visit',
      });

      dateMock.restoreDateMock();
    });

    it('is invoking getActivities with correct param for a non visit activity', async () => {
      // Param  should be TIMES.TERMINATION_TIME+1 before "now"
      const expectedToStartTime = '2020-05-14T11:01:58.135Z';
      dateMock.setupDateMock(expectedToStartTime);
      const getActivitiesMock = jest.fn();
      jest.spyOn(ActivityService.prototype, 'getActivities').mockImplementation(getActivitiesMock);

      const svc = new ActivityService(null as unknown as LambdaService);
      await svc.getActivitiesList(ACTIVITY_TYPE.WAIT, expectedToStartTime, 'abc123');
      expect(getActivitiesMock.mock.calls[0][0]).toEqual({
        fromStartTime: expectedToStartTime,
        isOpen: false,
        toStartTime: expectedToStartTime,
        activityType: 'wait',
        testerStaffId: 'abc123'
      });

      dateMock.restoreDateMock();
    });
  });

  describe('getActivities', () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      jest.resetModuleRegistry();
    });

    context('when no data is returned from database', () => {
      it('should return an empty array, and no error', async () => {
        const invokeMock = jest.fn().mockResolvedValue(
          wrapLambdaResponse(
            JSON.stringify({
              body: 'No resources match the search criteria',
              statusCode: 404,
            }),
          ),
        );
        const lambdaSvcMock = jest.fn().mockImplementation(() => {
          return { invoke: invokeMock };
        });
        const svc = new ActivityService(new lambdaSvcMock());

        expect.assertions(1);

        const output = await svc.getActivities({ fromStartTime: '2020-02-12' });
        expect(output).toEqual([]);
      });
    });

    describe('Lambda client returns a single record in expected format', () => {
      it('returns parsed result', async () => {
        const mockLambdaService = jest.fn().mockImplementation(() => {
          return {
            invoke: () => Promise.resolve(wrapLambdaResponse(JSON.stringify(activitiesResponse))),
          };
        });
        const activityService = new ActivityService(new mockLambdaService());
        const result = await activityService.getActivities({
          fromStartTime: '2020-02-12',
        });
        expect(result).toEqual(JSON.parse(activitiesResponse.body));
      });
    });
  });

  describe('endActivities', () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      jest.resetModuleRegistry();
    });

    describe('when the endVisit function throws an error', () => {
      it('endVisit should throw that error upward', async () => {
        jest.spyOn(ActivityService.prototype, 'endVisit').mockRejectedValue(new HTTPError(418, 'bad things'));
        const lambdaSvcMock = jest.fn();
        const svc = new ActivityService(new lambdaSvcMock());
        expect.assertions(2);
        try {
          await svc.endVisit(testActivities[0].id, '');
        } catch (e) {
          expect(e.statusCode).toEqual(418);
          expect(e.body).toEqual('bad things');
        }
      });
    });

    describe('when no errors are thrown by endVisit service calls', () => {
      it('returns array of results', async () => {
        jest.spyOn(ActivityService.prototype, 'endVisit').mockResolvedValue('looks good');
        const lambdaSvcMock = jest.fn();
        const svc = new ActivityService(new lambdaSvcMock());
        expect.assertions(1);

        const output: any = await svc.endVisit(testActivities[0].id, '');
        expect(output).toEqual('looks good');
      });
    });

    describe('when the end visit lambda invocation', () => {
      it('is successful, returns a valid response', async () => {
        const invokeMock = jest.fn().mockResolvedValue(
            wrapLambdaResponse(
                JSON.stringify({
                  body: '{"wasVisitAlreadyClosed": false}',
                  statusCode: 200,
                }),
            ),
        );        const lambdaSvcMock = jest.fn().mockImplementation(() => {
          return { invoke: invokeMock };
        });
        const svc = new ActivityService(new lambdaSvcMock());
        const output: any = await svc.endVisit(testActivities[0].id,'')
        expect(output).toEqual(JSON.parse('{"wasVisitAlreadyClosed": false}'))
      });
      it('returns an error, throws an appropriate error code', async () => {
        const invokeMock = jest.fn().mockRejectedValue(new HTTPError(500, 'Error'));
        const lambdaSvcMock = jest.fn().mockImplementation(() => {
          return {invoke: invokeMock};
        });
        const svc = new ActivityService(new lambdaSvcMock());
        await svc.endVisit(testActivities[0].id, '').catch((x) => {
          expect(x.statusCode).toEqual(500)
        })
      });
    });
  });
});
