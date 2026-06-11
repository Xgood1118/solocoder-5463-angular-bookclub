import { Injectable } from '@angular/core';
import { db } from './database.service';
import type { Session, Vote, VoteOption, SessionStatus, VoteStatus } from '../models/types';
import { BookService } from './book.service';
import { ClubService } from './club.service';
import { MemberService } from './member.service';

@Injectable({ providedIn: 'root' })
export class SessionService {
  constructor(
    private bookService: BookService,
    private clubService: ClubService,
    private memberService: MemberService
  ) {}

  private genId(prefix: string): string {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  async getAll(): Promise<Session[]> {
    const sessions = await (await db()).getAll('sessions');
    return sessions.sort((a, b) => b.period - a.period);
  }

  async getById(id: string): Promise<Session | undefined> {
    return (await db()).get('sessions', id);
  }

  async getLatest(): Promise<Session | undefined> {
    const sessions = await this.getAll();
    return sessions[0];
  }

  async createNewPeriod(): Promise<Session> {
    const sessions = await this.getAll();
    const nextPeriod = sessions.length > 0 ? Math.max(...sessions.map(s => s.period)) + 1 : 1;
    const books = await this.bookService.ensureDefaultBooks();
    const shuffled = [...books].sort(() => Math.random() - 0.5).slice(0, 5);
    const candidates: VoteOption[] = shuffled.map(b => ({
      bookId: b.id,
      book: b,
      votes: 0,
    }));

    const session: Session = {
      id: this.genId('s'),
      period: nextPeriod,
      status: 'voting',
      voteStatus: 'active',
      voteCandidates: candidates,
      startDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    await (await db()).add('sessions', session);
    await this.clubService.updateLastVoteTime();
    return session;
  }

  async updateStatus(id: string, status: SessionStatus): Promise<Session | undefined> {
    const session = await this.getById(id);
    if (!session) return undefined;
    session.status = status;
    if (status === 'completed') {
      session.endDate = new Date().toISOString();
      if (session.hostMemberId) {
        await this.memberService.addHostPoints(session.hostMemberId);
      }
    }
    await (await db()).put('sessions', session);
    return session;
  }

  async setHost(id: string, memberId: string): Promise<Session | undefined> {
    const session = await this.getById(id);
    if (!session) return undefined;
    session.hostMemberId = memberId;
    await (await db()).put('sessions', session);
    return session;
  }

  async closeVote(sessionId: string): Promise<Session | undefined> {
    const session = await this.getById(sessionId);
    if (!session) return undefined;

    const votes = await (await db()).getAllFromIndex('votes', 'by-session', sessionId);
    const voteCount = new Map<string, number>();
    for (const v of votes) {
      voteCount.set(v.bookId, (voteCount.get(v.bookId) ?? 0) + 1);
    }
    session.voteCandidates.forEach(c => {
      c.votes = voteCount.get(c.bookId) ?? 0;
    });

    const maxVotes = Math.max(...session.voteCandidates.map(c => c.votes), 0);
    const topBooks = session.voteCandidates.filter(c => c.votes === maxVotes);

    session.voteStatus = 'closed';
    if (maxVotes === 0 || topBooks.length > 1) {
      // 零票或并列，需要手动指定
      session.book = undefined;
      session.status = 'voting';
    } else {
      session.book = topBooks[0].book;
      session.status = 'reading';
    }
    await (await db()).put('sessions', session);
    return session;
  }

  async manualSelectBook(sessionId: string, bookId: string): Promise<Session | undefined> {
    const session = await this.getById(sessionId);
    if (!session) return undefined;
    const candidate = session.voteCandidates.find(c => c.bookId === bookId);
    if (candidate) {
      session.book = candidate.book;
      session.status = 'reading';
      session.voteStatus = 'closed';
      await (await db()).put('sessions', session);
    }
    return session;
  }

  async castVote(sessionId: string, memberId: string, bookId: string): Promise<Vote | null> {
    const session = await this.getById(sessionId);
    if (!session || session.voteStatus !== 'active') return null;

    const existingVotes = await (await db()).getAllFromIndex('votes', 'by-session', sessionId);
    if (existingVotes.some(v => v.memberId === memberId)) return null;

    const vote: Vote = {
      id: this.genId('v'),
      sessionId,
      memberId,
      bookId,
      createdAt: new Date().toISOString(),
    };
    await (await db()).add('votes', vote);
    return vote;
  }

  async getSessionVotes(sessionId: string): Promise<Vote[]> {
    return (await db()).getAllFromIndex('votes', 'by-session', sessionId);
  }
}
