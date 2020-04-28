import { Component, AfterViewInit } from '@angular/core';
import { NavParams, ModalController, Config } from '@ionic/angular';
import firebase from 'firebase/app';
import { cfaSignIn, cfaSignInPhoneOnCodeSent } from 'capacitor-firebase-auth';

import { AuthService } from 'src/auth/shared/services/auth/auth.service';
import { Router } from '@angular/router';
import { stringify } from 'querystring';

@Component({
    selector: 'app-mfa-verify',
    templateUrl: 'mfa-verify.component.html',
    styleUrls: ['./mfa-verify.component.scss']
})
export class MfaVerifyComponent implements AfterViewInit {
    recaptchaVerifier: any;
    appVerifier: any;
    verified: boolean = false;
    codeNumber: string = '000000';
    userPhone: string = '';
    phoneMask: string = '(000) 000-0000';
    resolver: any;
    email: string;
    password: string;
    code: string = "";
    error: boolean = false;
    verificationId: string = '';
    ios: boolean;
    authError: any;
    constructor(
        public navParams: NavParams,
        public modalController: ModalController,
        private authService: AuthService,
        private router: Router,
        private config: Config
    ) { }

    ngAfterViewInit() {
        this.ios = this.config.get('mode') === 'ios';

        if (!this.ios) {
            this.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-button', {
                'size': 'invisible',
                'callback': (response) => {
                    if (response) {
                        this.verified = true;
                        this.checkCode(null);
                    }
                }
            });
        } else {
            ///
        }

    }

    ionViewWillEnter() {
        this.userPhone = this.navParams.get('userPhone');
        this.email = this.navParams.get('email');
        this.password = this.navParams.get('password');
        this.resolver = this.navParams.get('resolver');
        var phoneInfoOptions = {
            multiFactorHint: this.resolver.hints[0],
            session: this.resolver.session
        };

        var iosPhoneInfoOptions = {
            phone: this.email + ' ' + this.password,
        };

        if (!this.ios) {
            var phoneAuthProvider = new firebase.auth.PhoneAuthProvider();

            return phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, this.recaptchaVerifier)
                .then(async (verificationId) => {
                    // Ask user for the SMS verification code.
                    this.verificationId = verificationId;
                })
            // The user is a multi-factor user. Second factor challenge is required.
            //resolver = error.resolver;   
        } else {
            try {
                cfaSignInPhoneOnCodeSent().subscribe(
                    (verificationId) => {
                        this.verificationId = verificationId;
                        console.log('Got verificationId', verificationId)
                    },
                    (error) => {
                        console.log(error);
                    },
                    () => {console.log("Code verify complete was called")}
                )
                cfaSignIn('phone', iosPhoneInfoOptions).subscribe(
                    (user) => console.log('Sent a verification to ', user),
                    (error) => {
                        console.log(error);
                    },
                    () => {console.log("Send SMS code complete was called")}
                )
                ///var phoneAuthProvider =      
            } catch (err) {
                console.log(err.message);
            }
        }

    }

    async checkCode(ev) {
        if (ev) {
            this.code = ev.detail.value;
        } else {
            this.code = this.code || '';
        }
        if (this.code.length === 6 && this.verified || this.code.length === 6 && this.ios) {
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
        } else if (this.code.length === 6 && !this.verified && !this.ios) {
            console.log("Verify you are not a robot!")
        } else if (this.code.length !== 6) {
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