import { Injectable, signal, computed } from '@angular/core';
import type {
  Club, Member, Book, Session, Topic, Comment, Notification, ExchangeRecord, ReadingProgress
} from '../models/types';
import { ClubService } from '../services/club.service';
import { MemberService } from '../services/member.service';
import { BookService } from '../services/book.service';
import { SessionService } from '../services/session.service';
import { ProgressService } from '../services/progress.service';
import { DiscussionService } from '../services/discussion.service';
import { NotificationService } from '../services/notification.service';
import { ExchangeService } from '../services/exchange.service';

@Injectable({ providedIn: 'root' })
export class AppStore {
  private clubSig = signal<Club | null>(null);
  private membersSig = signal<Member[]>([]);
  private booksSig = signal<Book[]>([]);
  private sessionsSig = signal<Session[]>([]);
  private progressesSig = signal<ReadingProgress[]>([]);
  private notificationsSig = signal<Notification[]>([]);
  private exchangesSig = signal<ExchangeRecord[]>([]);
  private currentMemberIdSig = signal<string>('');

  readonly club = computed(() => this.clubSig());
  readonly members = computed(() => this.membersSig());
  readonly books = computed(() => this.booksSig());
  readonly sessions = computed(() => this.sessionsSig());
  readonly progresses = computed(() => this.progressesSig());
  readonly notifications = computed(() => this.notificationsSig());
  readonly exchanges = computed(() => this.exchangesSig());
  readonly currentMemberId = computed(() => this.currentMemberIdSig());

  readonly currentMember = computed(() =>
    this.membersSig().find(m => m.id === this.currentMemberIdSig()) ?? null
  );
  readonly latestSession = computed(() =>
    [...this.sessionsSig()].sort((a, b) => b.period - a.period)[0] ?? null
  );
  readonly unreadCount = computed(() =>
    this.notificationsSig().filter(n => !n.isRead && n.memberId === this.currentMemberIdSig()).length
  );
  readonly shouldOpenNewVote = computed(() => {
    const club = this.clubSig();
    if (!club?.lastVoteTime) return true;
    const diff = Date.now() - new Date(club.lastVoteTime).getTime();
    return diff >= 7 * 24 * 60 * 60 * 1000;
  });

  constructor(
    private clubSvc: ClubService,
    private memberSvc: MemberService,
    private bookSvc: BookService,
    private sessionSvc: SessionService,
    private progressSvc: ProgressService,
    private discussionSvc: DiscussionService,
    private notificationSvc: NotificationService,
    private exchangeSvc: ExchangeService
  ) {}

  async init(): Promise<void> {
    const club = await this.clubSvc.get();
    if (club) {
      this.clubSig.set(club);
      localStorage.setItem('club-cache', JSON.stringify(club));
    } else {
      const newClub = await this.clubSvc.save({});
      this.clubSig.set(newClub);
      localStorage.setItem('club-cache', JSON.stringify(newClub));
    }
    await this.loadMembers();
    await this.loadBooks();
    await this.loadSessions();
    await this.loadProgresses();
    await this.loadExchanges();

    if (this.membersSig().length > 0) {
      const savedId = localStorage.getItem('current-member-id');
      const target = savedId && this.membersSig().find(m => m.id === savedId)
        ? savedId
        : this.membersSig()[0].id;
      this.setCurrentMember(target);
    }
  }

  setCurrentMember(id: string): void {
    this.currentMemberIdSig.set(id);
    localStorage.setItem('current-member-id', id);
    this.loadNotifications();
  }

  async loadMembers(): Promise<void> {
    this.membersSig.set(await this.memberSvc.getAll());
  }
  async loadBooks(): Promise<void> {
    this.booksSig.set(await this.bookSvc.getAll());
  }
  async loadSessions(): Promise<void> {
    this.sessionsSig.set(await this.sessionSvc.getAll());
  }
  async loadProgresses(): Promise<void> {
    this.progressesSig.set(await this.progressSvc.getAll());
  }
  async loadNotifications(): Promise<void> {
    if (!this.currentMemberIdSig()) return;
    this.notificationsSig.set(await this.notificationSvc.getByMember(this.currentMemberIdSig()));
  }
  async loadExchanges(): Promise<void> {
    this.exchangesSig.set(await this.exchangeSvc.getAll());
  }

  async saveClub(data: Partial<Club>): Promise<void> {
    const saved = await this.clubSvc.save(data);
    this.clubSig.set(saved);
    localStorage.setItem('club-cache', JSON.stringify(saved));
  }
}
