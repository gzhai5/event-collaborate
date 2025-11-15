/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { EventEntity } from 'src/event/entities/event.entity';
import { initChatModel } from 'langchain';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly modelPromise: ReturnType<typeof initChatModel>;

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY is not set, AI summaries will be mocked.',
      );
    }

    this.modelPromise = initChatModel('gpt-4.1', {
      apiKey,
    });
  }

  private cacheKey(eventId: string): string {
    return `event:summary:${eventId}`;
  }

  async getCachedSummary(eventId: string): Promise<string | undefined> {
    try {
      const result = await this.cache.get<string>(this.cacheKey(eventId));
      return typeof result === 'string' ? result : undefined;
    } catch (error) {
      this.logger.error('Error getting cached summary', error);
      return undefined;
    }
  }

  async cacheSummary(eventId: string, summary: string): Promise<void> {
    await this.cache.set(this.cacheKey(eventId), summary);
  }

  /**
   * Summarize a merged event given its source events.
   * Uses LangChain if API key is present, otherwise falls back to a simple mock string.
   */
  async summarizeMergedEvent(
    mergedEvent: EventEntity,
    sourceEvents: Pick<EventEntity, 'id' | 'title'>[],
  ): Promise<string> {
    const cached = await this.getCachedSummary(mergedEvent.id);
    if (cached) {
      return cached;
    }

    const titles = sourceEvents.map((e) => e.title).join(' + ');
    const basePrompt = `
        You are an event summarizer.

        Given a merged event and a list of source events that were merged into it,
        write ONE short sentence summary like:

        "Merged team sync from 2 overlapping events: Planning + Demo."

        Merged event title: ${mergedEvent.title}
        Source event titles: ${titles}
        Number of source events: ${sourceEvents.length}

        Return only the sentence, nothing else.
        `.trim();

    let summary: string;

    // If no API key, return a simple deterministic mock
    if (!process.env.OPENAI_API_KEY) {
      summary = `Merged ${sourceEvents.length} overlapping events: ${titles}.`;
    } else {
      try {
        const model = await this.modelPromise;
        const res = await model.invoke(basePrompt);
        summary =
          (res.content as string) ||
          `Merged ${sourceEvents.length} overlapping events: ${titles}.`;
      } catch (err) {
        this.logger.error('Error calling LangChain model', err);
        summary = `Merged ${sourceEvents.length} overlapping events: ${titles}.`;
      }
    }

    await this.cacheSummary(mergedEvent.id, summary);
    return summary;
  }
}
