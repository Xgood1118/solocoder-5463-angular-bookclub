import { Injectable } from '@angular/core';
import { db } from './database.service';
import type { Notification } from '../models/types';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private genId(): string {
    return 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  async getByMember(memberId: string): Promise<Notification[]> {
    const list = await (await db()).getAllFromIndex('notifications', 'by-member', memberId);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getUnreadCount(memberId: string): Promise<number> {
    const list = await this.getByMember(memberId);
    return list.filter(n => !n.isRead).length;
  }

  async create(memberId: string, type: Notification['type'], content: string, relatedId?: string): Promise<Notification> {
    const n: Notification = {
      id: this.genId(),
      memberId,
      type,
      content,
      relatedId,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    await (await db()).add('notifications', n);
    return n;
  }

  async markRead(id: string): Promise<void> {
    const n = await (await db()).get('notifications', id);
    if (n) {
      n.isRead = true;
      await (await db()).put('notifications', n);
    }
  }

  async markAllRead(memberId: string): Promise<void> {
    const list = await this.getByMember(memberId);
    for (const n of list) {
      if (!n.isRead) {
        n.isRead = true;
        await (await db()).put('notifications', n);
      }
    }
  }
}
