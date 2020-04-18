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
                                    return querySnapshot.forEach(async(doc) => {
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
                    return members.forEach(function (member) {
                        if (member.uid !== userUid) {
                            console.log("memberUid?", member.uid);
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
