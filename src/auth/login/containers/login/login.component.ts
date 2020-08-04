import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';

import { IonRouterOutlet, ModalController } from '@ionic/angular';

import { AuthService } from '../../../shared/services/auth/auth.service';
import { MfaVerifyComponent } from './mfa-verify/mfa-verify.component';

@Component({
  selector: 'login',
  templateUrl: 'login.component.html'
})
export class LoginComponent {
  resolver: any;
  error: string;
  data: any;
  email: string;
  password: string;

  constructor(
    private authService: AuthService,
    private router: Router,
    private modalController: ModalController,
    private routerOutlet: IonRouterOutlet
  ) { }

  async loginUser(event: FormGroup) {
    const { email, password } = event.value;
    this.email = email;
    this.password = password;
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

  resetPassword() {
    console.log('resetting');
    this.router.navigate(['/auth/reset']);
  }

  async verifyDeviceModal() {
    const modal = await this.modalController.create({
      component: MfaVerifyComponent,
      componentProps: {
        'userPhone': this.resolver.hints[0].phoneNumber,
        'resolver': this.resolver,
        'email': this.email,
        'password': this.password
      },
      cssClass: 'theme-modal',
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
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