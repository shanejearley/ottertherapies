import { Component, AfterViewInit } from '@angular/core';
import { NavParams, ModalController } from '@ionic/angular';
import * as firebase from 'firebase/app';

import { AuthService } from 'src/auth/shared/services/auth/auth.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-mfa-add',
    templateUrl: 'mfa-add.component.html',
    styleUrls: ['./mfa-add.component.scss']
})
export class MfaAddComponent implements AfterViewInit {
    recaptchaVerifier: any;
    appVerifier: any;
    verified: boolean = false;
    userPhone: string = '';
    resolver: any;
    password: string = '';
    code: string = "";
    error: boolean = false;
    ios: boolean;
    verificationId: string = '';
    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private authService: AuthService,
        private router: Router
    ) { }

    get user () {
        return this.authService.user;
    }

    ngAfterViewInit() {
        this.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-button', {
            'size': 'invisible',
            'callback': (response) => {
                if (response) {
                    this.verified = true;
                    this.checkCode();
                }
            }
        });
    }

    async ionViewWillEnter() {
        this.userPhone = this.navParams.get('userPhone');

        var phoneInfoOptions = {
            phoneNumber: this.userPhone,
            session: null
        };

        await this.user.multiFactor.getSession().then((multiFactorSession) => {
            phoneInfoOptions.session = multiFactorSession;
            var phoneAuthProvider = new firebase.auth.PhoneAuthProvider();
            return phoneAuthProvider.verifyPhoneNumber(
                phoneInfoOptions, this.recaptchaVerifier)
                .then(async (verificationId) => {
                    this.verificationId = verificationId;
                });
        })

    }

    async checkCode() {
        if (this.code.length === 6 && this.verified) {
            try {
                const mfaDisplayName = "2FA Mobile Device 1"
                var cred = firebase.auth.PhoneAuthProvider.credential(
                    this.verificationId, this.code);
                var multiFactorAssertion =
                    firebase.auth.PhoneMultiFactorGenerator.assertion(cred);
                await this.user.multiFactor.enroll(multiFactorAssertion, mfaDisplayName);
                this.authService.auth$.subscribe();
                await this.addSuccess();
                return this.router.navigate(['/Teams/:id/Profile']);
            } catch (err) {
                this.error = err.message;
                this.addFailure();
            }
        } else if (this.code.length === 6 && !this.verified) {
            console.log("Verify you are not a robot!")
        } else if (this.code.length !== 6 && this.verified) {
            console.log("Enter your code!");
        } else {
            console.log("Verify you are not a robot and enter your code!");
        }
    }

    dismiss() {
        this.modalController.dismiss({
            response: 'dismissed'
        });
    }

    addFailure() {
        return this.modalController.dismiss({
            response: this.error
        })
    }

    get uid() {
        return this.authService.user.uid;
    }

    addSuccess() {
        return this.modalController.dismiss({
            response: 'success'
        });
    }

}