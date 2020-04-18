import { Component } from '@angular/core';
import { AuthService } from '../shared/services/auth/auth.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-verify',
    styleUrls: ['verify.component.scss'],
    templateUrl: 'verify.component.html'
})
export class VerifyComponent {
    error: boolean = false;
    verified: boolean = false;
    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    async continue() {
        try {
            await this.authService.reloadUser();
            if (this.authService.user.emailVerified) {
                console.log('verified');
                this.router.navigate(['/'])
            } else {
                console.log('not verified yet');
                this.error = true;
            }
        } catch (err) {
            this.error = true;
        }
    }

    resendVerification() {
        return this.authService.resendVerification();
    }
}

// ctrl.checkVerification = function () {
//     firebase.auth().currentUser.reload().then(function () {
//         if (firebase.auth().currentUser.emailVerified) {
//             ctrl.db.collection("users").doc(firebase.auth().currentUser.uid).set({
//                 emailVerified: true
//             }, { merge: true }).then(function () {
//                 console.log('All set now...');
//                 $state.go('selectTeam', { teamId: 1234 });
//             })
//         }
//         else {
//             console.log('Try again');
//             ctrl.tryAgain = true;
//         }
//     })
// }

// ctrl.sendVerification = function () {
//     ctrl.resendUser = ctrl.Auth.$getAuth();
//     if (ctrl.resendUser) {
//         ctrl.resendUser.sendEmailVerification().then(function () {
//             console.log('Email sent to', ctrl.resendUser.email)
//             // Email sent.
//         }).catch(function (error) {
//             console.log('Did not work...', error)
//             // An error happened.
//         });
//     }
// }

// user.sendEmailVerification().then(function () {
//     ctrl.newUserRef = ctrl.db.collection("users").doc(user.uid);
//     var unsubscribe = ctrl.newUserRef.onSnapshot(function (doc) {
//         console.log("snap");
//         if (doc.exists) {
//             ctrl.newUserRef.set({
//                 displayName: ctrl.user.displayName,
//                 role: ctrl.user.role
//             }, { merge: true })
//                 .then(function () {
//                     unsubscribe();
//                     $state.go('verify');
//                 })
//         }
//     })
// }).catch(function (error) {
//     ctrl.error = error;
// });