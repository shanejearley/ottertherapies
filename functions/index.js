const admin = require('firebase-admin');

const functions = require('firebase-functions');

const cors = require('cors')({ origin: 'https://ottertherapies.web.app' });
//const cors = require('cors')({ origin: "*", methods: "GET, POST" })

const cheerio = require('cheerio');
const getUrls = require('get-urls');
const fetch = require('node-fetch');

admin.initializeApp();
const firestore = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const scrapeMetatags = (text) => {

    const urls = Array.from(getUrls(text));

    const requests = urls.map(async url => {

        const res = await fetch(url);

        const html = await res.text();
        const $ = cheerio.load(html);

        const getMetatag = (name) =>
            $(`meta[name=${name}]`).attr('content') ||
            $(`meta[name="og:${name}"]`).attr('content') ||
            $(`meta[name="twitter:${name}"]`).attr('content');

        return {
            url,
            title: $('title').first().text(),
            favicon: $('link[rel~="icon"]').attr('href') && !$('link[rel~="icon"]').attr('href').startsWith('https://') ? url + $('link[rel~="icon"]').attr('href') : $('link[rel~="icon"]').attr('href'),
            //favicon: $('link[rel="shortcut icon"]').attr('href'),
            // description: $('meta[name=description]').attr('content'),
            description: getMetatag('description'),
            image: getMetatag('image'),
            author: getMetatag('author'),
        }
    });

    return Promise.all(requests);

}

exports.scraper = functions.https.onCall(async (data, context) => {
    const text = data.text;
    if (!(typeof text === 'string') || text.length === 0) {
        // Throwing an HttpsError so that the client gets the error details.
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with ' +
            'one arguments "text" containing the message text to add.');
    }
    // Checking that the user is authenticated.
    if (!context.auth) {
        // Throwing an HttpsError so that the client gets the error details.
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    const result = await scrapeMetatags(text);

    return { result };
    // const uid = context.auth.uid;
    // const scrape = await scrapeMetatags(data.text)
    // console.log(scrape);

});

const addTeamClaims = async (uid, teamId) => {
    return admin.auth().setCustomUserClaims(uid, { [teamId]: true });
}

const removeTeamClaims = async (uid, teamId) => {
    return admin.auth().setCustomUserClaims(uid, { [teamId]: false })
}

const addGroupClaims = async (uid, groupId) => {
    return admin.auth().setCustomUserClaims(uid, { [groupId]: true })
}

const removeGroupClaims = async (uid, groupId) => {
    return admin.auth().setCustomUserClaims(uid, { [groupId]: false })
}

const notifyUser = async (uid, context) => {

    // get users tokens and send notifications
    try {
        const userId = uid
        const userRef = firestore.collection('users').doc(userId)
        const snapshot = await userRef.get();
        const user = snapshot.data();
        user.badge = user.badge ? user.badge + 1 : 1;
        // Message details for end user

        const payload = {
            notification: {
                title: `New ${context}!`,
                body: `A team member sent you a new ${context}`,
                badge: `${user.badge}`
            }
        }

        const tokens = user.fcmTokens ? Object.keys(user.fcmTokens) : [];
        if (!tokens.length) {
            throw new Error('User does not have any tokens!');
        }
        console.log("Sending to tokens: ", tokens);
        userRef.update(user);
        return admin.messaging().sendToDevice(tokens, payload);
    }
    catch (err) {
        return console.log(err);
    }
}

exports.authOnCreate = functions.auth.user().onCreate((user) => {
    const uid = user.uid;
    const email = user.email; // The email of the user.
    console.log('Creating document for user', user.uid, 'with email', email);
    return firestore.collection('users').doc(user.uid).set({
        uid: user.uid,
        email: email,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
        .then(function () {
            return firestore.collection('teams').get().then(function (querySnapshot) {
                if (!querySnapshot.empty) {
                    return querySnapshot.forEach(function (doc) {
                        var teamId = doc.id;
                        console.log("Checking in ", teamId);
                        return firestore.collection('teams').doc(teamId).collection('pendingMembers').where('email', '==', email).get()
                            .then(function (querySnapshot) {
                                if (!querySnapshot.empty) {
                                    return querySnapshot.forEach(async (doc) => {
                                        console.log("Found member in pending for ", teamId);
                                        var pendingDocId = doc.id;
                                        await firestore.collection("teams").doc(teamId).collection("members").where('status', '==', 'Admin').get()
                                            .then(async (querySnapshot) => {
                                                if (!querySnapshot.empty) {
                                                    return querySnapshot.forEach(async admin => {
                                                        adminUid = admin.data().uid;
                                                        console.log('Adding a ', adminUid, ' instance to ', uid)
                                                        await firestore.collection("users").doc(uid).collection("teammates").doc(adminUid).set({ teams: FieldValue.increment(1) }, { merge: true });
                                                        console.log('Adding a ', uid, ' instance to ', adminUid)
                                                        return firestore.collection("users").doc(adminUid).collection("teammates").doc(uid).set({ teams: FieldValue.increment(1) }, { merge: true });
                                                    })
                                                } else {
                                                    return console.log('No admin');
                                                }
                                            })
                                        await firestore.collection('teams').doc(teamId).collection('pendingMembers').doc(uid).set({
                                            uid: uid,
                                            status: "Pending"
                                        }, { merge: true })
                                        await firestore.collection('users').doc(uid).collection('pendingTeams').doc(teamId).set({
                                            id: teamId,
                                        }, { merge: true })
                                        return firestore.collection('teams').doc(teamId).collection('pendingMembers').doc(pendingDocId).delete();
                                    })
                                } else {
                                    return console.log("Member doesn't exist on this team");
                                }
                            })
                    })
                } else {
                    return console.log("No teams exist");
                }
            })
        })
        .catch(function (error) {
            return console.log(error);
        })
})

exports.authOnDelete = functions.auth.user().onDelete((user) => {
    //const uid = user.uid;
    //const email = user.email; // The email of the user.
    console.log('Making user document for ', user.uid, 'anonymous');
    return firestore.collection('users').doc(user.uid).set({
        displayName: 'Deleted User',
        email: 'N/A',
        url: null
    }, { merge: true })
});

exports.pendingOnCreate = functions.firestore
    .document('teams/{teamId}/pendingMembers/{pendingMemberUid}')
    .onWrite(async (change, context) => {
        console.log(change, context);
        console.log("teamId", context.params.teamId);
        console.log("pendingMemberUid", context.params.pendingMemberUid);
        var teamId = context.params.teamId;
        var pendingMemberUid = context.params.pendingMemberUid;
        try {
            const doc = await firestore.collection("teams").doc(teamId).collection("pendingMembers").doc(pendingMemberUid).get();
            var pendingDocId = doc.id;
            if (doc.exists && !doc.data().uid) {
                var pendingMemberEmail = doc.data().email;
                console.log("pendingMemberEmail", pendingMemberEmail);
                const querySnapshot = await firestore.collection("users").where('email', '==', pendingMemberEmail).get();
                if (!querySnapshot.empty) {
                    return querySnapshot.forEach(async function (doc_1) {
                        var uid = doc_1.id;
                        await firestore.collection("teams").doc(teamId).collection("members").where('status', '==', 'Admin').get()
                            .then(async (querySnapshot) => {
                                if (!querySnapshot.empty) {
                                    return querySnapshot.forEach(async admin => {
                                        adminUid = admin.data().uid;
                                        console.log('Adding a ', adminUid, ' instance to ', uid)
                                        await firestore.collection("users").doc(uid).collection("teammates").doc(adminUid).set({ teams: FieldValue.increment(1) }, { merge: true });
                                        console.log('Adding a ', uid, ' instance to ', adminUid)
                                        return firestore.collection("users").doc(adminUid).collection("teammates").doc(uid).set({ teams: FieldValue.increment(1) }, { merge: true });
                                    })
                                } else {
                                    return console.log('No admin');
                                }
                            })
                        await firestore.collection("teams").doc(teamId).collection("pendingMembers").doc(uid).set({
                            uid: uid,
                            status: "Pending"
                        }, { merge: true });
                        await firestore.collection('users').doc(uid).collection('pendingTeams').doc(teamId).set({
                            id: teamId,
                        }, { merge: true });
                        return firestore.collection('teams').doc(teamId).collection('pendingMembers').doc(pendingDocId).delete();
                    });
                }
                else {
                    return console.log("Pending user does not have an account");
                }
            } else {
                return;
            }
        }
        catch (error) {
            return console.log("error", error);
        }
    })

exports.memberOnJoin = functions.firestore
    .document('teams/{teamId}/members/{memberUid}')
    .onCreate(async (snapshot, context) => {
        var teamId = context.params.teamId;
        console.log("memberUid", context.params.memberUid);
        var memberUid = context.params.memberUid;
        await addTeamClaims(memberUid, teamId);
        await firestore.collection('teams').doc(teamId).collection('pendingMembers').doc(memberUid).delete();
        await firestore.collection("teams").doc(teamId).collection("members").get()
            .then(async (querySnapshot) => {
                var members = querySnapshot.docs.map(doc => doc.data());
                return members.forEach(async member => {
                    if (member.uid !== memberUid && member.status !== 'Admin') {
                        console.log('Adding a ', memberUid, ' instance to ', member.uid);
                        await firestore.collection("users").doc(member.uid).collection("teammates").doc(memberUid).set({ teams: FieldValue.increment(1) }, { merge: true });
                        console.log('Adding a ', member.uid, ' instance to ', memberUid)
                        return firestore.collection("users").doc(memberUid).collection("teammates").doc(member.uid).set({ teams: FieldValue.increment(1) }, { merge: true });
                    } else {
                        return;
                    }
                })
            })
        return firestore.collection("teams").doc(teamId).collection("groups").where("name", "==", "Everyone").get()
            .then(function (querySnapshot) {
                return querySnapshot.forEach(async function (doc) {
                    var groupId = doc.id;
                    await firestore.collection("teams").doc(teamId).collection("groups").doc(groupId).collection("members").doc(memberUid).set({
                        uid: memberUid,
                        status: "Member"
                    }, { merge: true });
                })
            })
            .catch(function (error) {
                return console.log("error", error);
            });
    });

exports.groupMemberOnJoin = functions.firestore
    .document('teams/{teamId}/groups/{groupId}/members/{memberUid}')
    .onCreate((snapshot, context) => {
        console.log("snapshot", snapshot);
        console.log("context", context);
        console.log("teamId", context.params.teamId);
        var teamId = context.params.teamId;
        console.log("groupId", context.params.groupId);
        var groupId = context.params.groupId;
        console.log("memberUid", context.params.memberUid);
        var memberUid = context.params.memberUid;
        await addGroupClaims(memberUid, groupId);
        return firestore.collection("users").doc(memberUid).collection("teams").doc(teamId).collection("groups").doc(groupId).set({
            id: groupId
        }, { merge: true })
            .then(function () {
                return console.log("Added group reference for ", groupId, " to the user profile of ", memberUid);
            })
            .catch(function (error) {
                return console.log("error", error);
            })
    });

exports.groupMemberOnRemove = functions.firestore
    .document('teams/{teamId}/groups/{groupId}/members/{memberUid}')
    .onDelete((snapshot, context) => {
        console.log("snapshot", snapshot);
        console.log("context", context);
        console.log("teamId", context.params.teamId);
        var teamId = context.params.teamId;
        console.log("groupId", context.params.groupId);
        var groupId = context.params.groupId;
        console.log("memberUid", context.params.memberUid);
        var memberUid = context.params.memberUid;
        await removeGroupClaims(memberUid, groupId);
        return firestore.collection("users").doc(memberUid).collection("teams").doc(teamId).collection("groups").doc(groupId).delete()
            .then(function () {
                return console.log("Removed group reference for ", groupId, " from the user profile of ", memberUid);
            })
            .catch(function (error) {
                return console.log("error", error);
            })
    });

exports.memberOnRemove = functions.firestore
    .document('teams/{teamId}/members/{memberUid}')
    .onDelete(async (change, context) => {
        console.log(change, context);
        console.log("context", context);
        console.log("teamId", context.params.teamId);
        var teamId = context.params.teamId;
        console.log("memberUid", context.params.memberUid);
        var memberUid = context.params.memberUid;
        try {
            await removeTeamClaims(memberUid, teamId);
            await firestore.collection("teams").doc(teamId).collection("members").get()
                .then(async (querySnapshot) => {
                    var members = querySnapshot.docs.map(doc => doc.data());
                    return members.forEach(async member => {
                        if (member.uid !== memberUid) {
                            console.log('Subtracting a ', memberUid, ' instance from ', member.uid);
                            await firestore.collection("users").doc(member.uid).collection("teammates").doc(memberUid).set({ teams: FieldValue.increment(-1) }, { merge: true });
                            console.log('Subtracting a ', member.uid, ' instance from ', memberUid)
                            return firestore.collection("users").doc(memberUid).collection("teammates").doc(member.uid).set({ teams: FieldValue.increment(-1) }, { merge: true });
                        } else {
                            return;
                        }
                    })
                })
            const querySnapshot = await firestore.collection("teams").doc(teamId).collection("groups").get();
            return querySnapshot.forEach(async function (doc) {
                var groupId = doc.id;
                const querySnapshot_1 = await firestore.collection("teams").doc(teamId).collection("groups").doc(groupId).collection("members").where("uid", "==", memberUid).get()
                if (!querySnapshot_1.empty) {
                    await firestore.collection("teams").doc(teamId).collection("groups").doc(groupId).collection("members").doc(memberUid).delete();
                }
                else {
                    console.log("member not in this group", groupId);
                }
                await firestore.collection("users").doc(memberUid).set({
                    lastTeam: FieldValue.delete()
                }, { merge: true });
                return firestore.collection("users").doc(memberUid).collection("teams").doc(teamId).delete();
            });
        }
        catch (error) {
            return console.log("error", error);
        }
    });

exports.pendingMemberOnRemove = functions.firestore
    .document('teams/{teamId}/pendingMembers/{memberUid}')
    .onDelete(async (change, context) => {
        console.log(change, context);
        console.log("context", context);
        console.log("teamId", context.params.teamId);
        var teamId = context.params.teamId;
        console.log("memberUid", context.params.memberUid);
        var memberUid = context.params.memberUid;
        try {
            return firestore.collection("users").doc(memberUid).get()
                .then(async doc => {
                    if (doc.exists) {
                        return firestore.collection("users").doc(memberUid).collection("teams").doc(teamId).get()
                            .then(async doc => {
                                if (!doc.exists) {
                                    await firestore.collection("teams").doc(teamId).collection("members").get()
                                        .then(async (querySnapshot) => {
                                            var members = querySnapshot.docs.map(doc => doc.data());
                                            return members.forEach(async member => {
                                                if (member.status === 'Admin') {
                                                    console.log('Subtracting a ', memberUid, ' instance from ', member.uid)
                                                    await firestore.collection("users").doc(member.uid).collection("teammates").doc(memberUid).set({ teams: FieldValue.increment(-1) }, { merge: true });
                                                    console.log('Subtracting a ', member.uid, ' instance from ', memberUid)
                                                    return firestore.collection("users").doc(memberUid).collection("teammates").doc(member.uid).set({ teams: FieldValue.increment(-1) }, { merge: true });
                                                } else {
                                                    return;
                                                }
                                            })
                                        })
                                    await firestore.collection("users").doc(memberUid).set({
                                        lastTeam: FieldValue.delete()
                                    }, { merge: true });
                                    return firestore.collection("users").doc(memberUid).collection("pendingTeams").doc(teamId).delete();
                                } else {
                                    return;
                                }
                            })
                    } else {
                        return;
                    }
                })
        }
        catch (error) {
            return console.log("error", error);
        }
    });

exports.updateGroupMessageCount = functions.firestore
    .document('teams/{teamId}/groups/{groupId}')
    .onWrite((change, context) => {
        console.log("change", change);
        console.log("context", context);
        console.log("teamId", context.params.teamId);
        if (change.after.data().lastMessageId && change.after.data().lastMessageId !== change.before.data().lastMessageId) {
            console.log("user", change.after.data().lastMessageUid);
            var userUid = change.after.data().lastMessageUid;
            var teamId = context.params.teamId;
            console.log("groupId", context.params.groupId);
            var groupId = context.params.groupId;
            return firestore.collection("teams").doc(teamId).collection("groups").doc(groupId).collection("members").get()
                .then(function (querySnapshot) {
                    console.log("members", querySnapshot.docs.map(doc => doc.data()));
                    var members = querySnapshot.docs.map(doc => doc.data());
                    return members.forEach((member) => {
                        if (member.uid !== userUid) {
                            console.log("memberUid?", member.uid);
                            notifyUser(member.uid, "message");
                            return firestore.collection("users").doc(member.uid).collection("teams").doc(teamId).collection("unread").doc(groupId).set({
                                unreadMessages: FieldValue.increment(1)
                            }, { merge: true })
                        } else {
                            return console.log("Not updating user who posted");
                        }
                    })
                })
                .catch(function (error) {
                    return console.log("error", error);
                });
        } else {
            return console.log("No new group messages with change");
        }
    });

exports.updateGroupFileCount = functions.firestore
    .document('teams/{teamId}/groups/{groupId}')
    .onWrite((change, context) => {
        console.log("change", change);
        console.log("context", context);
        console.log("teamId", context.params.teamId);
        if (change.after.data().lastFileId && change.after.data().lastFileId !== change.before.data().lastFileId) {
            var userUid = change.after.data().lastFileUid;
            var teamId = context.params.teamId;
            console.log("groupId", context.params.groupId);
            var groupId = context.params.groupId;
            return firestore.collection("teams").doc(teamId).collection("groups").doc(groupId).collection("members").get()
                .then(function (querySnapshot) {
                    console.log("members", querySnapshot.docs.map(doc => doc.data()));
                    var members = querySnapshot.docs.map(doc => doc.data());
                    return members.forEach((member) => {
                        if (member.uid !== userUid) {
                            notifyUser(member.uid, "file");
                            return firestore.collection("users").doc(member.uid).collection("teams").doc(teamId).collection("unread").doc(groupId).set({
                                unreadFiles: FieldValue.increment(1)
                            }, { merge: true })
                        } else {
                            return console.log("Not updating user who posted");
                        }
                    })
                })
                .catch(function (error) {
                    return console.log("error", error);
                });
        } else {
            return console.log("No new group Files with change");
        }
    });

exports.updateDirectMessageCount = functions.firestore
    .document('teams/{teamId}/direct/{pathId}')
    .onWrite((change, context) => {
        console.log("change", change);
        console.log("context", context);
        console.log("teamId", context.params.teamId);
        if (change.after.data().lastMessageId && change.after.data().lastMessageId !== change.before.data().lastMessageId) {
            var userUid = change.after.data().lastMessageUid;
            var teamId = context.params.teamId;
            console.log("pathId", context.params.pathId);
            var pathId = context.params.pathId;
            var updateUid;
            console.log(pathId.substr(0, 28), userUid, pathId.substr(28, 28))
            if (pathId.substr(0, 28) === userUid) {
                updateUid = pathId.substr(28, 28);
                console.log(updateUid);
            } else if (pathId.substr(28, 28) === userUid) {
                updateUid = pathId.substr(0, 28);
                console.log(updateUid);
            }
            notifyUser(updateUid, "message");
            return firestore.collection("users").doc(updateUid).collection("teams").doc(teamId).collection("unread").doc(pathId).set({
                unreadMessages: FieldValue.increment(1)
            }, { merge: true })
        } else {
            return console.log("No new direct messages with change");
        }
    });

exports.updateDirectFileCount = functions.firestore
    .document('teams/{teamId}/direct/{pathId}')
    .onWrite((change, context) => {
        console.log("change", change);
        console.log("context", context);
        console.log("teamId", context.params.teamId);
        if (change.after.data().lastFileId && change.after.data().lastFileId !== change.before.data().lastFileId) {
            var userUid = change.after.data().lastFileUid;
            var teamId = context.params.teamId;
            console.log("pathId", context.params.pathId);
            var pathId = context.params.pathId;
            return firestore.collection("teams").doc(teamId).collection("direct").doc(pathId).collection("members").get()
                .then(function (querySnapshot) {
                    console.log("members", querySnapshot.docs.map(doc => doc.id));
                    var members = querySnapshot.docs.map(doc => doc.data());
                    return members.forEach((member) => {
                        if (member.uid !== userUid) {
                            notifyUser(member.uid, "file");
                            return firestore.collection("users").doc(member.uid).collection("teams").doc(teamId).collection("unread").doc(pathId).set({
                                unreadFiles: FieldValue.increment(1)
                            }, { merge: true })
                        } else {
                            return console.log("Not updating user who posted");
                        }
                    })
                })
                .catch(function (error) {
                    return console.log("error", error);
                });
        } else {
            return console.log("No new direct Files with change");
        }
    });

exports.updateNoteCount = functions.firestore
    .document('teams/{teamId}/notes/{noteId}')
    .onCreate((snap, context) => {
        console.log("snap", snap);
        console.log("context", context);
        console.log("teamId", context.params.teamId);
        var userUid = snap.data().uid;
        var teamId = context.params.teamId;
        console.log("noteId", context.params.noteId);
        var noteId = context.params.noteId;
        return firestore.collection("teams").doc(teamId).collection("members").get()
            .then(function (querySnapshot) {
                console.log("members", querySnapshot.docs.map(doc => doc.id));
                var members = querySnapshot.docs.map(doc => doc.data());
                return members.forEach((member) => {
                    if (member.uid !== userUid) {
                        notifyUser(member.uid, "note");
                        return firestore.collection("users").doc(member.uid).collection("teams").doc(teamId).collection("unread").doc(noteId).set({
                            unreadNotes: FieldValue.increment(1)
                        }, { merge: true })
                    } else {
                        return console.log("Not updating user who posted");
                    }
                })
            })
            .catch(function (error) {
                return console.log("error", error);
            });
    });