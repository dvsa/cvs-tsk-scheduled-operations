import { Handler } from 'aws-lambda';

interface IActivityParams {
  fromStartTime: string;
  toStartTime?: string;
  activityType?: string;
  testStationPNumber?: string;
  testerStaffId?: string;
  endTimeNull?: boolean;
  isOpen?: boolean;
}

interface IFunctionEvent {
  name: string;
  path: string;
  function: Handler;
  eventName?: string;
  event?: {
    details: {
      eventName: string;
    };
  };
}

interface IInvokeConfig {
  params: { apiVersion: string; endpoint?: string };
  functions: { testResults: { name: string }; activities: { name: string } };
}

interface INotifyConfig {
  api_key: string;
  templateId: string;
}

interface ISecretConfig {
  notify: {
    api_key: string;
  };
}

interface ITesterDetails {
  email: string;
}

interface IIndexInvokeConfig {
  [key: string]: IInvokeConfig;
}

interface IConfig {
  notify: INotifyConfig;
  invoke: IIndexInvokeConfig;
  functions: any;
}

interface ILogVisit {
  visitId: string;
  testerStaffId: string;
  visitStartTime: string;
  lastActionTime: string;
  action: string;
  reason: string;
  status: string;
  message?: string;
}

export interface ISubSeg {
  addError(error: any): void;
  close: () => void;
}

export {
  IActivityParams,
  IInvokeConfig,
  IFunctionEvent,
  INotifyConfig,
  ISecretConfig,
  ITesterDetails,
  IConfig,
  ILogVisit,
};
