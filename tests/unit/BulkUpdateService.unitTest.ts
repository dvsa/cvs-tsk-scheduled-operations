import { DynamoDB } from 'aws-sdk';
import {BulkUpdateService} from '../../src/services/BulkUpdateService'

describe('Bulk Update Service', () => {
    it("returns an empty array if there are no items", async () => {
        const dynamo = {
            scan: jest.fn().mockReturnValue({
                promise: jest.fn().mockResolvedValue({})
            })
        } as unknown as DynamoDB
        const bulkUpdate = new BulkUpdateService(dynamo)

        const results = await bulkUpdate.scanAll('local');

        expect(results).toEqual([])
    });

    it("updates items as expected", async () => {
        const updateItem = jest.fn().mockReturnValue({
            promise: jest.fn().mockResolvedValue('success')
        })
        const dynamo = {
            scan: jest.fn().mockReturnValue({
                promise: jest.fn().mockResolvedValue(
                    {
                        Items: [
                            {
                                systemNumber: {S: '1234'},
                                vin: {S: 'abcd'},
                                techRecord: {
                                    L: [
                                        {
                                            M: {
                                                lastUpdatedAt: '2020-01-01T13:00:01.123Z'
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                )
            }),
            updateItem
        } as unknown as DynamoDB
        const bulkUpdate = new BulkUpdateService(dynamo)

        await bulkUpdate.scanAll('local');

        const updateItemFirstArgument = updateItem.mock.calls[0][0]
        const techRecord = updateItemFirstArgument.ExpressionAttributeValues[':tr']

        expect(updateItem).toBeCalledTimes(1)
        expect(techRecord.L[0].M.lastUpdatedAt).toEqual('2020-01-01T13:00:01.124Z')
    });

    it("returns the expected items for a paged list", async () => {
        const updateItem = jest.fn().mockReturnValue({
            promise: jest.fn().mockResolvedValue('success')
        })
        const dynamo = {
            scan: jest.fn().mockReturnValueOnce({
                promise: jest.fn().mockResolvedValue(
                    {
                        LastEvaluatedKey: 'key1',
                        Items: [
                            {
                                systemNumber: {S: '1234'},
                                vin: {S: 'abcd'},
                                techRecord: {
                                    L: [
                                        {
                                            M: {
                                                lastUpdatedAt: '2020-01-01T13:00:01.123Z'
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                )
            })
            .mockReturnValueOnce({
                promise: jest.fn().mockResolvedValue(
                    {
                        LastEvaluatedKey: 'key2',
                        Items: [
                            {
                                systemNumber: {S: '5678'},
                                vin: {S: 'efgh'},
                                techRecord: {
                                    L: [
                                        {
                                            M: {
                                                lastUpdatedAt: '2020-01-01T13:00:01.154Z'
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                )
            })
            .mockReturnValueOnce({
                promise: jest.fn().mockResolvedValue(
                    {
                        Items: [
                            {
                                systemNumber: {S: '9101'},
                                vin: {S: 'ijkl'},
                                techRecord: {
                                    L: [
                                        {
                                            M: {
                                                lastUpdatedAt: '2020-01-01T13:00:01.167Z'
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                )
            }),
            updateItem
        } as unknown as DynamoDB
        const bulkUpdate = new BulkUpdateService(dynamo)

        await bulkUpdate.scanAll('local');

        expect(updateItem).toBeCalledTimes(3)
    });
})
