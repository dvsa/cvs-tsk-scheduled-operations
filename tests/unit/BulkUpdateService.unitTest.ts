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

    it("returns the expected items for a short list", async () => {
        const dynamo = {
            scan: jest.fn().mockReturnValue({
                promise: jest.fn().mockResolvedValue({Items: ['a', 'b', 'c']})
            })
        } as unknown as DynamoDB
        const bulkUpdate = new BulkUpdateService(dynamo)

        const results = await bulkUpdate.scanAll('local');

        expect(results).toEqual(['a', 'b', 'c'])
    });

    it("returns the expected items for a paged list", async () => {
        const dynamo = {
            scan: jest.fn().mockReturnValueOnce({
                promise: jest.fn().mockResolvedValue({LastEvaluatedKey: 'key1', Items: ['a', 'b', 'c']})
            })
            .mockReturnValueOnce({
                promise: jest.fn().mockResolvedValue({LastEvaluatedKey: 'key2', Items: ['d', 'e', 'f']})
            })
            .mockReturnValueOnce({
                promise: jest.fn().mockResolvedValue({Items: ['g', 'h', 'i']})
            })
        } as unknown as DynamoDB
        const bulkUpdate = new BulkUpdateService(dynamo)

        const results = await bulkUpdate.scanAll('local');

        expect(results).toEqual(['a', 'b', 'c', 'd', 'e', 'f','g', 'h', 'i'])
    });
})
