import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppStore } from '../../core/store/app.store';

@Component({
  selector: 'bc-club',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <h1 class="page-title">读书会档案</h1>

      <div class="card-section">
        <form [formGroup]="form" (ngSubmit)="onSave()">
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>读书会名称</mat-label>
              <input matInput formControlName="name">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>会长姓名</mat-label>
              <input matInput formControlName="president">
            </mat-form-field>
          </div>
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>成立年份</mat-label>
              <input matInput type="number" formControlName="foundedYear">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>当前会员数</mat-label>
              <input matInput type="number" formControlName="memberCount">
            </mat-form-field>
          </div>
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>活动形式</mat-label>
              <mat-select formControlName="activityMode">
                <mat-option value="online">线上（腾讯会议）</mat-option>
                <mat-option value="offline">线下（咖啡馆）</mat-option>
                <mat-option value="hybrid">线上线下结合</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>年费（元）</mat-label>
              <input matInput type="number" formControlName="annualFee">
            </mat-form-field>
          </div>
          <div class="form-row">
            <mat-form-field appearance="outline" style="flex: 1;">
              <mat-label>缴费方式</mat-label>
              <input matInput formControlName="feePaymentMethod" placeholder="例如：微信转账给会长、支付宝...">
            </mat-form-field>
          </div>
          <div class="form-row">
            <mat-form-field appearance="outline" style="flex: 1;">
              <mat-label>简介</mat-label>
              <textarea matInput rows="3" formControlName="description"></textarea>
            </mat-form-field>
          </div>
          <div>
            <button mat-raised-button color="primary" type="submit">保存</button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class ClubComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private store: AppStore,
    private snackBar: MatSnackBar
  ) {
    const club = this.store.club();
    this.form = this.fb.group({
      name: [club?.name ?? '', Validators.required],
      president: [club?.president ?? '', Validators.required],
      foundedYear: [club?.foundedYear ?? new Date().getFullYear(), [Validators.required, Validators.min(1900)]],
      memberCount: [club?.memberCount ?? 0, [Validators.required, Validators.min(0)]],
      activityMode: [club?.activityMode ?? 'hybrid', Validators.required],
      annualFee: [club?.annualFee ?? 200, [Validators.required, Validators.min(0)]],
      feePaymentMethod: [club?.feePaymentMethod ?? ''],
      description: [club?.description ?? ''],
    });
  }

  async onSave() {
    if (this.form.invalid) return;
    await this.store.saveClub(this.form.value);
    this.snackBar.open('已保存读书会档案', 'OK', { duration: 2000 });
  }
}
