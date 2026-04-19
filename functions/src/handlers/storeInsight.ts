import { onRequest } from 'firebase-functions/v2/https';
import { storeInsight, markInsightEmailed, type InsightData } from '../shared/insightStorage.js';
import { sendInsightEmail } from '../shared/emailSender.js';
import { getFirestore } from 'firebase-admin/firestore';
import { authenticateAgent } from '../middleware/agentAuth.js';

/**
 * onRequest endpoint for Claude Code agent to write back insights.
 */
export const storeInsightEndpoint = onRequest(
  { region: 'europe-west1', cors: false, secrets: ['AGENT_API_TOKEN', 'SINGLE_USER_ID', 'RESEND_API_KEY'] },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const userId = authenticateAgent(request, response);
    if (!userId) return;

    const body = request.body as {
      insight: InsightData;
      sendEmail?: boolean;
      emailSubject?: string;
    };

    if (!body.insight) {
      response.status(400).json({ error: 'Missing insight data' });
      return;
    }

    // Convert date strings to Date objects
    const insight: InsightData = {
      ...body.insight,
      periodStart: new Date(body.insight.periodStart),
      periodEnd: new Date(body.insight.periodEnd),
    };

    const insightId = await storeInsight(userId, insight);

    // Optionally send email
    if (body.sendEmail) {
      try {
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(userId).get();
        const email = userDoc.data()?.email;
        if (email) {
          // For agent-generated insights, send the narrative as a simple email
          const html = `<html><body>
            <h2>${body.emailSubject ?? 'Finance Insight'}</h2>
            <p><strong>${insight.summary}</strong></p>
            <div>${insight.narrative.replace(/\n/g, '<br>')}</div>
          </body></html>`;
          await sendInsightEmail(
            email,
            body.emailSubject ?? `Finance Insight — ${insight.type}`,
            html
          );
          await markInsightEmailed(userId, insightId);
        }
      } catch (e) {
        console.error('Failed to send email:', e);
      }
    }

    response.json({ insightId, success: true });
  }
);
