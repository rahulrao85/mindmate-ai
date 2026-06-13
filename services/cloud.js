import { Logging } from '@google-cloud/logging';
import { Storage } from '@google-cloud/storage';
import { BUCKET_NAME } from '../config/constants.js';

const logging = new Logging();
const log = logging.log('mindmate-ai-journal');
const storage = new Storage();

export async function writeLog(mood, score, exam, triggers) {
  try {
    const metadata = {
      resource: { type: 'global' },
      severity: score <= 3 ? 'WARNING' : 'INFO',
    };
    const entry = log.entry(metadata, {
      service: 'mindmate-ai',
      event: 'journal_analysis',
      mood,
      score,
      exam,
      triggers,
      timestamp: new Date().toISOString(),
    });
    await log.write(entry);
  } catch (err) {
    console.debug('Cloud Logging unavailable (local dev):', err.message);
  }
}

export async function saveMoodToStorage(analysisData, exam) {
  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `mood-logs/${dateStr}/${Date.now()}.json`;
    const file = bucket.file(fileName);

    const summary = {
      timestamp: new Date().toISOString(),
      mood: analysisData.mood?.primary || 'unknown',
      score: analysisData.mood?.score || 5,
      exam,
      triggers: analysisData.analysis?.stress_triggers || [],
      trend_data: true,
    };

    await file.save(JSON.stringify(summary, null, 2), {
      contentType: 'application/json',
      metadata: { cacheControl: 'no-cache' },
    });
  } catch (err) {
    console.debug('Cloud Storage unavailable (local dev):', err.message);
  }
}
