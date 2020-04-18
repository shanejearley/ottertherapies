import { Component, OnInit, AfterViewInit, Output, EventEmitter } from '@angular/core';

import * as firebase from 'firebase/app';
import { AuthService } from '../shared/services/auth/auth.service';
import { Config, AlertController, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
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
    ios: boolean;
    data: any;
    constructor(
        private authService: AuthService,
        private config: Config,
        private modalController: ModalController,
        private router: Router
    ) { }

    ngOnInit() {
        this.ios = this.config.get('mode') === 'ios';
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