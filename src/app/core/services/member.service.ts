import { Injectable } from '@angular/core';
import { db } from './database.service';
import type { Member } from '../models/types';

@Injectable({ providedIn: 'root' })
export class MemberService {
  private genId(): string {
    return 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  async getAll(): Promise<Member[]> {
    return (await db()).getAll('members');
  }

  async getById(id: string): Promise<Member | undefined> {
    return (await db()).get('members', id);
  }

  async getByName(name: string): Promise<Member | undefined> {
    const all = await this.getAll();
    return all.find(m => m.name === name);
  }

  async create(data: Partial<Member>): Promise<Member> {
    const now = new Date().toISOString();
    const member: Member = {
      id: this.genId(),
      name: data.name ?? '',
      gender: data.gender ?? 'other',
      age: data.age ?? 0,
      joinDate: data.joinDate ?? now,
      booksRead: data.booksRead ?? 0,
      speechesCount: data.speechesCount ?? 0,
      contributionScore: data.contributionScore ?? 0,
      points: data.points ?? 0,
      wechatId: data.wechatId,
      phone: data.phone,
      note: data.note,
      createdAt: now,
      updatedAt: now,
    };
    await (await db()).add('members', member);
    return member;
  }

  async update(id: string, data: Partial<Member>): Promise<Member | undefined> {
    const existing = await this.getById(id);
    if (!existing) return undefined;
    const updated: Member = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await (await db()).put('members', updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const dbInstance = await db();
    const tx = dbInstance.transaction(
      ['members', 'progress', 'exchanges', 'notifications', 'votes', 'topics', 'comments', 'sessions'],
      'readwrite'
    );
    try {
      const memberStore = tx.objectStore('members');
      const progressStore = tx.objectStore('progress');
      const exchangeStore = tx.objectStore('exchanges');
      const notificationStore = tx.objectStore('notifications');
      const voteStore = tx.objectStore('votes');
      const topicStore = tx.objectStore('topics');
      const commentStore = tx.objectStore('comments');
      const sessionStore = tx.objectStore('sessions');

      await memberStore.delete(id);

      const allProgress = await progressStore.getAll();
      for (const p of allProgress) {
        if (p.memberId === id) {
          await progressStore.delete(p.id);
        }
      }

      const allExchanges = await exchangeStore.getAll();
      for (const e of allExchanges) {
        if (e.memberId === id) {
          await exchangeStore.delete(e.id);
        }
      }

      const allNotifications = await notificationStore.getAll();
      for (const n of allNotifications) {
        if (n.memberId === id) {
          await notificationStore.delete(n.id);
        }
      }

      const allVotes = await voteStore.getAll();
      for (const v of allVotes) {
        if (v.memberId === id) {
          await voteStore.delete(v.id);
        }
      }

      const allTopics = await topicStore.getAll();
      const topicIdsToDelete: string[] = [];
      for (const t of allTopics) {
        if (t.memberId === id) {
          topicIdsToDelete.push(t.id);
          await topicStore.delete(t.id);
        } else {
          let changed = false;
          if (t.likes && t.likes.includes(id)) {
            t.likes = t.likes.filter(lid => lid !== id);
            t.likeCount = t.likes.length;
            changed = true;
          }
          if (changed) {
            await topicStore.put(t);
          }
        }
      }

      const allComments = await commentStore.getAll();
      for (const c of allComments) {
        if (c.memberId === id) {
          await commentStore.delete(c.id);
        } else {
          let changed = false;
          if (c.likes && c.likes.includes(id)) {
            c.likes = c.likes.filter(lid => lid !== id);
            c.likeCount = c.likes.length;
            changed = true;
          }
          if (c.mentionMemberIds && c.mentionMemberIds.includes(id)) {
            c.mentionMemberIds = c.mentionMemberIds.filter(mid => mid !== id);
            changed = true;
          }
          if (changed) {
            await commentStore.put(c);
          }
        }
      }

      const allSessions = await sessionStore.getAll();
      for (const s of allSessions) {
        if (s.hostMemberId === id) {
          s.hostMemberId = undefined;
          await sessionStore.put(s);
        }
      }

      await tx.done;
    } catch (err) {
      try { await tx.abort(); } catch {}
      throw err;
    }
  }

  async addSpeechPoints(memberId: string): Promise<Member | undefined> {
    const m = await this.getById(memberId);
    if (!m) return undefined;
    return this.update(memberId, {
      speechesCount: m.speechesCount + 1,
      points: m.points + 5,
      contributionScore: m.contributionScore + 5,
    });
  }

  async addHostPoints(memberId: string): Promise<Member | undefined> {
    const m = await this.getById(memberId);
    if (!m) return undefined;
    return this.update(memberId, {
      points: m.points + 20,
      contributionScore: m.contributionScore + 20,
    });
  }

  async deductPoints(memberId: string, points: number): Promise<Member | undefined> {
    const m = await this.getById(memberId);
    if (!m || m.points < points) return undefined;
    return this.update(memberId, { points: m.points - points });
  }

  async bulkCreate(members: Partial<Member>[]): Promise<Member[]> {
    const result: Member[] = [];
    const dbInstance = await db();
    const tx = dbInstance.transaction('members', 'readwrite');
    for (const data of members) {
      const now = new Date().toISOString();
      const member: Member = {
        id: this.genId(),
        name: data.name ?? '',
        gender: data.gender ?? 'other',
        age: data.age ?? 0,
        joinDate: data.joinDate ?? now,
        booksRead: data.booksRead ?? 0,
        speechesCount: data.speechesCount ?? 0,
        contributionScore: data.contributionScore ?? 0,
        points: data.points ?? 0,
        wechatId: data.wechatId,
        phone: data.phone,
        note: data.note,
        createdAt: now,
        updatedAt: now,
      };
      await tx.store.add(member);
      result.push(member);
    }
    await tx.done;
    return result;
  }
}
