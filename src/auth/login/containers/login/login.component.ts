import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';

import * as firebase from 'firebase/app';

import { AuthService } from '../../../shared/services/auth/auth.service';
import { MfaVerifyComponent } from './mfa-verify/mfa-verify.component';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'login',
  template: `
    <div>
      <auth-form (submitted)="loginUser($event)">
        <h1>Login</h1>
        <a routerDirection="root" routerLink="/auth/register">Not registered?</a>
        <ion-button type="submit" expand="block">
          Login
        </ion-button>
        <div class="error" *ngIf="error">
          {{ error }}
        </div>
      </auth-form>
    </div>
  `
})
export class LoginComponent {
  resolver: any;
  error: string;
  data: any;

  constructor(
    private authService: AuthService,
    private router: Router,
    private modalController: ModalController
  ) {}
  
  async loginUser(event: FormGroup) {
    const { email, password } = event.value;
    try {
      await this.authService.loginUser(email, password);
      this.router.navigate(['/']);
    } catch (err) {
      if (err.code == 'auth/multi-factor-auth-required') {
        this.resolver = err.resolver;
        this.verifyDeviceModal();
      } else {
        this.error = err.message;
        // Handle other errors such as wrong password.
      }
    }
  }

  async verifyDeviceModal() {
    const modal = await this.modalController.create({
      component: MfaVerifyComponent,
      componentProps: {
        'userPhone': this.resolver.hints[0].phoneNumber,
        'resolver': this.resolver
      }
    });
    modal.onWillDismiss().then((data) => {
      this.data = data.data;
      if (this.data.response !== 'dismissed' && this.data.response !== 'success') {
        this.error = this.data.response;
      }
      console.log('dismissed');
    });
    await modal.present();
  }
}