const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

exports.cleanupExpiredNotes = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  const now = admin.firestore.Timestamp.now();

  const expiredNotes = await db.collection('notes')
    .where('expiresAt', '<', now)
    .where('isActive', '==', true)
    .get();

  let deletedCount = 0;
  const batch = db.batch();
  const batchSize = 500;

  for (const doc of expiredNotes.docs) {
    batch.update(doc.ref, { isActive: false });
    deletedCount++;

    if (deletedCount % batchSize === 0) {
      await batch.commit();
    }
  }

  if (deletedCount % batchSize !== 0) {
    await batch.commit();
  }

  console.log(`Cleaned up ${deletedCount} expired notes`);
  return null;
});

exports.onNoteCreated = functions.firestore
  .document('notes/{noteId}')
  .onCreate(async (snap, context) => {
    const note = snap.data();

    await db.collection('users').doc(note.userId).update({
      notesCount: admin.firestore.FieldValue.increment(1),
    });
  });

exports.onNoteDeleted = functions.firestore
  .document('notes/{noteId}')
  .onDelete(async (snap, context) => {
    const votesSnapshot = await db.collection('votes')
      .where('noteId', '==', context.params.noteId)
      .get();

    const batch = db.batch();
    votesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    if (!votesSnapshot.empty) {
      await batch.commit();
    }
  });

exports.onVoteCreated = functions.firestore
  .document('votes/{voteId}')
  .onCreate(async (snap, context) => {
    const vote = snap.data();
    const userRef = db.collection('users').doc(vote.userId);

    await userRef.update({
      votesCount: admin.firestore.FieldValue.increment(1),
    });
  });

exports.onVoteDeleted = functions.firestore
  .document('votes/{voteId}')
  .onDelete(async (snap, context) => {
    const vote = snap.data();
    const userRef = db.collection('users').doc(vote.userId);

    const userDoc = await userRef.get();
    if (userDoc.exists && userDoc.data().votesCount > 0) {
      await userRef.update({
        votesCount: admin.firestore.FieldValue.increment(-1),
      });
    }
  });

exports.onReactionCreated = functions.firestore
  .document('reactions/{reactionId}')
  .onCreate(async (snap, context) => {
    const reaction = snap.data();
    const noteRef = db.collection('notes').doc(reaction.noteId);
    await noteRef.update({
      [`reactionCounts.${reaction.emoji}`]: admin.firestore.FieldValue.increment(1),
    });
  });

exports.onReactionDeleted = functions.firestore
  .document('reactions/{reactionId}')
  .onDelete(async (snap, context) => {
    const reaction = snap.data();
    const noteRef = db.collection('notes').doc(reaction.noteId);
    await noteRef.update({
      [`reactionCounts.${reaction.emoji}`]: admin.firestore.FieldValue.increment(-1),
    });
  });

exports.onUserCreated = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const user = snap.data();
    if (user.username) {
      const existingUsername = await db.collection('usernames').doc(user.username).get();
      if (existingUsername.exists) {
        const suffix = context.params.userId.substring(0, 4);
        await snap.ref.update({
          username: `${user.username}_${suffix}`,
        });
      } else {
        await db.collection('usernames').doc(user.username).set({ userId: context.params.userId });
      }
    }
  });

exports.onUserDeleted = functions.firestore
  .document('users/{userId}')
  .onDelete(async (snap, context) => {
    const user = snap.data();
    if (user.username) {
      await db.collection('usernames').doc(user.username).delete();
    }
  });

exports.onUsernameUpdated = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.username !== after.username) {
      if (before.username) {
        await db.collection('usernames').doc(before.username).delete();
      }
      if (after.username) {
        const existing = await db.collection('usernames').doc(after.username).get();
        if (existing.exists) {
          throw new functions.https.HttpsError('already-exists', 'Username already taken');
        }
        await db.collection('usernames').doc(after.username).set({ userId: context.params.userId });
      }
    }
  });
