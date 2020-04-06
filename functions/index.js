const functions = require('firebase-functions');
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();
const firestore = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
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
                                    return querySnapshot.forEach(function (doc) {
                                        console.log("Found member in pending for ", teamId);
                                        var pendingDocId = doc.id;
                                        return firestore.collection('teams').doc(teamId).collection('members').doc(uid).set({
                                            uid: uid,
                                            email: email,
                                            status: "Pending"
                                        }, { merge: true })
                                            .then(function () {
                                                return firestore.collection('users').doc(uid).collection('pendingTeams').doc(teamId).set({
                                                    id: teamId,
                                                }, { merge: true })
                                                    .then(function () {
                                                        return firestore.collection('teams').doc(teamId).collection('pendingMembers').doc(pendingDocId).delete();
                                                    })
                                            })
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

exports.pendingOnCreate = functions.firestore
    .document('teams/{teamId}/pendingMembers/{pendingMemberId}')
    .onWrite(async (change, context) => {
        console.log(change, context);
        console.log("teamId", context.params.teamId);
        console.log("pendingMemberId", context.params.pendingMemberId);
        var teamId = context.params.teamId;
        var pendingMemberId = context.params.pendingMemberId;
        try {
            const doc = await firestore.collection("teams").doc(teamId).collection("pendingMembers").doc(pendingMemberId).get();
            var pendingMemberEmail = doc.data().email;
            console.log("pendingMemberEmail", pendingMemberEmail);
            const querySnapshot = await firestore.collection("users").where('email', '==', pendingMemberEmail).get();
            if (!querySnapshot.empty) {
                return querySnapshot.forEach(async function (doc_1) {
                    var uid = doc_1.id;
                    await firestore.collection("teams").doc(teamId).collection("members").doc(uid).set({
                        uid: uid,
                        email: pendingMemberEmail,
                        status: "Pending"
                    }, { merge: true });
                    await firestore.collection('users').doc(uid).collection('pendingTeams').doc(teamId).set({
                        id: teamId,
                    }, { merge: true });
                    return firestore.collection('teams').doc(teamId).collection('pendingMembers').doc(pendingMemberId).delete();
                });
            }
            else {
                return console.log("Pending user does not have an account");
            }
        }
        catch (error) {
            return console.log("error", error);
        }
    })

exports.memberOnJoin = functions.firestore
    .document('teams/{teamId}/members/{memberId}')
    .onWrite((change, context) => {
        console.log("change.before.data()", change.before.data());
        console.log("change.after.data()", change.after.data());
        console.log("context", context);
        console.log("teamId", context.params.teamId);
        var teamId = context.params.teamId;
        console.log("memberId", context.params.memberId);
        var memberId = context.params.memberId;
        if (change.after.data() && change.before.data() && change.after.data().status === "Member" && change.after.data().status !== change.before.data().status) {
            return firestore.collection("teams").doc(teamId).collection("groups").where("name", "==", "Everyone").get()
                .then(function (querySnapshot) {
                    return querySnapshot.forEach(async function (doc) {
                        var groupId = doc.id;
                        return firestore.collection("teams").doc(teamId).collection("groups").doc(groupId).collection("members").doc(memberId).set({
                            uid: memberId,
                            status: "Member"
                        }, { merge: true });
                    })
                })
                .catch(function (error) {
                    return console.log("error", error);
                });
        } else {
            return console.log("Will deal with other events differently...");
        }
    });

exports.groupMemberOnJoin = functions.firestore
    .document('teams/{teamId}/groups/{groupId}/members/{memberId}')
    .onCreate((snapshot, context) => {
        console.log("snapshot", snapshot);
        console.log("context", context);
        console.log("teamId", context.params.teamId);
        var teamId = context.params.teamId;
        console.log("groupId", context.params.groupId);
        var groupId = context.params.groupId;
        console.log("memberId", context.params.memberId);
        var memberId = context.params.memberId;
        return firestore.collection("users").doc(memberId).collection("teams").doc(teamId).collection("groups").doc(groupId).set({
            id: groupId
        }, { merge: true })
            .then(function () {
                return console.log("Added group reference for ", groupId, " to the user profile of ", memberId);
            })
            .catch(function (error) {
                return console.log("error", error);
            })
    });

exports.groupMemberOnRemove = functions.firestore
    .document('teams/{teamId}/groups/{groupId}/members/{memberId}')
    .onDelete((snapshot, context) => {
        console.log("snapshot", snapshot);
        console.log("context", context);
        console.log("teamId", context.params.teamId);
        var teamId = context.params.teamId;
        console.log("groupId", context.params.groupId);
        var groupId = context.params.groupId;
        console.log("memberId", context.params.memberId);
        var memberId = context.params.memberId;
        return firestore.collection("users").doc(memberId).collection("teams").doc(teamId).collection("groups").doc(groupId).delete()
            .then(function () {
                return console.log("Removed group reference for ", groupId, " from the user profile of ", memberId);
            })
            .catch(function (error) {
                return console.log("error", error);
            })
    });

exports.memberOnRemove = functions.firestore
    .document('teams/{teamId}/members/{memberId}')
    .onDelete(async (change, context) => {
        console.log(change, context);
        console.log("context", context);
        console.log("teamId", context.params.teamId);
        var teamId = context.params.teamId;
        console.log("memberId", context.params.memberId);
        var memberId = context.params.memberId;
        try {
            const querySnapshot = await firestore.collection("teams").doc(teamId).collection("groups").get();
            return querySnapshot.forEach(async function (doc) {
                var groupId = doc.id;
                const querySnapshot_1 = await firestore.collection("teams").doc(teamId).collection("groups").doc(groupId).collection("members").where("uid", "==", memberId).get()
                if (!querySnapshot_1.empty) {
                    await firestore.collection("teams").doc(teamId).collection("groups").doc(groupId).set({
                        memberCount: FieldValue.increment(-1)
                    }, { merge: true });
                    await firestore.collection("teams").doc(teamId).collection("groups").doc(groupId).collection("members").doc(memberId).delete();
                }
                else {
                    console.log("member not in this group", groupId);
                }
                await firestore.collection("users").doc(memberId).set({
                    lastTeam: FieldValue.delete()
                }, { merge: true });
                return firestore.collection("users").doc(memberId).collection("teams").doc(teamId).delete();
            });
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
                    return members.forEach(function (member) {
                        if (member.uid !== userUid) {
                            console.log("memberid?", member.uid);
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
                    return members.forEach(function (member) {
                        if (member.uid !== userUid) {
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
            return firestore.collection("teams").doc(teamId).collection("direct").doc(pathId).collection("members").get()
                .then(function (querySnapshot) {
                    console.log("members", querySnapshot.docs.map(doc => doc.id));
                    var members = querySnapshot.docs.map(doc => doc.data());
                    return members.forEach(function (member) {
                        if (member.uid !== userUid) {
                            return firestore.collection("users").doc(member.uid).collection("teams").doc(teamId).collection("unread").doc(pathId).set({
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
                    return members.forEach(function (member) {
                        if (member.uid !== userUid) {
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
