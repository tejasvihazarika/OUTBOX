import axios from 'axios';
import { ENV } from '../config/env';
import { prisma } from './db';

export function getSlackAuthorizeUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: ENV.SLACK_CLIENT_ID,
    scope: 'incoming-webhook,chat:write',
    redirect_uri: ENV.SLACK_REDIRECT_URI,
    state: state || 'default'
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export async function handleSlackCallback(code: string): Promise<any> {
  try {
    const params = new URLSearchParams({
      client_id: ENV.SLACK_CLIENT_ID,
      client_secret: ENV.SLACK_CLIENT_SECRET,
      code: code,
      redirect_uri: ENV.SLACK_REDIRECT_URI
    });

    const response = await axios.post('https://slack.com/api/oauth.v2.access', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (!response.data.ok) {
      console.warn('[Slack OAuth Warning] Slack OAuth token exchange returned error:', response.data.error);
      return { ok: false, error: response.data.error };
    }

    const data = response.data;
    const webhookUrl = data.incoming_webhook?.url;
    const botAccessToken = data.access_token;
    const channelId = data.incoming_webhook?.channel_id;

    const slackIntegration = await prisma.slackIntegration.create({
      data: {
        tenantId: 'default',
        botAccessToken: botAccessToken,
        webhookUrl: webhookUrl || '',
        channelId: channelId
      }
    });

    console.log('[Slack OAuth] Integration successfully saved to database');
    return { ok: true, integration: slackIntegration };
  } catch (err: any) {
    console.error('[Slack OAuth Error] Failed to complete OAuth callback:', err.message);
    return { ok: false, error: err.message };
  }
}

export async function notifySlack(senderEmail: string, message: string): Promise<void> {
  try {
    const integration = await prisma.slackIntegration.findFirst({
      where: {
        OR: [{ senderEmail: senderEmail }, { tenantId: 'default' }]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!integration || !integration.webhookUrl) {
      console.log(`[Slack Notification] Skipped for sender ${senderEmail} (No Slack webhook configured).`);
      return;
    }

    await axios.post(integration.webhookUrl, {
      text: `⚠️ *Outbox Email Scheduler Alert*\n*Sender:* \`${senderEmail}\`\n*Event:* ${message}\n*Timestamp:* ${new Date().toISOString()}`
    }, {
      timeout: 5000
    });

    console.log(`[Slack Notification] Successfully posted alert for sender ${senderEmail}`);
  } catch (err: any) {
    console.warn(`[Slack Notification Warning] Could not send alert (token/webhook invalid or revoked): ${err.message}`);
  }
}
