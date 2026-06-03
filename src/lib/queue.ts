// queue.ts
// Configures Redis connection options and BullMQ queue for bulk meeting scheduling.

import { Queue, ConnectionOptions } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6380';

// Parse Redis URL into ConnectionOptions
const parsed = new URL(redisUrl);
export const connectionOptions: ConnectionOptions = {
  host: parsed.hostname || 'localhost',
  port: parsed.port ? parseInt(parsed.port, 10) : 6380,
  username: parsed.username || undefined,
  password: parsed.password || undefined,
  maxRetriesPerRequest: null, // Critical requirement for BullMQ
};

export const QUEUE_NAME = 'calendar-scheduling';

let schedulingQueue: Queue | null = null;

/**
 * Returns the scheduling Queue instance.
 */
export function getSchedulingQueue(): Queue {
  if (!schedulingQueue) {
    schedulingQueue = new Queue(QUEUE_NAME, {
      connection: connectionOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 30000, // Attempt 1: 30s delay, then exponential
        },
        removeOnComplete: true, // Keep Redis memory footprint low
        removeOnFail: false, // Maintain failed worker jobs for debugging
      },
    });
  }
  return schedulingQueue;
}

