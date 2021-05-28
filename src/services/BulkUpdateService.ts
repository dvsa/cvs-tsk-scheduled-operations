import {DynamoDB} from 'aws-sdk'

class BulkUpdateService {
    dynamo: DynamoDB
    constructor(dynamo: DynamoDB) {
        this.dynamo = dynamo
    }

    // tablename is `cvs-${process.env.BRANCH}-(technical-records|test-results)`
    public async scanAll(tableName:string) {
        // Do a scan to get all the items
        let fullResults:DynamoDB.ItemList = [];
        let cont = true
        let exclusiveStartKey;
        let results;

        while(cont) {
            results = await this.dynamo.scan({TableName:tableName, ExclusiveStartKey: exclusiveStartKey}).promise()

            if(results.Items) {
                fullResults = fullResults.concat(results.Items)
            }

            if(results.LastEvaluatedKey) {
                cont = true
                exclusiveStartKey = results.LastEvaluatedKey
            } else {
                cont = false
            }
        }

        return fullResults
    }
}

export {BulkUpdateService}
