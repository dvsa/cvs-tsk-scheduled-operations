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
                console.log(`results items length: ${results.Items.length}`)
                const firstItem = results.Items[0]
                console.log(firstItem)
                fullResults = fullResults.concat(results.Items)
            }

            if(results.LastEvaluatedKey) {
                console.log(`Getting more results`)
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
