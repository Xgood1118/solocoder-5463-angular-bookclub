import { Injectable } from '@angular/core';
import { db } from './database.service';
import type { Book } from '../models/types';

@Injectable({ providedIn: 'root' })
export class BookService {
  private genId(): string {
    return 'b_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  async getAll(): Promise<Book[]> {
    return (await db()).getAll('books');
  }

  async getById(id: string): Promise<Book | undefined> {
    return (await db()).get('books', id);
  }

  async create(data: Partial<Book>): Promise<Book> {
    const book: Book = {
      id: this.genId(),
      title: data.title ?? '',
      author: data.author ?? '',
      totalChapters: data.totalChapters ?? 0,
      cover: data.cover,
      description: data.description,
      createdAt: new Date().toISOString(),
    };
    await (await db()).add('books', book);
    return book;
  }

  async update(id: string, data: Partial<Book>): Promise<Book | undefined> {
    const existing = await this.getById(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    await (await db()).put('books', updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    await (await db()).delete('books', id);
  }

  async ensureDefaultBooks(): Promise<Book[]> {
    const existing = await this.getAll();
    if (existing.length >= 5) return existing;
    const defaults: Partial<Book>[] = [
      { title: '置身事内', author: '兰小欢', totalChapters: 12 },
      { title: '被讨厌的勇气', author: '岸见一郎', totalChapters: 10 },
      { title: '人类简史', author: '尤瓦尔·赫拉利', totalChapters: 20 },
      { title: '原则', author: '瑞·达利欧', totalChapters: 15 },
      { title: '小王子', author: '安托万·德·圣-埃克苏佩里', totalChapters: 27 },
    ];
    const needed = defaults.slice(0, 5 - existing.length);
    const created: Book[] = [];
    for (const d of needed) {
      created.push(await this.create(d));
    }
    return [...existing, ...created];
  }
}
