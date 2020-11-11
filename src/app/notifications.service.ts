import { Injectable } from '@angular/core';

import firebase from '@firebase/app';
import '@firebase/messaging';
import { environment } from '../environments/environment';
import { AngularFirestore } from '@angular/fire/firestore';
import { Profile, ProfileService } from 'src/auth/shared/services/profile/profile.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {

  constructor(
    private afs: AngularFirestore,
    private profileService: ProfileService
  ) { }

  get currentProfile() {
    return this.profileService.currentProfile;
  }

  init(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      navigator.serviceWorker.ready.then((registration) => {
        // Don't crash an error if messaging not supported
        if (!firebase.messaging.isSupported()) {
          resolve();
          return;
        }

        const messaging = firebase.messaging();

        // Register the Service Worker
        messaging.useServiceWorker(registration);

        // Initialize your VAPI key
        messaging.usePublicVapidKey(
          environment.firebaseVapidKey
        );

        // Optional and not covered in the article
        // Listen to messages when your app is in the foreground
        messaging.onMessage((payload) => {
          console.log(payload);
        });
        // Optional and not covered in the article
        // Handle token refresh
        messaging.onTokenRefresh(() => {
          messaging.getToken().then(
            (refreshedToken: string) => {
              this.saveToken(this.currentProfile, refreshedToken);
              console.log(refreshedToken);
            }).catch((err) => {
              console.error(err);
            });
        });

        resolve();
      }, (err) => {
        reject(err);
      });
    });
  }

  requestPermission(): Promise<void> {
    return new Promise<void>(async (resolve) => {
      if (!Notification) {
        resolve();
        return;
      }
      if (!firebase.messaging.isSupported()) {
        resolve();
        return;
      }
      try {
        const messaging = firebase.messaging();
        await messaging.requestPermission();

        const token: string = await messaging.getToken();
        this.saveToken(this.currentProfile, token);

        console.log('User notifications token:', token);
      } catch (err) {
        // No notifications granted
      }

      resolve();
    });
  }

  // save the permission token in firestore
  saveToken(user: Profile, token: string): void {

    const currentTokens = user.fcmTokens || {}
    console.log(currentTokens, token)

    // If token does not exist in firestore, update db
    if (!currentTokens[token]) {
      console.log('Adding new token: ', token)
      const userRef = this.afs.collection('users').doc(user.uid)
      const tokens = { ...currentTokens, [token]: true }
      userRef.update({ fcmTokens: tokens })
    }
  }
}
