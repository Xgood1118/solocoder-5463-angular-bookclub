import { Injectable } from '@angular/core';
import { db } from './database.service';
import type { ReadingProgress, ReminderItem } from '../models/types';
import { MemberService } from './member.service';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class ProgressService {
  constructor(
    private memberService: MemberService,
    private sessionService: SessionService
  ) {}

  private genId(): string {
    return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  async getByMemberAndBook(memberId: string, bookId: string): Promise<ReadingProgress | undefined> {
    const all = await (await db()).getAllFromIndex('progress', 'by-member-book', [memberId, bookId]);
    return all[0];
  }

  async getBySession(sessionId: string): Promise<ReadingProgress[]> {
    return (await db()).getAllFromIndex('progress', 'by-session', sessionId);
  }

  async getAll(): Promise<ReadingProgress[]> {
    return (await db()).getAll('progress');
  }

  async update(memberId: string, bookId: string, sessionId: string, chapter: number): Promise<ReadingProgress> {
    const existing = await this.getByMemberAndBook(memberId, bookId);
    const now = new Date().toISOString();

    if (existing) {
      existing.previousChapter = existing.currentChapter;
      existing.currentChapter = chapter;
      existing.updatedAt = now;
      existing.sessionId = sessionId;
      await (await db()).put('progress', existing);
      return existing;
    }

    const progress: ReadingProgress = {
      id: this.genId(),
      memberId,
      bookId,
      sessionId,
      currentChapter: chapter,
      previousChapter: 0,
      updatedAt: now,
    };
    await (await db()).add('progress', progress);
    return progress;
  }

  async getSessionStats(sessionId: string): Promise<{
    finished: number;
    half: number;
    notStarted: number;
    total: number;
  }> {
    const session = await this.sessionService.getById(sessionId);
    if (!session || !session.book) return { finished: 0, half: 0, notStarted: 0, total: 0 };
    const totalChapters = session.book.totalChapters;
    const members = await this.memberService.getAll();
    const progresses = await this.getBySession(sessionId);
    const progressMap = new Map(progresses.map(p => [p.memberId, p]));

    let finished = 0, half = 0, notStarted = 0;
    for (const m of members) {
      const p = progressMap.get(m.id);
      const current = p?.currentChapter ?? 0;
      if (current >= totalChapters) finished++;
      else if (current >= totalChapters / 2) half++;
      else notStarted++;
    }
    return { finished, half, notStarted, total: members.length };
  }

  async getReminderList(sessionId: string): Promise<ReminderItem[]> {
    const session = await this.sessionService.getById(sessionId);
    if (!session || !session.book) return [];
    const totalChapters = session.book.totalChapters;
    const members = await this.memberService.getAll();
    const progresses = await this.getBySession(sessionId);
    const progressMap = new Map(progresses.map(p => [p.memberId, p]));

    const reminders: ReminderItem[] = [];
    for (const m of members) {
      const p = progressMap.get(m.id);
      const current = p?.currentChapter ?? 0;
      const rate = totalChapters > 0 ? current / totalChapters : 0;
      if (rate < 0.5) {
        reminders.push({
          memberId: m.id,
          memberName: m.name,
          bookTitle: session.book.title,
          currentProgress: current,
          totalChapters,
          progressRate: rate,
          message: `${m.name}，你好！提醒一下《${session.book.title}》目前读到第${current}/${totalChapters}章啦，记得抽空继续哦~`,
        });
      }
    }
    return reminders.sort((a, b) => a.progressRate - b.progressRate);
  }
}
