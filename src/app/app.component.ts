import { Component, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { AppStore } from './core/store/app.store';
import { MemberService } from './core/services/member.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'bc-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatBadgeModule,
    MatSelectModule,
    MatButtonModule,
    FormsModule,
  ],
  template: `
    <mat-sidenav-container class="app-container">
      <mat-sidenav mode="side" opened class="sidenav">
        <div class="brand">
          <mat-icon class="brand-icon">menu_book</mat-icon>
          <span class="brand-name">{{ clubName() || '读书会' }}</span>
        </div>
        <mat-nav-list>
          @for (item of navItems; track item.path) {
            <a mat-list-item [routerLink]="item.path" routerLinkActive="active-link">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="main-content">
        <mat-toolbar color="primary" class="toolbar">
          <span class="spacer"></span>

          <mat-form-field class="member-select" appearance="outline" subscriptSizing="dynamic">
            <mat-label>当前身份</mat-label>
            <mat-select [value]="store.currentMemberId()" (valueChange)="onMemberChange($event)">
              @for (m of store.members(); track m.id) {
                <mat-option [value]="m.id">
                  {{ m.name }} ({{ m.points }}分)
                </mat-option>
              }
              @if (store.members().length === 0) {
                <mat-option value="">先去添加会员</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <button mat-icon-button [matBadge]="store.unreadCount()" [matBadgeHidden]="store.unreadCount() === 0"
                  matBadgeColor="warn" routerLink="/notifications">
            <mat-icon>notifications</mat-icon>
          </button>
        </mat-toolbar>

        <div class="page-content">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .app-container {
      height: 100vh;
    }
    .sidenav {
      width: 240px;
      background: #fff;
      border-right: 1px solid #e0e0e0;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 20px 16px 16px;
      border-bottom: 1px solid #f0f0f0;
    }
    .brand-icon {
      color: #3f51b5;
      font-size: 28px;
    }
    .brand-name {
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }
    ::ng-deep .active-link {
      background: #e8eaf6 !important;
      color: #3f51b5;
    }
    .main-content {
      background: #f5f5f5;
    }
    .toolbar {
      display: flex;
      align-items: center;
    }
    .spacer {
      flex: 1;
    }
    .member-select {
      margin-right: 16px;
      min-width: 180px;
    }
    .page-content {
      min-height: calc(100vh - 64px);
    }
  `]
})
export class AppComponent implements OnInit {
  navItems: NavItem[] = [
    { path: '/dashboard', label: '仪表盘', icon: 'dashboard' },
    { path: '/club', label: '读书会档案', icon: 'groups' },
    { path: '/members', label: '会员管理', icon: 'people' },
    { path: '/sessions', label: '期次与投票', icon: 'event' },
    { path: '/progress', label: '读书进度', icon: 'trending_up' },
    { path: '/discussion', label: '讨论区', icon: 'forum' },
    { path: '/exchange', label: '积分兑换', icon: 'redeem' },
    { path: '/notifications', label: '消息中心', icon: 'notifications' },
  ];

  clubName = computed(() => this.store.club()?.name);

  constructor(public store: AppStore, private memberSvc: MemberService) {}

  async ngOnInit() {
    await this.store.init();
    if (this.store.members().length === 0) {
      await this.memberSvc.create({ name: '会长', gender: 'other', age: 30 });
      await this.store.loadMembers();
      this.store.setCurrentMember(this.store.members()[0].id);
    }
  }

  onMemberChange(id: string) {
    this.store.setCurrentMember(id);
  }
}
