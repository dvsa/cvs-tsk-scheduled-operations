import {AWSError, DynamoDB} from 'aws-sdk'
import { AttributeValue } from 'aws-sdk/clients/dynamodb'
import { PromiseResult } from 'aws-sdk/lib/request'
import { tr } from 'date-fns/locale'

class BulkUpdateService {
    dynamo: DynamoDB
    constructor(dynamo: DynamoDB) {
        this.dynamo = dynamo
    }

    private parseDate(dateString:string):Date {
        const [date, timeWithZone] = dateString.split('T')
        const [year, month, day] = date.split('-')
        const time = timeWithZone.slice(0, -1)
        const [hour, minute, secondAndMs] = time.split(':')
        const [second, ms] = secondAndMs.split('.')

        return new Date(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(day, 10),
            parseInt(hour, 10),
            parseInt(minute, 10),
            parseInt(second, 10),
            parseInt(ms, 10)
        )
    }

    private addAMillisecond(date:Date):Date {
        date.setMilliseconds(date.getMilliseconds() + 1);

        return date;
    }

    private formatDate(date:Date):string {
        return date.toISOString()
    }

    // tablename is `cvs-${process.env.BRANCH}-(technical-records|test-results)`
    public async scanAll(tableName:string) {
        // Do a scan to get all the items
        const fullResults:DynamoDB.ItemList = [];
        let cont = true
        let exclusiveStartKey;
        let results;

        while(cont) {
            results = await this.dynamo.scan({TableName:tableName, ExclusiveStartKey: exclusiveStartKey}).promise()

            if(results.Items) {
                console.log(`results items length: ${results.Items.length}`)
                fullResults.concat(results.Items)

                const promises = results.Items.map((item):Promise<string|PromiseResult<DynamoDB.UpdateItemOutput, AWSError>> => {
                    if (item.techRecord && item.techRecord.L && item.techRecord.L?.length > 0 && item.techRecord.L[0].M) {
                        const date = this.parseDate(item.techRecord.L[0].M.lastUpdatedAt.toString())
                        const updatedDate = this.addAMillisecond(date)
                        item.techRecord.L[0].M.lastUpdatedAt = this.formatDate(updatedDate) as AttributeValue

                        const key = {
                            systemNumber: item.systemNumber.S as AttributeValue,
                            vin: item.vin.S as AttributeValue
                        }

                        return this.dynamo.updateItem(
                            {
                                TableName: tableName,
                                Key:key,
                                UpdateExpression:'SET techRecord = :tr',
                                ExpressionAttributeValues: {':tr': item.techRecord}
                            }
                        ).promise()
                    }

                    return Promise.resolve('')
                })

                await Promise.all(promises)
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
