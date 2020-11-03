importScripts('https://www.gstatic.com/firebasejs/5.7.3/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/5.7.3/firebase-messaging.js');

import { environment } from 'src/environments/environment';

firebase.initializeApp({
    messagingSenderId: environment.firebaseConfig.messagingSenderId
});

const messaging = firebase.messaging();