import { CleanupService } from '../services/CleanupService';
import HTTPError from '../models/HTTPError';
import HTTPResponse from '../models/HTTPResponse';
import { ISubSeg } from '../models';
// @ts-ignore
import { NotifyClient } from 'notifications-node-client';
import { NotificationService } from '../services/NotificationService';
import { Configuration } from '../utils/Configuration';
import { HTTPRESPONSE } from '../utils/Enums';

/* workaround AWSXRay.captureAWS(...) call obscures types provided by the AWS sdk.
https://github.com/aws/aws-xray-sdk-node/issues/14
*/
/* tslint:disable */
let AWS: any;
if (process.env._X_AMZN_TRACE_ID) {
  /* tslint:disable */
  AWS = require('aws-xray-sdk');
} else {
  console.log('Serverless Offline detected; skipping AWS X-Ray setup');
}
/* tslint:enable */

export const cleanupVisits = async () => {
  let subseg: ISubSeg | null = null;
  if (process.env._X_AMZN_TRACE_ID) {
    const segment = AWS.getSegment();
    AWS.capturePromise();
    if (segment) {
      subseg = segment.addNewSubsegment('cleanupVisits');
    }
  }
  const notifyConfig = await Configuration.getInstance().getNotifyConfig();
  const notifyClient = new NotifyClient(notifyConfig.api_key);
  const notifyService: NotificationService = new NotificationService(notifyClient);
  const cleanupService = new CleanupService(notifyService);

  try {
    return cleanupService
      .cleanupVisits()
      .then((response = HTTPRESPONSE.SUCCESS) => {
        return new HTTPResponse(201, response);
      })
      .catch((error) => {
        console.log('Error cleaning up visits', error);
        if (subseg) {
          subseg.addError(error.body);
        }
        return new HTTPError(error.statusCode, error.body);
      });
  } finally {
    if (subseg) {
      subseg.close();
    }
  }
};
