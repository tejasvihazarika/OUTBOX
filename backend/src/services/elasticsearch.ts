import { Client } from '@elastic/elasticsearch';
import { ENV } from '../config/env';

export const esClient = new Client({ node: ENV.ELASTICSEARCH_NODE });
export const ES_INDEX = 'email_jobs';

export async function initElasticsearch(): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: ES_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: ES_INDEX,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            sender: { type: 'keyword' },
            recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduled_time: { type: 'date' },
            created_at: { type: 'date' },
            updated_at: { type: 'date' }
          }
        }
      });
      console.log(`[Elasticsearch] Index '${ES_INDEX}' created successfully`);
    } else {
      console.log(`[Elasticsearch] Index '${ES_INDEX}' already exists`);
    }
  } catch (err: any) {
    console.warn(`[Elasticsearch Warning] Failed to initialize index: ${err.message}. Search will fallback gracefully.`);
  }
}

export async function indexEmailJob(emailJob: any): Promise<void> {
  try {
    await esClient.index({
      index: ES_INDEX,
      id: emailJob.id,
      document: {
        id: emailJob.id,
        sender: emailJob.sender,
        recipient: emailJob.recipient,
        subject: emailJob.subject,
        body: emailJob.body,
        status: emailJob.status,
        scheduled_time: emailJob.scheduledTime ? new Date(emailJob.scheduledTime).toISOString() : null,
        created_at: emailJob.createdAt ? new Date(emailJob.createdAt).toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });
  } catch (err: any) {
    console.warn(`[Elasticsearch Warning] Failed to index email ${emailJob.id}: ${err.message}`);
  }
}

export async function searchEmailJobs(queryStr: string): Promise<any[]> {
  try {
    const searchResponse = await esClient.search({
      index: ES_INDEX,
      query: queryStr ? {
        multi_match: {
          query: queryStr,
          fields: ['recipient^3', 'subject^2', 'status', 'sender', 'body'],
          fuzziness: 'AUTO'
        }
      } : {
        match_all: {}
      }
    });

    return searchResponse.hits.hits.map((hit: any) => hit._source);
  } catch (err: any) {
    console.warn(`[Elasticsearch Warning] Search failed: ${err.message}.`);
    throw err;
  }
}
