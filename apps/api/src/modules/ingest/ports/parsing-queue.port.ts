export const PARSING_QUEUE_PORT = Symbol('PARSING_QUEUE_PORT');

export interface ParsingQueuePort {
  enqueue(rawNotificationId: string): Promise<void>;
}
