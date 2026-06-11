import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type {
  Club, Member, Book, Session, Vote, ReadingProgress, Topic, Comment, Notification, ExchangeRecord
} from '../models/types';

interface BookClubDB extends DBSchema {
  club: { key: string; value: Club };
  members: { key: string; value: Member; indexes: { 'by-name': string } };
  books: { key: string; value: Book };
  sessions: { key: string; value: Session };
  votes: { key: string; value: Vote; indexes: { 'by-session': string } };
  progress: { key: string; value: ReadingProgress; indexes: { 'by-member-book': [string, string]; 'by-session': string } };
  topics: { key: string; value: Topic; indexes: { 'by-session': string } };
  comments: { key: string; value: Comment; indexes: { 'by-topic': string } };
  notifications: { key: string; value: Notification; indexes: { 'by-member': string } };
  exchanges: { key: string; value: ExchangeRecord; indexes: { 'by-nonce': string; 'by-member': string } };
}

const DB_NAME = 'bookclub-db';
const DB_VERSION = 2;

export class DatabaseService {
  private static instance: DatabaseService;
  private dbPromise: Promise<IDBPDatabase<BookClubDB>>;

  private constructor() {
    this.dbPromise = openDB<BookClubDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains('club')) db.createObjectStore('club');
          if (!db.objectStoreNames.contains('members')) {
            const m = db.createObjectStore('members', { keyPath: 'id' });
            m.createIndex('by-name', 'name');
          }
          if (!db.objectStoreNames.contains('books')) db.createObjectStore('books', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('votes')) {
            const v = db.createObjectStore('votes', { keyPath: 'id' });
            v.createIndex('by-session', 'sessionId');
          }
          if (!db.objectStoreNames.contains('progress')) {
            const p = db.createObjectStore('progress', { keyPath: 'id' });
            p.createIndex('by-member-book', ['memberId', 'bookId']);
            p.createIndex('by-session', 'sessionId');
          }
          if (!db.objectStoreNames.contains('topics')) {
            const t = db.createObjectStore('topics', { keyPath: 'id' });
            t.createIndex('by-session', 'sessionId');
          }
          if (!db.objectStoreNames.contains('comments')) {
            const c = db.createObjectStore('comments', { keyPath: 'id' });
            c.createIndex('by-topic', 'topicId');
          }
          if (!db.objectStoreNames.contains('notifications')) {
            const n = db.createObjectStore('notifications', { keyPath: 'id' });
            n.createIndex('by-member', 'memberId');
          }
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('exchanges')) {
            const e = db.createObjectStore('exchanges', { keyPath: 'id' });
            e.createIndex('by-nonce', 'nonce', { unique: true });
            e.createIndex('by-member', 'memberId');
          }
        }
      },
    });
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  getDB(): Promise<IDBPDatabase<BookClubDB>> {
    return this.dbPromise;
  }
}

export const db = () => DatabaseService.getInstance().getDB();
