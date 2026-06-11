export type Gender = 'male' | 'female' | 'other';

export type ActivityMode = 'online' | 'offline' | 'hybrid';

export type SessionStatus = 'voting' | 'reading' | 'discussing' | 'completed';

export type VoteStatus = 'pending' | 'active' | 'closed';

export interface Club {
  id: string;
  name: string;
  president: string;
  foundedYear: number;
  memberCount: number;
  activityMode: ActivityMode;
  annualFee: number;
  feePaymentMethod: string;
  description?: string;
  lastVoteTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  name: string;
  gender: Gender;
  age: number;
  joinDate: string;
  booksRead: number;
  speechesCount: number;
  contributionScore: number;
  points: number;
  wechatId?: string;
  phone?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  totalChapters: number;
  cover?: string;
  description?: string;
  createdAt: string;
}

export interface VoteOption {
  bookId: string;
  book: Book;
  votes: number;
}

export interface Session {
  id: string;
  period: number;
  status: SessionStatus;
  book?: Book;
  voteStatus: VoteStatus;
  voteCandidates: VoteOption[];
  startDate: string;
  endDate?: string;
  hostMemberId?: string;
  createdAt: string;
}

export interface Vote {
  id: string;
  sessionId: string;
  memberId: string;
  bookId: string;
  createdAt: string;
}

export interface ReadingProgress {
  id: string;
  memberId: string;
  bookId: string;
  sessionId: string;
  currentChapter: number;
  previousChapter: number;
  updatedAt: string;
}

export interface Topic {
  id: string;
  sessionId: string;
  memberId: string;
  title: string;
  content: string;
  isPinned: boolean;
  isEssence: boolean;
  likes: string[];
  likeCount: number;
  mediaLinks?: MediaLink[];
  isDeleted: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  topicId: string;
  memberId: string;
  content: string;
  mentionMemberIds: string[];
  quoteTopicId?: string;
  likes: string[];
  likeCount: number;
  isDeleted: boolean;
  createdAt: string;
}

export interface MediaLink {
  type: 'audio' | 'video' | 'image';
  url: string;
  title?: string;
}

export interface Notification {
  id: string;
  memberId: string;
  type: 'mention' | 'like' | 'comment' | 'system';
  content: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
}

export type ExchangeType = 'free_book' | 'fee_discount';

export interface ExchangeRecord {
  id: string;
  memberId: string;
  type: ExchangeType;
  pointsCost: number;
  description: string;
  nonce: string;
  createdAt: string;
}

export interface ReminderItem {
  memberId: string;
  memberName: string;
  bookTitle: string;
  currentProgress: number;
  totalChapters: number;
  progressRate: number;
  message: string;
}
