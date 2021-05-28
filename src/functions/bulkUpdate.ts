import { BulkUpdateService } from '../services/BulkUpdateService'
import {DynamoDB} from 'aws-sdk'
import HTTPResponse from '../models/HTTPResponse';
import { HTTPRESPONSE } from '../utils/Enums';
import HTTPError from '../models/HTTPError';

export const bulkUpdate = async() => {
    const branch = process.env.BRANCH;
    const region = process.env.AWS_REGION;

    if (!branch) {
        throw new Error('BRANCH environment variable is missing')
    }

    if(!region) {
        throw new Error('AWS_REGION environment variable is missing. This should be set as a default by AWS')
    }

    const dynamo = new DynamoDB({region});
    const bulkUpdateService = new BulkUpdateService(dynamo)

    try {
        await bulkUpdateService.scanAll(`cvs-${branch}-technical-records`);

        return new HTTPResponse(201, HTTPRESPONSE.SUCCESS);
    } catch(e) {
        return new HTTPError(e.statusCode, e.body);
    }
}
