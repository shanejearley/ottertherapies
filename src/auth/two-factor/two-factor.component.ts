import { Component, OnInit, AfterViewInit, Output, EventEmitter } from '@angular/core';

import { AuthService } from '../shared/services/auth/auth.service';
import { Config, ModalController } from '@ionic/angular';
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
    error: boolean = false;
    data: any;
    constructor(
        private authService: AuthService,
        private config: Config,
        private modalController: ModalController,
    ) { }

    ngOnInit() {
    }

    ngAfterViewInit() {

    }

    async verifyDeviceModal() {
        const modal = await this.modalController.create({
            component: MfaAddComponent,
            componentProps: {
                'userPhone': this.userPhone
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

    async requestSendCode() {
        console.log('hey', this.password, this.userPhone, this.authService.user);
        await this.authService.loginUser(this.authService.user.email, this.password);
        this.request = true;
        this.verifyDeviceModal();
    }

}