import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import * as cheerio from 'cheerio';
import * as getUrls from 'get-urls';
import fetch from 'node-fetch';

const { Storage } = require('@google-cloud/storage');
const gcs = new Storage();
import * as fs from 'fs-extra';
const { tmpdir } = require('os');
const { join, dirname } = require('path');
import * as sharp from 'sharp';

admin.initializeApp();

const { google } = require('googleapis');

// eslint-disable-next-line import/no-unresolved
import { Event, EventMember, Tokens, UserTeam } from './types';

const firestore = admin.firestore();
const storage = admin.storage();
const FieldValue = admin.firestore.FieldValue;

const oauth2Client = new google.auth.OAuth2(
    `${functions.config().googleapis.client_id}`,
    `${functions.config().googleapis.client_secret}`,
    `${functions.config().googleapis.redirect_uri}`
);

const addEvent = async (uid: string, event: Event) => {

    const tokens: Tokens = (await admin.firestore().doc(`tokens/${uid}`).get()).data() as Tokens;
    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({
        version: 'v3',
        auth: oauth2Client
    });

    const selectDays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const weekday = selectDays[event.startTime.toDate().getDay()];
    const weekNumber = event.recurrence === 'monthly-last' ? -1 : Math.ceil(event.startTime.toDate().getDate() / 7);

    console.log(event.recurrence);

    const frequency = event.recurrence === 'daily' ? 'RRULE:FREQ=DAILY;' : event.recurrence === 'weekly' ? `RRULE:FREQ=WEEKLY;BYDAY=${weekday};` : event.recurrence === 'monthly' ? `RRULE:FREQ=MONTHLY;BYDAY=${weekNumber + weekday};` : event.recurrence === 'monthly-last' ? `RRULE:FREQ=MONTHLY;BYDAY=${weekNumber + weekday};` : event.recurrence === 'annually' ? 'RRULE:FREQ=YEARLY;' : event.recurrence === 'weekdays' ? 'RRULE:FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR;' : null;

    console.log([frequency]);

    const otterMessage = '***Modify this event and manage guests in the Otter app!';

    const modifiedId = event.id.replace(/[^a-v0-9\s]/ig, '').toLowerCase();
    console.log(modifiedId);

    console.log(event.startTime.toDate());

    try {
        const newEvent = await calendar.events.insert({
            calendarId: 'primary',
            resource: {
                summary: event.name,
                location: event.location,
                description: event.info ? event.info + '\n\n' + otterMessage.bold().italics() : otterMessage.bold().italics(),
                start: {
                    dateTime: event.startTime.toDate(),
                    timeZone: 'Zulu'
                },
                end: {
                    dateTime: event.endTime.toDate(),
                    timeZone: 'Zulu'
                },
                recurrence: [frequency],
                reminders: {
                    useDefault: true
                },
                organizer: {
                    displayName: 'Otter Therapies'
                },
                id: modifiedId,
                visbility: 'default',
                status: 'confirmed'
            }
        });
        console.log('New event', newEvent.data.id, newEvent.data.summary);
        return newEvent;
    } catch (err) {
        console.log(err.message);
        return false;
    }

};

const modifyEvent = async (uid: string, event: Event) => {

    const tokens: Tokens = (await admin.firestore().doc(`tokens/${uid}`).get()).data() as Tokens;
    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({
        version: 'v3',
        auth: oauth2Client
    });

    const selectDays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const weekday = selectDays[event.startTime.toDate().getDay()];
    const weekNumber = event.recurrence === 'monthly-last' ? -1 : Math.ceil(event.startTime.toDate().getDate() / 7);

    console.log(event.recurrence);

    const frequency = event.recurrence === 'daily' ? 'RRULE:FREQ=DAILY;' : event.recurrence === 'weekly' ? `RRULE:FREQ=WEEKLY;BYDAY=${weekday};` : event.recurrence === 'monthly' ? `RRULE:FREQ=MONTHLY;BYDAY=${weekNumber + weekday};` : event.recurrence === 'monthly-last' ? `RRULE:FREQ=MONTHLY;BYDAY=${weekNumber + weekday};` : event.recurrence === 'annually' ? 'RRULE:FREQ=YEARLY;' : event.recurrence === 'weekdays' ? 'RRULE:FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR;' : null;

    console.log([frequency]);

    const otterMessage = '***Modify this event and manage guests in the Otter app!';

    const modifiedId = event.id.replace(/[^a-v0-9\s]/ig, '').toLowerCase();
    console.log(modifiedId);

    try {
        const getEvent = await calendar.events.get({
            calendarId: 'primary',
            eventId: modifiedId
        });

        if (!getEvent.data.id) {
            console.log('Event does not exist!');
            return addEvent(uid, event);
        }

        console.log('Event exists!', getEvent.data.id, getEvent.data.summary);

        const modifiedEvent = await calendar.events.patch({
            calendarId: 'primary',
            eventId: modifiedId,
            resource: {
                summary: event.name,
                location: event.location,
                description: event.info ? event.info + '\n\n' + otterMessage.bold().italics() : otterMessage.bold().italics(),
                start: {
                    dateTime: event.startTime.toDate(),
                    timeZone: 'Zulu'
                },
                end: {
                    dateTime: event.endTime.toDate(),
                    timeZone: 'Zulu'
                },
                recurrence: [frequency],
                reminders: {
                    useDefault: true
                },
                organizer: {
                    displayName: 'Otter Therapies'
                },
                id: modifiedId,
                visbility: 'default',
                status: 'confirmed'
            }
        });
        console.log('Modified event', modifiedEvent.data.id, modifiedEvent.data.summary);
        return modifiedEvent;
    } catch (err) {
        console.log(err.message);
        return false;
    }
};

const removeEvent = async (uid: string, event: Event) => {

    const tokens: Tokens = (await admin.firestore().doc(`tokens/${uid}`).get()).data() as Tokens;
    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({
        version: 'v3',
        auth: oauth2Client
    });

    const modifiedId = event.id.replace(/[^a-v0-9\s]/ig, '').toLowerCase();
    console.log(modifiedId);

    try {
        return calendar.events.delete({
            calendarId: 'primary',
            eventId: modifiedId
        });
    } catch (err) {
        console.log(err.message);
        return false;
    }

};

export const resizeAvatar = functions.storage
    .object()
    .onFinalize(async object => {
        try {
            const bucket = gcs.bucket(object.bucket);
            const filePath = object.name;

            const fileName = filePath?.split('/').pop();
            const collectionName = filePath?.split('/')[0];
            const documentId = filePath?.split('/')[1];
            const folderName = filePath?.split('/')[2];

            const avatarFileName = 'avatar_' + fileName;

            const workingDir = join(tmpdir(), `${collectionName}/${documentId}/profile/`);
            const tmpFilePath = join(workingDir, fileName);
            const tmpAvatarPath = join(workingDir, avatarFileName);

            await fs.ensureDir(workingDir);

            if (folderName !== 'profile') {
                console.log('Not an image to resize, exiting function');
                return false;
            }

            if (fileName?.includes('avatar_')) {
                console.log('posting url and exiting function');
                const avatarFile = bucket.file(filePath);
                const config = {
                    action: 'read',
                    expires: '01-01-2500'
                };
                const urlArray = await avatarFile.getSignedUrl(config);
                const url = urlArray[0];
                await admin.firestore().doc(`${collectionName}/${documentId}`).set({ url_150_temp: url }, { merge: true });
                return false;
            }

            console.log('downloading tmp file');

            await bucket.file(filePath).download({
                destination: tmpFilePath
            });

            console.log('resizing tmp file');

            await sharp(tmpFilePath)
                .resize(150, 150)
                .toFile(tmpAvatarPath);

            console.log('uploading resized tmp file');

            return bucket.upload(tmpAvatarPath, {
                destination: join(dirname(filePath), avatarFileName)
            });

        } catch (err) {
            console.log(err.message);
            return false;
        }

    });

export const getAuthURL = functions.https.onCall(async (data, context) => {
    const text = data.text;
    if (!(typeof text === 'string') || text.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with ' +
            'one arguments "text" containing the message text to add.');
    }
    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }

    console.log(data);
    console.log(context);

    const scopes = [
        'profile',
        'email',
        'https://www.googleapis.com/auth/calendar'
    ];

    try {

        const url = await oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes
        });

        console.log(url);

        return { url };

    } catch (err) {

        console.log(err.message);

        throw new functions.https.HttpsError('cancelled', 'The function must return a valid url');

    }

});

export const createAndSaveTokens = functions.https.onCall(async (data, context) => {
    const code = data.code;
    if (!(typeof code === 'string') || code.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with ' +
            'one arguments "code" containing the code to add.');
    }

    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    console.log(context.auth);
    console.log(data);
    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log('tokens', tokens);
        const { refresh_token } = tokens;

        await admin.firestore().doc(`tokens/${context.auth.uid}`).set({ refresh_token });
        await admin.firestore().doc(`users/${context.auth.uid}`).set({ refresh_token: true }, { merge: true });
        return { response: 'success' };
    } catch (err) {
        console.log(err.message);
        return { response: 'fail' };
    }
});

const scrapeMetatags = (text: string) => {

    const urls = Array.from(getUrls(text));

    const requests = urls.map(async url => {

        const res = await fetch(url);

        const html = await res.text();
        const $ = cheerio.load(html);

        const getMetatag = (name: string) =>
            $(`meta[name=${name}]`).attr('content') ||
            $(`meta[name='og:${name}']`).attr('content') ||
            $(`meta[name='twitter:${name}']`).attr('content');

        return {
            url,
            title: $('title').first().text(),
            favicon: $('link[rel~="icon"]').attr('href') && !$('link[rel~="icon"]').attr('href')?.startsWith('https://') ? url + $('link[rel~="icon"]').attr('href') : $('link[rel~="icon"]').attr('href'),
            description: getMetatag('description'),
            image: getMetatag('image'),
            author: getMetatag('author'),
        };
    });

    return Promise.all(requests);

};

export const scraper = functions.https.onCall(async (data, context) => {
    const text = data.text;
    if (!(typeof text === 'string') || text.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with ' +
            'one arguments "text" containing the message text to add.');
    }
    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    const result = await scrapeMetatags(text);

    return { result };
});

const addTeamClaims = async (uid: string, teamId: string) => {
    try {
        const userRecord = await admin.auth().getUser(uid);
        const customClaims = userRecord.customClaims || {};
        await admin.auth().setCustomUserClaims(uid, { ...customClaims, [teamId]: true });
        const newUserRecord = await admin.auth().getUser(uid);
        return console.log(newUserRecord.customClaims);
    } catch (err) {
        console.log(err.message);
        return false;
    }
};

const removeTeamClaims = async (uid: string, teamId: string) => {
    try {
        const userRecord = await admin.auth().getUser(uid);
        const customClaims = userRecord.customClaims || {};
        await admin.auth().setCustomUserClaims(uid, { ...customClaims, [teamId]: false });
        const newUserRecord = await admin.auth().getUser(uid);
        return console.log(newUserRecord.customClaims);
    } catch (err) {
        console.log(err.message);
        return false;
    }
};

const addGroupClaims = async (uid: string, groupId: string) => {
    try {
        const userRecord = await admin.auth().getUser(uid);
        const customClaims = userRecord.customClaims || {};
        await admin.auth().setCustomUserClaims(uid, { ...customClaims, [groupId]: true });
        const newUserRecord = await admin.auth().getUser(uid);
        return console.log(newUserRecord.customClaims);
    } catch (err) {
        console.log(err.message);
        return false;
    }
};

const removeGroupClaims = async (uid: string, groupId: string) => {
    try {
        const userRecord = await admin.auth().getUser(uid);
        const customClaims = userRecord.customClaims || {};
        await admin.auth().setCustomUserClaims(uid, { ...customClaims, [groupId]: false });
        const newUserRecord = await admin.auth().getUser(uid);
        return console.log(newUserRecord.customClaims);
    } catch (err) {
        console.log(err.message);
        return false;
    }
};

const notifyAdmin = async (context: string) => {
    try {
        const adminUid = 'NWdIuC9hlvSFSzr9MmA9bQsqX8O2';
        const adminRef = firestore
            .collection('users')
            .doc(adminUid);
        const snapshot = await adminRef.get();
        const user = snapshot.data();

        const payload = {
            notification: {
                title: `New ${context}!`,
                body: `Someone has created a new ${context}`,
            }
        };

        const tokens = user?.fcmTokens ? Object.keys(user.fcmTokens) : [];
        if (!tokens.length) {
            throw new Error('User does not have any tokens!');
        }
        console.log('Sending to tokens: ', tokens);
        return admin.messaging().sendToDevice(tokens, payload);
    }
    catch (err) {
        return console.log(err);
    }

};

const notifyUser = async (uid: string, context: string) => {

    try {
        const userId = uid;
        const userRef = firestore
            .collection('users')
            .doc(userId);
        const snapshot = await userRef.get();
        const user = snapshot.data();

        const payload = {
            notification: {
                title: `New ${context}!`,
                body: `A team member sent you a new ${context}`,
            }
        };

        const tokens = user?.fcmTokens ? Object.keys(user.fcmTokens) : [];
        if (!tokens.length) {
            throw new Error('User does not have any tokens!');
        }
        console.log('Sending to tokens: ', tokens);
        return admin.messaging().sendToDevice(tokens, payload);
    }
    catch (err) {
        return console.log(err);
    }
};

export const authOnCreate = functions.auth.user().onCreate(async (user) => {
    const uid = user.uid;
    const email = user.email;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    notifyAdmin('user');
    console.log('Creating document for user', user.uid, 'with email', email);
    await firestore
        .collection('users')
        .doc(user.uid)
        .set({
            uid: user.uid,
            email,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    const teamsSnap = await firestore
        .collection('teams')
        .get();
    if (!teamsSnap.empty) {
        return teamsSnap.forEach(async (doc) => {
            const teamId = doc.id;
            console.log('Checking in ', teamId);
            const userTeamsSnap = await firestore
                .collection('teams')
                .doc(teamId)
                .collection('pendingMembers')
                .where('email', '==', email)
                .get();
            if (!userTeamsSnap.empty) {
                return userTeamsSnap.forEach(async (userTeamDoc) => {
                    console.log('Found member in pending for ', teamId);
                    const pendingDocId = userTeamDoc.id;
                    const adminSnap = await firestore
                        .collection('teams')
                        .doc(teamId)
                        .collection('members')
                        .where('status', '==', 'Admin')
                        .get();
                    if (!adminSnap.empty) {
                        await adminSnap.forEach(async adminDoc => {
                            const adminUid = adminDoc.data().uid;
                            console.log('Adding a ', adminUid, ' instance to ', uid);
                            await firestore
                                .collection('users')
                                .doc(uid)
                                .collection('teammates')
                                .doc(adminUid)
                                .set({ teams: FieldValue.increment(1) }, { merge: true });
                            console.log('Adding a ', uid, ' instance to ', adminUid);
                            await firestore
                                .collection('users')
                                .doc(adminUid)
                                .collection('teammates')
                                .doc(uid)
                                .set({ teams: FieldValue.increment(1) }, { merge: true });
                        });
                    } else {
                        await console.log('No admin');
                    }
                    await firestore
                        .collection('teams')
                        .doc(teamId)
                        .collection('pendingMembers')
                        .doc(uid)
                        .set({
                            uid,
                            email,
                            status: 'Pending'
                        }, { merge: true });
                    await firestore
                        .collection('users')
                        .doc(uid)
                        .collection('pendingTeams')
                        .doc(teamId)
                        .set({
                            id: teamId
                        }, { merge: true });
                    return firestore
                        .collection('teams')
                        .doc(teamId)
                        .collection('pendingMembers')
                        .doc(pendingDocId)
                        .delete();
                });
            } else {
                return console.log('Member does not exist on this team');
            }
        });
    } else {
        return console.log('No teams exist');
    }
});

export const authOnDelete = functions.auth.user().onDelete(async (user) => {
    try {
        const bucket = storage.bucket();
        await bucket.deleteFiles({ prefix: `users/${user.uid}/profile/` });
        console.log(`All the Firebase Storage files in users/${user.uid}/profile have been deleted`);
        const querySnapshot = await firestore
            .collection('users')
            .doc(user.uid)
            .collection('teams')
            .get();
        await firestore
            .collection('users')
            .doc(user.uid)
            .delete();
        const teams = querySnapshot.docs.map(doc => doc.data());
        console.log('Deleting user document for ', user.uid);
        return teams.forEach(async t => {
            await firestore
                .collection('teams')
                .doc(t.id)
                .collection('members')
                .doc(user.uid)
                .delete();
            await bucket.deleteFiles({ prefix: `users/${user.uid}/teams/${t.id}/files/` });
            return console.log(`All the Firebase Storage files in users/${user.uid}/teams/${t.id}/files/ have been deleted`);
        });
    } catch (err) {
        return console.log(err.message);
    }
});

export const groupOnRemove = functions.firestore
    .document('teams/{teamId}/groups/{groupId}')
    .onDelete(async (snapshot, context) => {

        console.log('snapshot', snapshot);
        console.log('context', context);

        console.log('teamId', context.params.teamId);
        const teamId = context.params.teamId;
        console.log('groupId', context.params.groupId);
        const groupId = context.params.groupId;

        const bucket = storage.bucket();

        await bucket.deleteFiles({ prefix: `teams/${teamId}/groups/${groupId}/files/` });

        const filesSnapshot = await firestore
            .collection('teams')
            .doc(teamId)
            .collection('groups')
            .doc(groupId)
            .collection('files')
            .get();
        const files = filesSnapshot.docs.map(doc => doc.id);
        await files.forEach(async fileId => {
            return firestore
                .collection('teams')
                .doc(teamId)
                .collection('groups')
                .doc(groupId)
                .collection('files')
                .doc(fileId)
                .delete();
        });

        const messagesSnapshot = await firestore
            .collection('teams')
            .doc(teamId)
            .collection('groups')
            .doc(groupId)
            .collection('messages')
            .get();
        const messages = messagesSnapshot.docs.map(doc => doc.id);
        await messages.forEach(async messageId => {
            return firestore
                .collection('teams')
                .doc(teamId)
                .collection('groups')
                .doc(groupId)
                .collection('messages')
                .doc(messageId)
                .delete();
        });

        const membersSnapshot = await firestore
            .collection('teams')
            .doc(teamId)
            .collection('groups')
            .doc(groupId)
            .collection('members')
            .get();
        const members = membersSnapshot.docs.map(doc => doc.data());
        return members.forEach(async member => {
            await removeGroupClaims(member.uid, groupId);
            await firestore
                .collection('users')
                .doc(member.uid)
                .collection('teams')
                .doc(teamId)
                .collection('groups')
                .doc(groupId)
                .delete();
            await firestore
                .collection('users')
                .doc(member.uid)
                .collection('teams')
                .doc(teamId)
                .collection('unread')
                .doc(groupId)
                .delete();
            return firestore
                .collection('teams')
                .doc(teamId)
                .collection('groups')
                .doc(groupId)
                .collection('members')
                .doc(member.uid)
                .delete();
        });
    });

export const eventOnCreate = functions.firestore
    .document('teams/{teamId}/calendar/{eventId}')
    .onCreate(async (snap, context) => {

        console.log('snap', snap);
        console.log('context', context);
        const teamId = context.params.teamId;
        const eventId = context.params.eventId;
        const event: Event = snap.data() as Event;
        const membersSnapshot = await firestore
            .collection('teams')
            .doc(teamId)
            .collection('calendar')
            .doc(eventId)
            .collection('members')
            .get();
        const members: EventMember[] = membersSnapshot.docs.map(doc => doc.data()) as EventMember[];

        async function processMembers(memberList: EventMember[]) {
            const promises = memberList.map(async m => {
                const profileDoc = await firestore
                    .collection('users')
                    .doc(m.uid)
                    .get();
                const profile = profileDoc.data();
                if (profile?.gcalSync) {
                    console.log('Adding event for member');
                    await addEvent(profile.uid, event);
                } else {
                    console.log('member is not syncing events');
                }
            });
            await Promise.all(promises);
            console.log('Done!');
            return true;
        }

        return processMembers(members);
    });

export const eventOnUpdate = functions.firestore
    .document('teams/{teamId}/calendar/{eventId}')
    .onUpdate(async (change, context) => {

        console.log('change', change);
        console.log('context', context);
        const teamId = context.params.teamId;
        const eventId = context.params.eventId;
        const event: Event = change.after.data() as Event;
        const membersSnapshot = await firestore
            .collection('teams')
            .doc(teamId)
            .collection('calendar')
            .doc(eventId)
            .collection('members')
            .get();
        const members: EventMember[] = membersSnapshot.docs.map(doc => doc.data()) as EventMember[];

        async function processMembers(memberList: EventMember[]) {
            const promises = memberList.map(async m => {
                const profileDoc = await firestore
                    .collection('users')
                    .doc(m.uid)
                    .get();
                const profile = profileDoc.data();
                if (profile?.gcalSync) {
                    console.log('modifying event for member');
                    await modifyEvent(profile.uid, event);
                } else {
                    console.log('member is not syncing events');
                }
            });
            await Promise.all(promises);
            console.log('Done!');
            return true;
        }

        return processMembers(members);
    });

export const eventOnDelete = functions.firestore
    .document('teams/{teamId}/calendar/{eventId}')
    .onDelete(async (snap, context) => {

        console.log('snap', snap);
        console.log('context', context);
        const teamId = context.params.teamId;
        const eventId = context.params.eventId;
        const event: Event = snap.data() as Event;
        const membersSnapshot = await firestore
            .collection('teams')
            .doc(teamId)
            .collection('calendar')
            .doc(eventId)
            .collection('members')
            .get();
        const members: EventMember[] = membersSnapshot.docs.map(doc => doc.data()) as EventMember[];

        async function processMembers(memberList: EventMember[]) {
            const promises = memberList.map(async m => {
                await firestore
                    .collection('teams')
                    .doc(teamId)
                    .collection('calendar')
                    .doc(eventId)
                    .collection('members')
                    .doc(m.uid)
                    .delete();
                await firestore
                    .collection('users')
                    .doc(m.uid)
                    .collection('teams')
                    .doc(teamId)
                    .collection('unread')
                    .doc(eventId)
                    .delete();
                const profileDoc = await firestore
                    .collection('users')
                    .doc(m.uid)
                    .get();
                const profile = profileDoc.data();
                if (profile?.gcalSync) {
                    try {
                        console.log('removing event for member');
                        await removeEvent(profile.uid, event);
                    } catch (err) {
                        console.log(err.message);
                    }
                } else {
                    console.log('member is not syncing events');
                }
            });
            await Promise.all(promises);
            console.log('Done!');
            return true;
        }

        return processMembers(members);
    });

export const noteOnRemove = functions.firestore
    .document('teams/{teamId}/notes/{noteId}')
    .onDelete(async (snapshot, context) => {
        console.log('snapshot', snapshot);
        console.log('context', context);

        console.log('teamId', context.params.teamId);
        const teamId = context.params.teamId;
        console.log('noteId', context.params.noteId);
        const noteId = context.params.noteId;

        const membersSnapshot = await firestore
            .collection('teams')
            .doc(teamId)
            .collection('members')
            .get();
        const members = membersSnapshot.docs.map(doc => doc.data());
        return members.forEach(async member => {
            return firestore
                .collection('users')
                .doc(member.uid)
                .collection('teams')
                .doc(teamId)
                .collection('unread')
                .doc(noteId)
                .delete();
        });
    });

export const pendingOnCreate = functions.firestore
    .document('teams/{teamId}/pendingMembers/{pendingMemberUid}')
    .onWrite(async (change, context) => {
        console.log(change, context);
        console.log('teamId', context.params.teamId);
        console.log('pendingMemberUid', context.params.pendingMemberUid);
        const teamId = context.params.teamId;
        const pendingMemberUid = context.params.pendingMemberUid;
        try {
            const doc = await firestore
                .collection('teams')
                .doc(teamId)
                .collection('pendingMembers')
                .doc(pendingMemberUid)
                .get();
            const pendingDocId = doc.id;
            if (doc.exists && !doc.data()?.uid) {
                const pendingMemberEmail = doc.data()?.email;
                console.log('pendingMemberEmail', pendingMemberEmail);
                const querySnapshot = await firestore
                    .collection('users')
                    .where('email', '==', pendingMemberEmail)
                    .get();
                if (!querySnapshot.empty) {
                    return querySnapshot.forEach(async (profile) => {
                        const pendingMemberProfile = profile.data();
                        const uid = profile.id;
                        const adminSnapshot = await firestore
                            .collection('teams')
                            .doc(teamId)
                            .collection('members')
                            .where('status', '==', 'Admin')
                            .get();
                        if (!adminSnapshot.empty) {
                            adminSnapshot.forEach(async adminDoc => {
                                const adminUid = adminDoc.data().uid;
                                console.log('Adding a ', adminUid, ' instance to ', uid);
                                await firestore
                                    .collection('users')
                                    .doc(uid)
                                    .collection('teammates')
                                    .doc(adminUid)
                                    .set({ teams: FieldValue.increment(1) }, { merge: true });
                                console.log('Adding a ', uid, ' instance to ', adminUid);
                                return firestore
                                    .collection('users')
                                    .doc(adminUid)
                                    .collection('teammates')
                                    .doc(uid)
                                    .set({ teams: FieldValue.increment(1) }, { merge: true });
                            });
                        } else {
                            return console.log('No admin');
                        }
                        await firestore.collection('teams').doc(teamId).collection('pendingMembers').doc(uid).set({
                            displayName: pendingMemberProfile.displayName ? pendingMemberProfile.displayName : null,
                            email: pendingMemberProfile.email ? pendingMemberProfile.email : null,
                            role: pendingMemberProfile.role ? pendingMemberProfile.role : null,
                            url: pendingMemberProfile.url ? pendingMemberProfile.url : null,
                            url_150: pendingMemberProfile.url_150 ? pendingMemberProfile.url_150 : null,
                            uid,
                            status: 'Pending'
                        }, { merge: true });
                        await firestore
                            .collection('users')
                            .doc(uid)
                            .collection('pendingTeams')
                            .doc(teamId)
                            .set({
                                id: teamId
                            }, { merge: true });
                        return firestore
                            .collection('teams')
                            .doc(teamId)
                            .collection('pendingMembers')
                            .doc(pendingDocId)
                            .delete();
                    });
                }
                else {
                    return console.log('Pending user does not have an account');
                }
            } else {
                return;
            }
        }
        catch (error) {
            return console.log('error', error);
        }
    });

export const memberOnJoin = functions.firestore
    .document('teams/{teamId}/members/{memberUid}')
    .onCreate(async (snapshot, context) => {
        const teamId = context.params.teamId;
        console.log('memberUid', context.params.memberUid);
        const memberUid = context.params.memberUid;
        await addTeamClaims(memberUid, teamId);
        await firestore.collection('teams').doc(teamId).collection('pendingMembers').doc(memberUid).delete();
        const membersSnapshot = await firestore.collection('teams').doc(teamId).collection('members').get();
        const members = membersSnapshot.docs.map(doc => doc.data());
        members.forEach(async member => {
            if (member.uid !== memberUid && member.status !== 'Admin') {
                console.log('Adding a ', memberUid, ' instance to ', member.uid);
                await firestore
                    .collection('users')
                    .doc(member.uid)
                    .collection('teammates')
                    .doc(memberUid)
                    .set({ teams: FieldValue.increment(1) }, { merge: true });
                console.log('Adding a ', member.uid, ' instance to ', memberUid);
                return firestore
                    .collection('users')
                    .doc(memberUid)
                    .collection('teammates')
                    .doc(member.uid)
                    .set({ teams: FieldValue.increment(1) }, { merge: true });
            } else {
                return;
            }
        });
        const groupsSnapshot = await firestore
            .collection('teams')
            .doc(teamId)
            .collection('groups')
            .where('name', '==', 'Everyone')
            .get();
        return groupsSnapshot.forEach(async (groupDoc) => {
            const groupId = groupDoc.id;
            const groupAdminUid = groupDoc.data().createdBy;
            if (memberUid === groupAdminUid) {
                return;
            } else {
                return firestore
                    .collection('teams')
                    .doc(teamId)
                    .collection('groups')
                    .doc(groupId)
                    .collection('members')
                    .doc(memberUid)
                    .set({
                        uid: memberUid,
                        status: 'Member'
                    }, { merge: true });
            }
        });
    });

export const groupMemberOnJoin = functions.firestore
    .document('teams/{teamId}/groups/{groupId}/members/{memberUid}')
    .onCreate(async (snapshot, context) => {
        console.log('snapshot', snapshot);
        console.log('context', context);
        console.log('teamId', context.params.teamId);
        const teamId = context.params.teamId;
        console.log('groupId', context.params.groupId);
        const groupId = context.params.groupId;
        console.log('memberUid', context.params.memberUid);
        const memberUid = context.params.memberUid;
        await addGroupClaims(memberUid, groupId);
        return firestore
            .collection('users')
            .doc(memberUid)
            .collection('teams')
            .doc(teamId)
            .collection('groups')
            .doc(groupId)
            .set({
                id: groupId
            }, { merge: true })
            .then(() => {
                return console.log('Added group reference for ', groupId, ' to the user profile of ', memberUid);
            })
            .catch((error) => {
                return console.log('error', error);
            });
    });

export const groupMemberOnRemove = functions.firestore
    .document('teams/{teamId}/groups/{groupId}/members/{memberUid}')
    .onDelete(async (snapshot, context) => {

        console.log('snapshot', snapshot);
        console.log('context', context);

        console.log('teamId', context.params.teamId);
        const teamId = context.params.teamId;
        console.log('groupId', context.params.groupId);
        const groupId = context.params.groupId;
        console.log('memberUid', context.params.memberUid);
        const memberUid = context.params.memberUid;
        await removeGroupClaims(memberUid, groupId);
        return firestore.collection('users').doc(memberUid).collection('teams').doc(teamId).collection('groups').doc(groupId).delete()
            .then(() => {
                return console.log('Removed group reference for ', groupId, ' from the user profile of ', memberUid);
            })
            .catch((error) => {
                return console.log('error', error);
            });
    });

export const memberOnRemove = functions.firestore
    .document('teams/{teamId}/members/{memberUid}')
    .onDelete(async (change, context) => {
        console.log(change, context);
        console.log('context', context);
        console.log('teamId', context.params.teamId);
        const teamId = context.params.teamId;
        console.log('memberUid', context.params.memberUid);
        const memberUid = context.params.memberUid;
        try {
            await removeTeamClaims(memberUid, teamId);
            const membersSnapshot = await firestore.collection('teams').doc(teamId).collection('members').get();
            const members = membersSnapshot.docs.map(doc => doc.data());
            members.forEach(async member => {
                if (member.uid !== memberUid) {
                    const pathId = memberUid < member.uid ? memberUid + member.uid : member.uid + memberUid;
                    try {
                        console.log('Deleting unread with member on the doc for ', member.uid);
                        await firestore
                            .collection('users')
                            .doc(member.uid)
                            .collection('teams')
                            .doc(teamId)
                            .collection('unread')
                            .doc(pathId)
                            .delete();
                        console.log('Subtracting a ', memberUid, ' instance from ', member.uid);
                        await firestore
                            .collection('users')
                            .doc(member.uid)
                            .collection('teammates')
                            .doc(memberUid)
                            .set({ teams: FieldValue.increment(-1) }, { merge: true });
                        console.log('Subtracting a ', member.uid, ' instance from ', memberUid);
                        return firestore
                            .collection('users')
                            .doc(memberUid)
                            .collection('teammates')
                            .doc(member.uid)
                            .set({ teams: FieldValue.increment(-1) }, { merge: true });
                    } catch (err) {
                        return console.log('One of the user docs was not found or already deleted.');
                    }
                } else {
                    return;
                }
            });
            const groupsSnapshot = await firestore
                .collection('teams')
                .doc(teamId)
                .collection('groups')
                .get();
            groupsSnapshot.forEach(async (doc) => {
                const groupId = doc.id;
                const groupMembersSnapshot = await firestore
                    .collection('teams')
                    .doc(teamId)
                    .collection('groups')
                    .doc(groupId)
                    .collection('members')
                    .where('uid', '==', memberUid)
                    .get();
                if (!groupMembersSnapshot.empty) {
                    await firestore
                        .collection('teams')
                        .doc(teamId)
                        .collection('groups')
                        .doc(groupId)
                        .collection('members')
                        .doc(memberUid)
                        .delete();
                }
                else {
                    console.log('member not in this group', groupId);
                }
                try {
                    await firestore
                        .collection('users').doc(memberUid)
                        .set({
                            lastTeam: FieldValue.delete()
                        }, { merge: true });
                    return firestore
                        .collection('users')
                        .doc(memberUid)
                        .collection('teams')
                        .doc(teamId)
                        .delete();
                } catch (err) {
                    return console.log('User doc or team doc already deleted');
                }
            });
            const eventsSnapshot = await firestore.collection('teams').doc(teamId).collection('events').get();
            eventsSnapshot.forEach(async (doc) => {
                const eventId = doc.id;
                const eventMembersSnapshot = await firestore
                    .collection('teams')
                    .doc(teamId)
                    .collection('events')
                    .doc(eventId)
                    .collection('members')
                    .where('uid', '==', memberUid)
                    .get();
                if (!eventMembersSnapshot.empty) {
                    return firestore
                        .collection('teams')
                        .doc(teamId)
                        .collection('events')
                        .doc(eventId)
                        .collection('members')
                        .doc(memberUid)
                        .delete();
                }
                else {
                    return console.log('member not in this group', eventId);
                }
            });
        }
        catch (error) {
            return console.log('error', error);
        }
    });

export const pendingMemberOnRemove = functions.firestore
    .document('teams/{teamId}/pendingMembers/{memberUid}')
    .onDelete(async (change, context) => {
        console.log(change, context);
        console.log('context', context);
        console.log('teamId', context.params.teamId);
        const teamId = context.params.teamId;
        console.log('memberUid', context.params.memberUid);
        const memberUid = context.params.memberUid;
        try {
            return firestore.collection('users').doc(memberUid).get()
                .then(async userDoc => {
                    if (userDoc.exists) {
                        return firestore.collection('users').doc(memberUid).collection('teams').doc(teamId).get()
                            .then(async teamDoc => {
                                if (!teamDoc.exists) {
                                    await firestore.collection('teams').doc(teamId).collection('members').get()
                                        .then(async (querySnapshot) => {
                                            const members = querySnapshot.docs.map(memberDoc => memberDoc.data());
                                            return members.forEach(async member => {
                                                if (member.status === 'Admin') {
                                                    console.log('Subtracting a ', memberUid, ' instance from ', member.uid);
                                                    await firestore
                                                        .collection('users')
                                                        .doc(member.uid)
                                                        .collection('teammates')
                                                        .doc(memberUid)
                                                        .set({ teams: FieldValue.increment(-1) }, { merge: true });
                                                    console.log('Subtracting a ', member.uid, ' instance from ', memberUid);
                                                    return firestore
                                                        .collection('users')
                                                        .doc(memberUid)
                                                        .collection('teammates')
                                                        .doc(member.uid)
                                                        .set({ teams: FieldValue.increment(-1) }, { merge: true });
                                                } else {
                                                    return;
                                                }
                                            });
                                        });
                                    await firestore.collection('users').doc(memberUid).set({
                                        lastTeam: FieldValue.delete()
                                    }, { merge: true });
                                    return firestore
                                        .collection('users')
                                        .doc(memberUid)
                                        .collection('pendingTeams')
                                        .doc(teamId)
                                        .delete();
                                } else {
                                    return;
                                }
                            });
                    } else {
                        return;
                    }
                });
        }
        catch (error) {
            return console.log('error', error);
        }
    });

export const updateGroupMessageCount = functions.firestore
    .document('teams/{teamId}/groups/{groupId}/messages/{messageId}')
    .onCreate(async (snap, context) => {
        console.log('snap', snap);
        console.log('context', context);
        const message = snap.data();
        const messageId = context.params.messageId;
        const userUid = message?.uid;
        const teamId = context.params.teamId;
        const groupId = context.params.groupId;
        await firestore.doc(`teams/${teamId}/groups/${groupId}`).set({
            lastMessage: message?.style === 'message' ? message.body : 'Attachment: 1 File',
            lastMessageId: messageId,
            lastMessageUid: message?.uid
        }, { merge: true });
        const querySnapshot = await firestore.collection('teams').doc(teamId).collection('groups').doc(groupId).collection('members').get();
        const members = querySnapshot.docs.map(doc => doc.data());
        return members.forEach((member) => {
            if (member.uid !== userUid) {
                console.log('memberUid?', member.uid);
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                notifyUser(member.uid, 'message');
                return firestore.collection('users').doc(member.uid).collection('teams').doc(teamId).set({
                    unread: {
                        [`${groupId}`]: {
                            unreadMessages: FieldValue.increment(1)
                        }
                    }
                }, { merge: true });
            } else {
                return console.log('Not updating user who posted');
            }
        });
    });

export const updateGroupFileCount = functions.firestore
    .document('teams/{teamId}/groups/{groupId}/files/{fileId}')
    .onCreate(async (snap, context) => {
        console.log('snap', snap);
        console.log('context', context);
        const file = snap.data();
        const fileId = context.params.fileId;
        const userUid = file?.uid;
        const teamId = context.params.teamId;
        const groupId = context.params.groupId;
        await firestore.doc(`teams/${teamId}/groups/${groupId}`).set({
            lastFile: file?.name,
            lastFileId: fileId,
            lastFileUid: file?.uid
        }, { merge: true });
        const querySnapshot = await firestore.collection('teams').doc(teamId).collection('groups').doc(groupId).collection('members').get();
        const members = querySnapshot.docs.map(doc => doc.data());
        return members.forEach((member) => {
            if (member.uid !== userUid) {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                notifyUser(member.uid, 'file');
                return firestore.collection('users').doc(member.uid).collection('teams').doc(teamId).set({
                    unread: {
                        [`${groupId}`]: {
                            unreadFiles: FieldValue.increment(1)
                        }
                    }
                }, { merge: true });
            } else {
                return console.log('Not updating user who posted');
            }
        });
    });

export const updateDirectMessageCount = functions.firestore
    .document('teams/{teamId}/direct/{pathId}/messages/{messageId}')
    .onCreate(async (snap, context) => {
        console.log('snap', snap);
        console.log('context', context);
        const message = snap.data();
        const messageId = context.params.messageId;
        const pathId = context.params.pathId;
        const teamId = context.params.teamId;
        const updateUid = pathId.substr(0, 28) === message?.uid ? pathId.substr(28, 28) : pathId.substr(0, 28);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        notifyUser(updateUid, 'message');
        await firestore.doc(`teams/${teamId}/direct/${pathId}`).set({
            lastMessage: message?.style === 'message' ? message.body : 'Attachment: 1 File',
            lastMessageId: messageId,
            lastMessageUid: message?.uid
        }, { merge: true });
        return firestore.collection('users').doc(updateUid).collection('teams').doc(teamId).set({
            unread: {
                [`${pathId}`]: {
                    unreadMessages: FieldValue.increment(1)
                }
            }
        }, { merge: true });
    });

export const updateDirectFileCount = functions.firestore
    .document('teams/{teamId}/direct/{pathId}/files/{fileId}')
    .onCreate(async (snap, context) => {
        console.log('snap', snap);
        console.log('context', context);
        const file = snap.data();
        const fileId = context.params.fileId;
        const pathId = context.params.pathId;
        const teamId = context.params.teamId;
        const updateUid = pathId.substr(0, 28) === file?.uid ? pathId.substr(28, 28) : pathId.substr(0, 28);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        notifyUser(updateUid, 'file');
        await firestore.doc(`teams/${teamId}/direct/${pathId}`).set({
            lastFile: file?.name,
            lastFileId: fileId,
            lastFileUid: file?.uid
        }, { merge: true });
        return firestore.collection('users').doc(updateUid).collection('teams').doc(teamId).set({
            unread: {
                [`${pathId}`]: {
                    unreadFiles: FieldValue.increment(1)
                }
            }
        }, { merge: true });
    });

export const teamOnCreate = functions.firestore
    .document('teams/{teamId}')
    .onCreate((snap, context) => {
        console.log(snap);
        console.log(context);
        return notifyAdmin('team');
    });

export const updateNoteCount = functions.firestore
    .document('teams/{teamId}/notes/{noteId}')
    .onCreate(async (snap, context) => {
        console.log('snap', snap);
        console.log('context', context);
        const note = snap.data();
        const userUid = note?.uid;
        const teamId = context.params.teamId;
        const noteId = context.params.noteId;
        const querySnapshot = await firestore.collection('teams').doc(teamId).collection('members').get();
        const members = querySnapshot.docs.map(doc => doc.data());
        return members.forEach((member) => {
            if (member.uid !== userUid) {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                notifyUser(member.uid, 'note');
                return firestore.collection('users').doc(member.uid).collection('teams').doc(teamId).set({
                    unread: {
                        [`${noteId}`]: {
                            unreadNotes: FieldValue.increment(1)
                        }
                    }
                }, { merge: true });
            } else {
                return console.log('Not updating user who posted');
            }
        });
    });

export const updateProfile = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
        const userId = context.params.userId;
        const oldP = change.before.data();
        const newP = change.after.data();
        if (oldP?.displayName !== newP?.displayName ||
            oldP?.email !== newP?.email ||
            oldP?.role !== newP?.role ||
            oldP?.url !== newP?.url ||
            oldP?.url_150 !== newP?.url_150) {
            const userTeamsSnap = await firestore.collection('users').doc(userId).collection('teams').get();
            const userTeams: UserTeam[] = userTeamsSnap.docs.map(doc => doc.data()) as UserTeam[];
            const processUserTeams = async (userTeamList: UserTeam[]) => {
                const userTeamsPromises = userTeamList.map(async team => {
                    await firestore.collection('teams').doc(team.id).collection('members').doc(userId).set({
                        displayName: newP?.displayName ? newP.displayName : null,
                        email: newP?.email ? newP.email : null,
                        role: newP?.role ? newP.role : null,
                        url: newP?.url ? newP.url : null,
                        url_150: newP?.url_150 ? newP.url_150 : null
                    }, { merge: true });
                });
                console.log('Done teams!');
                return Promise.all(userTeamsPromises);
            };
            await processUserTeams(userTeams);
            const userPendingTeamsSnap = await firestore
                .collection('users')
                .doc(userId)
                .collection('pendingTeams')
                .get();
            const userPendingTeams: UserTeam[] = userPendingTeamsSnap.docs.map(doc => doc.data()) as UserTeam[];
            const processUserPendingTeams = async (userPendingTeamList: UserTeam[]) => {
                const userPendingTeamsPromises = userPendingTeamList.map(async team => {
                    await firestore
                        .collection('teams')
                        .doc(team.id)
                        .collection('pendingMembers')
                        .doc(userId)
                        .set({
                            displayName: newP?.displayName ? newP.displayName : null,
                            email: newP?.email ? newP.email : null,
                            role: newP?.role ? newP.role : null,
                            url: newP?.url ? newP.url : null,
                            url_150: newP?.url_150 ? newP.url_150 : null
                        }, { merge: true });
                });
                console.log('Done pending!');
                return Promise.all(userPendingTeamsPromises);
            };
            return processUserPendingTeams(userPendingTeams);
        } else {
            console.log('Profile items not updated.');
            return false;
        }
    });
