import { Component, OnInit, AfterViewInit, Output, EventEmitter } from '@angular/core';

import { AuthService } from '../shared/services/auth/auth.service';
import { Config, ModalController, IonRouterOutlet, IonInput } from '@ionic/angular';
import { MfaAddComponent } from './mfa-add/mfa-add.component';

@Component({
    selector: 'app-two-factor',
    styleUrls: ['two-factor.component.scss'],
    templateUrl: 'two-factor.component.html'
})
export class TwoFactorComponent implements OnInit, AfterViewInit {
    recaptchaVerifier: any;
    appVerifier: any;
    request: boolean = false;
    userPhone: string = '';
    password: string = '';
    error: string;
    data: any;
    phoneMask: string = '(000) 000-0000';
    constructor(
        private authService: AuthService,
        private config: Config,
        private modalController: ModalController,
        private routerOutlet: IonRouterOutlet
    ) { }

    ngOnInit() {
    }

    ngAfterViewInit() {

    }

    async verifyDeviceModal() {
        const modal = await this.modalController.create({
            component: MfaAddComponent,
            componentProps: {
                'userPhone': this.userPhone,
                'email': this.authService.user.email,
                'password': this.password
            },
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

    async requestSendCode() {
        if (this.userPhone.length !== 12) {
            this.error = 'Please enter a valid phone number.';
        } else if (!this.password.length) {
            this.error = 'Please enter your password.';
        } else {
            try {
                await this.authService.loginUser(this.authService.user.email, this.password);
                this.error = '';
                this.request = true;
                this.verifyDeviceModal();
            } catch (err) {
                if (err) {
                    this.error = err.message;
                }
            }
        }
    }

    async onLogout() {
        await this.authService.logoutUser();
    }

    async updatePhone(ev) {
        return this.userPhone = ev.detail.value.replace(/[- )(]/g, '');
    }

}