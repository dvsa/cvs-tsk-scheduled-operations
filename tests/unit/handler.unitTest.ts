import { handler } from '../../src/handler';
import { Context, Handler } from 'aws-lambda';
import { CleanupService } from '../../src/services/CleanupService';
import { Configuration } from '../../src/utils/Configuration';

describe('Handler', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  process.env.SECRET_NAME = 'something';
  // @ts-ignore
  const ctx: Context = null;
  describe('parsing cleanup event', () => {
    it('invokes the cleanup function', async () => {
      const cleanupVisits = jest.fn().mockResolvedValue({});
      jest.spyOn(CleanupService.prototype, 'cleanupVisits').mockImplementation(cleanupVisits);
      jest
        .spyOn(Configuration.prototype, 'getNotifyConfig')
        .mockResolvedValue({ api_key: 'something', templateId: 'something' });
      const event = {
        details: {
          eventName: 'cleanup',
        },
      };
      await handler(event, ctx, () => {
        return;
      });
      expect(cleanupVisits).toHaveBeenCalled();
    });

    it('invokes the cleanup function matching lambda event more than 1', async () => {
      // let data: IFunctionEvent[] = [];
      // data = [{
      //   name: 'name',
      //     path: 'path',
      //     function: require(`../functions/${name}`)[name],
      //     eventName: 'cleanup',
      //     event: undefined
      // }, {
      //   name: 'name',
      //     path: 'path',
      //     function: require(`../functions/${name}`)[name],
      //     eventName: 'cleanup',
      //     event: undefined
      // }]
      const cleanupVisits = jest.fn().mockResolvedValue({});
      jest.spyOn(CleanupService.prototype, 'cleanupVisits').mockImplementation(cleanupVisits);
      jest
        .spyOn(Configuration.prototype, 'getNotifyConfig')
        .mockResolvedValue({ api_key: 'something', templateId: 'something' });
      // @ts-ignore
      // jest.spyOn(Configuration.prototype, 'getFunctions').mockResolvedValue();

      const event = {
        details: {
          eventName: 'cleanup',
        },
        body: '[{"id":"5e4bd304-446e-4678-8289-d34fca9256e9"}]',
      };
      await handler(event, ctx, () => {
        return;
      });

      expect(cleanupVisits).toHaveBeenCalled();
    });

    it('invokes the cleanup function with body', async () => {
      const cleanupVisits = jest.fn().mockResolvedValue({});
      jest.spyOn(CleanupService.prototype, 'cleanupVisits').mockImplementation(cleanupVisits);
      jest
        .spyOn(Configuration.prototype, 'getNotifyConfig')
        .mockResolvedValue({ api_key: 'something', templateId: 'something' });
      const event = {
        details: {
          eventName: 'cleanup',
        },
        body: '[{"id":"5e4bd304-446e-4678-8289-d34fca9256e9"}]',
      };
      await handler(event, ctx, () => {
        return;
      });
      expect(cleanupVisits).toHaveBeenCalled();
    });
  });

  it('invokes the cleanup function with invalid body', async () => {
    const cleanupVisits = jest.fn().mockResolvedValue({});
    jest.spyOn(CleanupService.prototype, 'cleanupVisits').mockImplementation(cleanupVisits);
    jest
      .spyOn(Configuration.prototype, 'getNotifyConfig')
      .mockResolvedValue({ api_key: 'something', templateId: 'something' });
    const event = {
      details: {
        eventName: 'cleanup',
      },
      body: '[{"id":"5e4bd304-446e-4678-8289-d34fca9256e9"',
    };
    try {
      await handler(event, ctx, () => {
        return;
      });
    } catch (e) {
      expect(e.message).toEqual('Invalid JSON');
    }
  });

  describe('parsing no cleanup event', () => {
    it('logs error', async () => {
      const cleanupVisits = jest.fn().mockResolvedValue({});
      jest.spyOn(CleanupService.prototype, 'cleanupVisits').mockImplementation(cleanupVisits);
      jest
        .spyOn(Configuration.prototype, 'getNotifyConfig')
        .mockResolvedValue({ api_key: 'something', templateId: 'something' });
      try {
        await handler(undefined, ctx, () => {
          return;
        });
      } catch (e) {
        expect(e.message).toEqual("Cannot read property 'body' of undefined");
      }
    });
  });
});
