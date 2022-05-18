// @ts-ignore
import * as yml from 'node-yaml';
import { Handler } from 'aws-lambda';
import { IConfig, IFunctionEvent, IInvokeConfig, INotifyConfig, ISecretConfig } from '../models';
import { ERRORS } from './Enums';
import SecretsManager, { GetSecretValueRequest, GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager';
import { safeLoad } from 'js-yaml';
import * as AWSXray from 'aws-xray-sdk';

class Configuration {
  private static instance: Configuration;
  private readonly config: IConfig;
  private secretsClient: SecretsManager;

  constructor(configPath: string) {
    // @ts-ignore
    this.secretsClient = AWSXray.captureAWSClient(new SecretsManager({ region: 'eu-west-1' }));
    this.config = yml.readSync(configPath);
    // Replace environment variable references
    let stringifiedConfig: string = JSON.stringify(this.config);
    const envRegex: RegExp = /\${(\w+\b):?(\w+\b)?}/g;
    const matches: RegExpMatchArray | null = stringifiedConfig.match(envRegex);

    if (matches) {
      matches.forEach((match: string) => {
        envRegex.lastIndex = 0;
        const captureGroups: RegExpExecArray = envRegex.exec(match) as RegExpExecArray;

        // Insert the environment variable if available. If not, insert placeholder. If no placeholder, leave it as is.
        stringifiedConfig = stringifiedConfig.replace(
          match,
          process.env[captureGroups[1]] || captureGroups[2] || captureGroups[1],
        );
      });
    }

    this.config = JSON.parse(stringifiedConfig);
  }

  /**
   * Retrieves the singleton instance of Configuration
   * @returns Configuration
   */
  public static getInstance(): Configuration {
    if (!this.instance) {
      this.instance = new Configuration('../config/config.yml');
    }

    return Configuration.instance;
  }

  /**
   * Retrieves the entire config as an object
   * @returns any
   */
  public getConfig(): any {
    return this.config;
  }

  /**
   * Retrieves the lambda functions declared in the config
   * @returns IFunctionEvent[]
   */
  public getFunctions(): IFunctionEvent[] {
    if (!this.config.functions) {
      throw new Error('Functions were not defined in the config file.');
    }

    return this.config.functions.map((fn: Handler) => {
      const [name, params] = Object.entries(fn)[0];

      return {
        name,
        function: require(`../functions/${name}`)[name],
        eventName: params.eventName,
        event: params.event,
      };
    });
  }

  /**
   * Retrieves the MOT config
   * @returns INotifyConfig
   */
  public async getNotifyConfig(): Promise<INotifyConfig> {
    if (!this.config.notify) {
      throw new Error(ERRORS.NOTIFY_CONFIG_NOT_DEFINED);
    }
    if (!this.config.notify.api_key) {
      this.config.notify = (await this.setSecrets()).notify as INotifyConfig;
    }

    return this.config.notify;
  }

  /**
   * Retrieves the Lambda Invoke config
   * @returns IInvokeConfig
   */
  public getInvokeConfig(): IInvokeConfig {
    if (!this.config.invoke) {
      throw new Error('Lambda Invoke config not defined in the config file.');
    }

    // Not defining BRANCH will default to local
    const env: string = !process.env.BRANCH || process.env.BRANCH === 'local' ? 'local' : 'remote';

    return this.config.invoke[env];
  }

  /**
   * Retrieves the templateId from config file when running locally, else environment variable
   */
  public async getTemplateIdFromEV(): Promise<string> {
    if (!process.env.BRANCH || process.env.BRANCH === 'local') {
      if (!this.config.notify.templateId) {
        throw new Error(ERRORS.TEMPLATE_ID_ENV_VAR_NOT_EXIST);
      } else {
        return this.config.notify.templateId;
      }
    } else {
      if (!process.env.TEMPLATE_ID) {
        throw new Error(ERRORS.TEMPLATE_ID_ENV_VAR_NOT_EXIST);
      }
      return process.env.TEMPLATE_ID;
    }
  }

  /**
   * Reads the secret yaml file from SecretManager or local file.
   */
  private async setSecrets(): Promise<ISecretConfig> {
    let secret: ISecretConfig;
    if (process.env.SECRET_NAME) {
      const req: GetSecretValueRequest = {
        SecretId: process.env.SECRET_NAME,
      };
      const resp: GetSecretValueResponse = await this.secretsClient.getSecretValue(req).promise();
      try {
        secret = await safeLoad(resp.SecretString as string);
      } catch (e) {
        throw new Error(ERRORS.SECRET_STRING_EMPTY);
      }
    } else {
      console.warn(ERRORS.SECRET_ENV_VAR_NOT_SET);
      throw new Error(ERRORS.SECRET_ENV_VAR_NOT_SET);
    }
    return secret;
  }
}

export { Configuration };
