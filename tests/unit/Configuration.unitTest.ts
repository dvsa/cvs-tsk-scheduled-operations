import { Configuration } from '../../src/utils/Configuration';
import { IInvokeConfig } from '../../src/models';

import mockConfig from '../util/mockConfig';
import { ERRORS } from '../../src/utils/Enums';
jest.mock('aws-sdk/clients/secretsmanager');

describe('ConfigurationUtil', () => {
  mockConfig();
  const config: Configuration = Configuration.getInstance();
  const badConfig: Configuration = new Configuration('../../tests/resources/badConfig.yml');
  const branch = process.env.BRANCH;
  const mockError = new Error(ERRORS.TEMPLATE_ID_ENV_VAR_NOT_EXIST);

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModuleRegistry();
  });

  describe('when calling getConfig() and config file is present', () => {
    it('should return config instance', () => {
      const configInstance: any = config.getConfig();
      expect(configInstance).not.toEqual(undefined);
    });
  });

  describe('when calling getInvokeConfig()', () => {
    it('should throw an error', () => {
      process.env.BRANCH = '';
      try {
        badConfig.getInvokeConfig();
      } catch (e) {
        expect(e.message).toEqual('Lambda Invoke config not defined in the config file.')
      }
    });
  });
  describe('when calling getInvokeConfig() and the BRANCH environment variable is not defined', () => {
    it('should return local invokeConfig', () => {
      process.env.BRANCH = '';
      const invokeConfigInstance: IInvokeConfig = config.getInvokeConfig();
      expect(invokeConfigInstance.params.endpoint).not.toEqual(undefined);
      expect(invokeConfigInstance.params.endpoint).toEqual('http://localhost:3013');
    });
  });
  describe('when calling getInvokeConfig() and the BRANCH environment variable is local', () => {
    it('should return local invokeConfig', () => {
      process.env.BRANCH = 'local';
      const invokeConfigInstance: IInvokeConfig = config.getInvokeConfig();
      expect(invokeConfigInstance.params.endpoint).not.toEqual(undefined);
      expect(invokeConfigInstance.params.endpoint).toEqual('http://localhost:3013');
    });
  });
  describe('when calling getInvokeConfig() and the BRANCH environment variable is not local', () => {
    it('should return remote invokeConfig', () => {
      process.env.BRANCH = 'remote';
      const invokeConfigInstance: IInvokeConfig = config.getInvokeConfig();
      expect(invokeConfigInstance.params.endpoint).toEqual(undefined);
    });
  });

  describe('getTemplateIdFromEv', () => {
    describe('When calling getTemplateIdFromEv and the branch is local', () => {
      it('should not throw an error when templateId does exist', async () => {
        process.env.BRANCH = 'local';
        await config.getTemplateIdFromEV().then((templateId) => {
          expect(templateId).toEqual('2af4ff8e-af5b-4f32-80a9-d03719180647');
        });
      });
      it("should throw an error when templateId doesn't exist in config file", async () => {
        await badConfig.getTemplateIdFromEV().catch((error) => {
          expect(error).toEqual(mockError);
        });
      });
    });
    describe("When calling getTemplateIdFromEv and branch isn't local", () => {
      it('should not throw and error when templateId is populated', async () => {
        process.env.BRANCH = 'remote';
        process.env.TEMPLATE_ID = 'some_template_id';
        await config.getTemplateIdFromEV().then((templateId) => {
          expect(templateId).toEqual('some_template_id');
        });
      });
    });
    describe("When calling getTemplateIdFromEv and branch isn't local", () => {
      it('should throw an error when templateId does not exist', async () => {
        process.env.BRANCH = 'remote';
        delete process.env.TEMPLATE_ID;
        await config.getTemplateIdFromEV().catch((error) => {
          expect(error).toEqual(mockError);
        });
      });
    });
  });

  describe('setSecrets', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.resetModuleRegistry();
      jest.restoreAllMocks();
    });
    describe('with SECRET_NAME not set', () => {
      it('throws an error', async () => {
        delete process.env.SECRET_NAME;
        try {
          await (Configuration.getInstance() as any).setSecrets();
        } catch (e) {
          expect(e.message).toEqual(ERRORS.SECRET_ENV_VAR_NOT_SET);
        }
      });
    });
    describe('with SECRET_NAME set', () => {
      describe('and secretsClient returns a value', () => {
        it('invokes the secretsClient with correct config, and returns a secret containing object', async () => {
          process.env.SECRET_NAME = 'aSecret';
          const secretMock = jest.fn().mockImplementation(() => {
            return {
              getSecretValue: getSecretMock,
            };
          });
          // @ts-ignore
          const getSecretMock = jest.fn().mockImplementation(() => {
            return {
              promise: jest.fn().mockResolvedValue({
                SecretString: '{"notify": {"api_key": "something"}}',
              }),
            };
          });
          (config as any).secretsClient = new secretMock();
          const output = await (config as any).setSecrets();
          expect(getSecretMock.mock.calls[0][0].SecretId).toEqual('aSecret');
          expect(output).toEqual({
            notify: {
              api_key: 'something',
            },
          });
        });
      });
      describe('and secretsClient returns nothing', () => {
        it('throws an error', async () => {
          expect.assertions(1);
          process.env.SECRET_NAME = 'aSecret';
          const secretMock = jest.fn().mockImplementation(() => {
            return {
              getSecretValue: getSecretMock,
            };
          });
          // @ts-ignore
          const getSecretMock = jest.fn().mockImplementation(() => {
            return {
              promise: jest.fn().mockResolvedValue(undefined),
            };
          });
          (config as any).secretsClient = new secretMock();
          try {
            await (config as any).setSecrets();
          } catch (e) {
            expect(e.message).toEqual(ERRORS.SECRET_STRING_EMPTY);
          }
        });
      });
    });
  });

  describe('getNotifyConfig', () => {
    describe('when notify config not defined', () => {
      it('should throw an error', () => {
        delete (config as any).config.notify;
        try {
          config.getNotifyConfig();
        } catch (e) {
          expect(e.message).toEqual(ERRORS.NOTIFY_CONFIG_NOT_DEFINED);
        }
      });
    });

    describe('when notify config is defined', () => {
      describe('when api_key not defined', () => {
        it('should invoke setSecrets', async () => {
          (config as any).config.notify = {};
          const setSecretsMock = jest.fn().mockReturnValue('aSecret');
          (config as any).setSecrets = setSecretsMock;
          await config.getNotifyConfig();
          expect(setSecretsMock.mock.calls).toHaveLength(1);
        });
      });
      describe('when api_key is already defined', () => {
        it('should return the notify config', async () => {
          const notifyConf = { api_key: 'something' };
          (config as any).config.notify = notifyConf;
          const output = await config.getNotifyConfig();
          expect(output).toEqual(notifyConf);
        });
      });
    });
  });

  process.env.BRANCH = branch;

    describe('getFunctions', () => {
        it('should return data', async () => {
            const output = config.getFunctions()
           expect(JSON.stringify(output)).toEqual('[{\"name\":\"cleanupVisits\",\"eventName\":\"cleanup\"}]')
        })
    })
  describe('getFunctions', () => {
      it('should throw and error', async () => {
        try {
          badConfig.getFunctions()
        } catch (e) {
          expect(e.message).toEqual('Functions were not defined in the config file.')
        }
      })
  })
});
