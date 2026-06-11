import { Injectable } from '@angular/core';
import { db } from './database.service';
import type { Topic, Comment, MediaLink } from '../models/types';
import { MemberService } from './member.service';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class DiscussionService {
  constructor(
    private memberService: MemberService,
    private notificationService: NotificationService
  ) {}

  private genId(prefix: string): string {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  // ---------------- Topics ----------------
  async getTopicsBySession(sessionId: string): Promise<Topic[]> {
    const topics = await (await db()).getAllFromIndex('topics', 'by-session', sessionId);
    return topics
      .filter(t => !t.isDeleted)
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }

  async getEssenceTopics(sessionId: string): Promise<Topic[]> {
    const topics = await this.getTopicsBySession(sessionId);
    return topics.filter(t => t.isEssence);
  }

  async getTopic(id: string): Promise<Topic | undefined> {
    return (await db()).get('topics', id);
  }

  async createTopic(sessionId: string, memberId: string, title: string, content: string, mediaLinks?: MediaLink[]): Promise<Topic> {
    const topic: Topic = {
      id: this.genId('t'),
      sessionId,
      memberId,
      title,
      content,
      isPinned: false,
      isEssence: false,
      likes: [],
      likeCount: 0,
      mediaLinks,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };
    await (await db()).add('topics', topic);
    return topic;
  }

  async toggleTopicPin(id: string): Promise<Topic | undefined> {
    const topic = await this.getTopic(id);
    if (!topic) return undefined;
    topic.isPinned = !topic.isPinned;
    await (await db()).put('topics', topic);
    return topic;
  }

  async likeTopic(id: string, memberId: string): Promise<Topic | undefined> {
    const topic = await this.getTopic(id);
    if (!topic) return undefined;
    const idx = topic.likes.indexOf(memberId);
    if (idx >= 0) {
      topic.likes.splice(idx, 1);
    } else {
      topic.likes.push(memberId);
      if (topic.memberId !== memberId) {
        const member = await this.memberService.getById(memberId);
        this.notificationService.create(topic.memberId, 'like', `${member?.name ?? '有人'} 赞了你的话题「${topic.title}」`, topic.id);
      }
    }
    topic.likeCount = topic.likes.length;
    if (topic.likeCount >= 10 && !topic.isEssence) topic.isEssence = true;
    await (await db()).put('topics', topic);
    return topic;
  }

  async deleteTopic(id: string): Promise<void> {
    const topic = await this.getTopic(id);
    if (!topic) return;
    topic.isDeleted = true;
    await (await db()).put('topics', topic);
  }

  // ---------------- Comments ----------------
  async getComments(topicId: string): Promise<Comment[]> {
    const comments = await (await db()).getAllFromIndex('comments', 'by-topic', topicId);
    return comments
      .filter(c => !c.isDeleted)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async createComment(topicId: string, memberId: string, content: string, mentionNames: string[], quoteTopicId?: string): Promise<Comment> {
    const members = await this.memberService.getAll();
    const mentionMemberIds: string[] = [];
    for (const name of mentionNames) {
      const m = members.find(x => x.name === name);
      if (m) {
        mentionMemberIds.push(m.id);
        const fromMember = members.find(x => x.id === memberId);
        this.notificationService.create(m.id, 'mention', `${fromMember?.name ?? '有人'} 在讨论中 @了你`, topicId);
      }
    }

    const comment: Comment = {
      id: this.genId('c'),
      topicId,
      memberId,
      content,
      mentionMemberIds,
      quoteTopicId,
      likes: [],
      likeCount: 0,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };
    await (await db()).add('comments', comment);
    return comment;
  }

  async likeComment(id: string, memberId: string): Promise<Comment | undefined> {
    const comments = await (await db()).getAll('comments');
    const comment = comments.find(c => c.id === id);
    if (!comment) return undefined;
    const idx = comment.likes.indexOf(memberId);
    if (idx >= 0) comment.likes.splice(idx, 1);
    else comment.likes.push(memberId);
    comment.likeCount = comment.likes.length;
    await (await db()).put('comments', comment);
    return comment;
  }

  async deleteComment(id: string): Promise<void> {
    const comments = await (await db()).getAll('comments');
    const comment = comments.find(c => c.id === id);
    if (!comment) return;
    comment.isDeleted = true;
    await (await db()).put('comments', comment);
  }

  extractMentions(content: string): string[] {
    const regex = /@([\u4e00-\u9fa5a-zA-Z0-9_]+)/g;
    const names: string[] = [];
    let m;
    while ((m = regex.exec(content)) !== null) {
      names.push(m[1]);
    }
    return [...new Set(names)];
  }
}
