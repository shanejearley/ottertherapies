// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import { FirebaseAppConfig } from '@angular/fire';

export const environment = {
  production: false,
  firebase: {
    vapidKey: 'BB2ZXCxS0HG04yDXoBoXMIAJv9gW4fisgIK3NVYpNJfDuJdkDPLoGBtrSq0Gg_11gaPmwd6tsKvWTzCSxQxKGZc'
  },
  firebaseConfig: {
    apiKey: "AIzaSyDf-uqPDM4tCCS707r-eeGlif49JmKbfYY",
    authDomain: "ottertherapies.firebaseapp.com",
    databaseURL: "https://ottertherapies.firebaseio.com",
    projectId: "ottertherapies",
    storageBucket: "ottertherapies.appspot.com",
    messagingSenderId: "842164942057",
    appId: "1:842164942057:web:959f9a4ba101fdd6d3ec78"
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
