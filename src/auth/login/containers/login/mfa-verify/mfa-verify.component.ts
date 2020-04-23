import { Component, AfterViewInit } from '@angular/core';
import { NavParams, ModalController, Config } from '@ionic/angular';
import * as firebase from 'firebase/app';

import { AuthService } from 'src/auth/shared/services/auth/auth.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-mfa-verify',
    templateUrl: 'mfa-verify.component.html',
    styleUrls: ['./mfa-verify.component.scss']
})
export class MfaVerifyComponent implements AfterViewInit {
    recaptchaVerifier: any;
    appVerifier: any;
    verified: boolean = false;
    userPhone: string = '';
    resolver: any;
    password: string = '';
    code: string = "";
    error: boolean = false;
    verificationId: string = '';
    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private authService: AuthService,
        private router: Router,
    ) { }

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

    ionViewWillEnter() {
        this.userPhone = this.navParams.get('userPhone');
        this.resolver = this.navParams.get('resolver');
        console.log(this.resolver);
        var phoneInfoOptions = {
            multiFactorHint: this.resolver.hints[0],
            session: this.resolver.session
        };

        var phoneAuthProvider = new firebase.auth.PhoneAuthProvider();

        return phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, this.recaptchaVerifier)
            .then(async (verificationId) => {
                // Ask user for the SMS verification code.
                this.verificationId = verificationId;
            })
        // The user is a multi-factor user. Second factor challenge is required.
        //resolver = error.resolver;

    }

    async checkCode() {
        if (this.code.length === 6 && this.verified) {

            console.log(this.code);
            try {
                var cred = firebase.auth.PhoneAuthProvider.credential(
                    this.verificationId, this.code);
                var multiFactorAssertion =
                    firebase.auth.PhoneMultiFactorGenerator.assertion(cred);
                // Complete sign-in.
                await this.resolver.resolveSignIn(multiFactorAssertion);
                this.authService.auth$.subscribe();
                await this.loginSuccess();
                return this.router.navigate(['/']);
            } catch (err) {
                this.error = err.message;
                this.loginFailure();
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

    loginFailure() {
        return this.modalController.dismiss({
            response: this.error
        })
    }

    get uid() {
        return this.authService.user.uid;
    }

    loginSuccess() {
        return this.modalController.dismiss({
            response: 'success'
        });
    }

}