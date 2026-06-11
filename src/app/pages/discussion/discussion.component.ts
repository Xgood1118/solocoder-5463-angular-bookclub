import { Component, Input, Output, EventEmitter, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { AppStore } from '../../core/store/app.store';
import { DiscussionService } from '../../core/services/discussion.service';
import type { Topic, Comment, MediaLink } from '../../core/models/types';

@Component({
  selector: 'bc-topic-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatDialogModule, MatIconModule, MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title style="margin: 0; padding: 20px 24px 0;">发布新话题</h2>
    <mat-dialog-content style="padding: 16px 24px;">
      <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 8px;">
        <mat-label>标题</mat-label>
        <input matInput [(ngModel)]="title">
      </mat-form-field>
      <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 8px;">
        <mat-label>内容（&#64;会员名 可通知对方）</mat-label>
        <textarea matInput rows="5" [(ngModel)]="content"></textarea>
      </mat-form-field>
      <div style="font-size: 13px; color: #666; margin-bottom: 8px;">媒体链接（B站、录音等，可选）</div>
      @for (m of media; track $index) {
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <mat-form-field appearance="outline" style="width: 120px;">
            <mat-select [(ngModel)]="m.type">
              <mat-option value="video">视频</mat-option>
              <mat-option value="audio">录音</mat-option>
              <mat-option value="image">图片</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex: 1;">
            <input matInput [(ngModel)]="m.url" placeholder="https://...">
          </mat-form-field>
          <button mat-icon-button (click)="media.splice($index, 1)"><mat-icon>close</mat-icon></button>
        </div>
      }
      <button mat-stroked-button type="button" (click)="addMedia()">
        <mat-icon style="font-size: 18px; margin-right: 4px;">add</mat-icon>添加媒体链接
      </button>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding: 8px 24px 20px;">
      <button mat-button mat-dialog-close>取消</button>
      <button mat-raised-button color="primary" [disabled]="!title || !content" (click)="submit()">发布</button>
    </mat-dialog-actions>
  `
})
export class TopicDialogComponent {
  title = '';
  content = '';
  media: MediaLink[] = [];

  constructor(public dialogRef: MatDialogRef<TopicDialogComponent>) {}

  addMedia() {
    this.media.push({ type: 'video', url: '', title: '' });
  }

  submit() {
    const filtered = this.media.filter(m => m.url.trim() !== '');
    this.dialogRef.close({
      title: this.title, content: this.content,
      mediaLinks: filtered.length > 0 ? filtered : undefined
    });
  }
}

// ---------------- Topic Card ----------------
@Component({
  selector: 'bc-topic-card',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule, MatCardModule,
    MatInputModule, MatSnackBarModule
  ],
  template: `
    <div class="topic-card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="flex: 1;">
          <div style="margin-bottom: 6px;">
            @if (topic.isPinned) {
              <span class="badge-pill badge-danger">
                <mat-icon style="font-size: 12px; vertical-align: middle;">push_pin</mat-icon>
                置顶
              </span>
            }
            @if (topic.isEssence) {
              <span class="badge-pill badge-warning">✨ 精华</span>
            }
          </div>
          <h3 style="margin: 0 0 8px; font-size: 18px; color: #333;">{{ topic.title }}</h3>
          <div style="color: #666; font-size: 13px; margin-bottom: 12px;">
            {{ memberName }} · {{ topic.createdAt.slice(0, 16).replace('T', ' ') }}
          </div>
          <p style="color: #444; white-space: pre-wrap; line-height: 1.6;">{{ topic.content }}</p>

          @if (topic.mediaLinks?.length) {
            <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 6px;">
              @for (m of topic.mediaLinks; track $index) {
                <a [href]="m.url" target="_blank" rel="noopener"
                   style="color: #3f51b5; text-decoration: none; font-size: 13px;">
                  <mat-icon style="font-size: 14px; vertical-align: middle; margin-right: 4px;">
                    {{ m.type === 'video' ? 'videocam' : m.type === 'audio' ? 'audiotrack' : 'image' }}
                  </mat-icon>
                  {{ m.title || m.url }}
                </a>
              }
            </div>
          }
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end;">
          <button mat-icon-button (click)="emit('pin')" title="置顶/取消">
            <mat-icon [color]="topic.isPinned ? 'warn' : ''">push_pin</mat-icon>
          </button>
          <button mat-icon-button (click)="emit('delete')" title="删除">
            <mat-icon>delete_outline</mat-icon>
          </button>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 16px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
        <button mat-button (click)="emit('like')" [color]="isLiked ? 'primary' : ''">
          <mat-icon>{{ isLiked ? 'favorite' : 'favorite_border' }}</mat-icon>
          <span style="margin-left: 4px;">{{ topic.likeCount }}</span>
        </button>
        <button mat-button (click)="toggleComments()">
          <mat-icon>comment</mat-icon>
          <span style="margin-left: 4px;">评论 ({{ comments().length }})</span>
        </button>
      </div>

      @if (showComments()) {
        <div style="margin-top: 16px; padding: 16px; background: #fafafa; border-radius: 8px;">
          <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            <input style="flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;"
                   placeholder="写评论... &#64;会员名 可通知对方" [(ngModel)]="commentDraft"
                   (keydown.enter)="submitComment()">
            <button mat-raised-button color="primary" (click)="submitComment()">发送</button>
          </div>
          @if (quoteTopic) {
            <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
              <span class="badge-pill badge-primary">引用话题</span>
              <span style="font-size: 13px; color: #555;">「{{ quoteTopic.title }}」</span>
              <button mat-icon-button style="width: 24px; height: 24px;" (click)="quoteTopic = undefined">
                <mat-icon style="font-size: 16px;">close</mat-icon>
              </button>
            </div>
          }
          @for (c of comments(); track c.id) {
            <div class="comment-block">
              <div style="display: flex; justify-content: space-between;">
                <div style="font-size: 13px; color: #555;">
                  <strong>{{ commentAuthor(c.memberId) }}</strong>
                  · {{ c.createdAt.slice(0, 16).replace('T', ' ') }}
                </div>
                <button mat-icon-button (click)="deleteComment(c)" style="width: 24px; height: 24px;">
                  <mat-icon style="font-size: 16px;">close</mat-icon>
                </button>
              </div>
              @if (c.quoteTopicId) {
                @if (getQuoteTopic(c.quoteTopicId)) {
                  <div style="background: #fff; border-left: 3px solid #3f51b5; padding: 8px 12px; margin: 8px 0; font-size: 13px; color: #555;">
                    <div style="font-weight: 500;">引用：{{ getQuoteTopic(c.quoteTopicId)!.title }}</div>
                    <div style="color: #777;">{{ getQuoteTopic(c.quoteTopicId)!.content.slice(0, 80) }}...</div>
                  </div>
                } @else {
                  <div class="deleted-ref" style="margin: 8px 0;">原话题已删除</div>
                }
              }
              <div style="white-space: pre-wrap; line-height: 1.5; color: #333; margin-top: 4px;">{{ c.content }}</div>
              <div style="margin-top: 6px;">
                <button mat-button style="padding: 0 4px; font-size: 12px;" (click)="likeComment(c)">
                  <mat-icon style="font-size: 14px;">{{ isCommentLiked(c) ? 'favorite' : 'favorite_border' }}</mat-icon>
                  <span style="margin-left: 2px; font-size: 12px;">{{ c.likeCount }}</span>
                </button>
                <button mat-button style="padding: 0 4px; font-size: 12px;" (click)="startQuote()">
                  <mat-icon style="font-size: 14px;">format_quote</mat-icon>
                  <span style="margin-left: 2px; font-size: 12px;">引用</span>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .topic-card {
      background: #fff;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .comment-block {
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .comment-block:last-child { border-bottom: none; }
  `]
})
export class TopicCardComponent implements OnInit {
  @Input() topic!: Topic;
  @Input() sessionId!: string;
  @Output() action = new EventEmitter<{ type: string; topic: Topic }>();

  showComments = signal(false);
  comments = signal<Comment[]>([]);
  commentDraft = '';
  quoteTopic: Topic | undefined;

  constructor(private discussionSvc: DiscussionService, public store: AppStore, private snackBar: MatSnackBar) {}

  ngOnInit() {}

  get isLiked(): boolean {
    return this.topic.likes.includes(this.store.currentMemberId());
  }

  get memberName(): string {
    return this.store.members().find(m => m.id === this.topic.memberId)?.name ?? '未知会员';
  }

  emit(type: string) {
    this.action.emit({ type, topic: this.topic });
  }

  async toggleComments() {
    this.showComments.update(v => !v);
    if (this.showComments()) {
      this.comments.set(await this.discussionSvc.getComments(this.topic.id));
    }
  }

  commentAuthor(id: string): string {
    return this.store.members().find(m => m.id === id)?.name ?? '未知';
  }

  getQuoteTopic(id: string): Topic | undefined {
    if (id === this.topic.id) return this.topic;
    return undefined;
  }

  isCommentLiked(c: Comment): boolean {
    return c.likes.includes(this.store.currentMemberId());
  }

  async submitComment() {
    if (!this.commentDraft.trim() || !this.store.currentMemberId()) return;
    const mentions = this.discussionSvc.extractMentions(this.commentDraft);
    await this.discussionSvc.createComment(
      this.topic.id, this.store.currentMemberId(),
      this.commentDraft, mentions, this.quoteTopic?.id
    );
    this.commentDraft = '';
    this.quoteTopic = undefined;
    this.comments.set(await this.discussionSvc.getComments(this.topic.id));
    this.emit('refresh');
  }

  async likeComment(c: Comment) {
    if (!this.store.currentMemberId()) return;
    await this.discussionSvc.likeComment(c.id, this.store.currentMemberId());
    this.comments.set(await this.discussionSvc.getComments(this.topic.id));
  }

  async deleteComment(c: Comment) {
    if (!confirm('删除此评论？')) return;
    await this.discussionSvc.deleteComment(c.id);
    this.comments.set(await this.discussionSvc.getComments(this.topic.id));
  }

  startQuote() {
    this.quoteTopic = this.topic;
  }
}

// ---------------- Main Discussion Component ----------------
@Component({
  selector: 'bc-discussion',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule, MatCardModule,
    MatSelectModule, MatFormFieldModule, MatInputModule, MatTabsModule,
    MatDialogModule, MatSnackBarModule, MatDividerModule, MatChipsModule,
    TopicCardComponent
  ],
  template: `
    <div class="page-container">
      <h1 class="page-title">讨论区</h1>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
        <mat-form-field appearance="outline" style="min-width: 240px;">
          <mat-label>选择期次</mat-label>
          <mat-select [value]="selectedSessionId()" (valueChange)="onSessionChange($event)">
            @for (s of store.sessions(); track s.id) {
              <mat-option [value]="s.id">
                第 {{ s.period }} 期 — {{ s.book ? '《' + s.book.title + '》' : '未选书' }}
              </mat-option>
            }
          </mat-select>
        </mat-form-field>
        <button mat-raised-button color="primary" (click)="openTopicDialog()">
          <mat-icon style="font-size: 18px; margin-right: 4px;">add</mat-icon>发新话题
        </button>
      </div>

      <mat-tab-group [(selectedIndex)]="tabIndex" (selectedIndexChange)="onTabChange()">
        <mat-tab label="全部话题">
          <div style="margin-top: 16px;">
            @for (t of topics(); track t.id) {
              <bc-topic-card [topic]="t" [sessionId]="selectedSessionId()"
                             (action)="handleAction($event)"></bc-topic-card>
            }
            @if (topics().length === 0) {
              <div class="empty-state">
                <mat-icon class="empty-state-icon">forum</mat-icon>
                <p>还没有话题，点击「发新话题」开启讨论吧</p>
              </div>
            }
          </div>
        </mat-tab>
        <mat-tab label="精华">
          <div style="margin-top: 16px;">
            @for (t of essenceTopics(); track t.id) {
              <bc-topic-card [topic]="t" [sessionId]="selectedSessionId()"
                             (action)="handleAction($event)"></bc-topic-card>
            }
            @if (essenceTopics().length === 0) {
              <div class="empty-state">
                <mat-icon class="empty-state-icon">stars</mat-icon>
                <p>暂无精华话题（获得 10 赞自动晋升精华）</p>
              </div>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `
})
export class DiscussionComponent implements OnInit {
  selectedSessionId = signal<string>('');
  tabIndex = signal(0);
  private _topics = signal<Topic[]>([]);
  topics = computed(() => this._topics().filter(t => !t.isDeleted));
  essenceTopics = computed(() => this._topics().filter(t => !t.isDeleted && t.isEssence));

  constructor(
    public store: AppStore,
    private discussionSvc: DiscussionService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    const latest = this.store.latestSession();
    if (latest) {
      this.selectedSessionId.set(latest.id);
      this.loadTopics();
    }
  }

  async onSessionChange(id: string) {
    this.selectedSessionId.set(id);
    await this.loadTopics();
  }

  onTabChange() {}

  async loadTopics() {
    if (!this.selectedSessionId()) return;
    this._topics.set(await this.discussionSvc.getTopicsBySession(this.selectedSessionId()));
  }

  openTopicDialog() {
    if (!this.store.currentMemberId()) {
      this.snackBar.open('请先选择身份', 'OK', { duration: 1500 });
      return;
    }
    const ref = this.dialog.open(TopicDialogComponent, { width: '600px' });
    ref.afterClosed().subscribe(async (data) => {
      if (data && this.selectedSessionId()) {
        await this.discussionSvc.createTopic(
          this.selectedSessionId(),
          this.store.currentMemberId(),
          data.title, data.content, data.mediaLinks
        );
        await this.loadTopics();
        this.snackBar.open('已发布话题', 'OK', { duration: 1500 });
      }
    });
  }

  async handleAction(evt: { type: string; topic: Topic }) {
    const t = evt.topic;
    switch (evt.type) {
      case 'like': {
        if (!this.store.currentMemberId()) return;
        await this.discussionSvc.likeTopic(t.id, this.store.currentMemberId());
        await this.loadTopics();
        break;
      }
      case 'pin': {
        await this.discussionSvc.toggleTopicPin(t.id);
        await this.loadTopics();
        this.snackBar.open(t.isPinned ? '已取消置顶' : '已置顶', 'OK', { duration: 1500 });
        break;
      }
      case 'delete': {
        if (!confirm('确定删除该话题？')) return;
        await this.discussionSvc.deleteTopic(t.id);
        await this.loadTopics();
        break;
      }
      case 'refresh': {
        await this.loadTopics();
        break;
      }
    }
  }
}
