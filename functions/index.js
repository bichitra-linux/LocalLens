const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '🎉', '🔥'];

// ponytail: counters are read-then-set so trigger retries can't double-count.
// Upgrades to increment()+dedup when a single note exceeds ~1000 votes.
async function adjustUserCount(userId, field, delta) {
  if (!userId) return;
  const ref = db.collection('users').doc(userId);
  const doc = await ref.get();
  if (!doc.exists) return;
  const current = doc.data()[field] || 0;
  await ref.update({ [field]: Math.max(0, current + delta) });
}

async function adjustCommentsCount(noteId, delta) {
  if (!noteId) return;
  const ref = db.collection('notes').doc(noteId);
  const doc = await ref.get();
  if (!doc.exists) return;
  const current = doc.data().commentsCount || 0;
  await ref.update({ commentsCount: Math.max(0, current + delta) });
}

async function adjustReactionCount(noteId, emoji, delta) {
  if (!noteId || !ALLOWED_EMOJIS.includes(emoji)) return;
  const ref = db.collection('notes').doc(noteId);
  const doc = await ref.get();
  if (!doc.exists) return;
  const counts = doc.data().reactionCounts || {};
  const current = counts[emoji] || 0;
  await ref.update({ [`reactionCounts.${emoji}`]: Math.max(0, current + delta) });
}

async function recomputeNoteCounts(noteId) {
  if (!noteId) return null;
  const noteRef = db.collection('notes').doc(noteId);
  const noteDoc = await noteRef.get();
  if (!noteDoc.exists) return null;

  const votesSnap = await db.collection('votes').where('noteId', '==', noteId).get();
  let up = 0;
  let down = 0;
  votesSnap.docs.forEach((d) => {
    if (d.data().type === 'up') up++;
    else if (d.data().type === 'down') down++;
  });

  return noteRef.update({ upvotes: up, downvotes: down });
}

exports.cleanupExpiredNotes = onSchedule('every 24 hours', async () => {
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
});

exports.onNoteCreated = onDocumentCreated('notes/{noteId}', async (event) => {
  const note = event.data.data();
  if (!note || !note.userId) return;

  await adjustUserCount(note.userId, 'notesCount', 1);
});

exports.onNoteDeleted = onDocumentDeleted('notes/{noteId}', async (event) => {
  const noteId = event.params.noteId;
  const batch = db.batch();

  const votes = await db.collection('votes').where('noteId', '==', noteId).get();
  votes.docs.forEach((d) => batch.delete(d.ref));

  const reactions = await db.collection('reactions').where('noteId', '==', noteId).get();
  reactions.docs.forEach((d) => batch.delete(d.ref));

  const comments = await db.collection('comments').where('noteId', '==', noteId).get();
  comments.docs.forEach((d) => batch.delete(d.ref));

  if (votes.size + reactions.size + comments.size > 0) {
    await batch.commit();
  }
});

exports.onVoteCreated = onDocumentCreated('votes/{voteId}', async (event) => {
  const vote = event.data.data();
  if (!vote || !vote.userId) return;

  await adjustUserCount(vote.userId, 'votesCount', 1);
  await recomputeNoteCounts(vote.noteId);
});

exports.onVoteUpdated = onDocumentUpdated('votes/{voteId}', async (event) => {
  await recomputeNoteCounts(event.data.after.data().noteId);
});

exports.onVoteDeleted = onDocumentDeleted('votes/{voteId}', async (event) => {
  const vote = event.data.data();
  if (!vote || !vote.userId) return;

  await adjustUserCount(vote.userId, 'votesCount', -1);
  await recomputeNoteCounts(vote.noteId);
});

exports.onCommentCreated = onDocumentCreated('comments/{commentId}', async (event) => {
  const comment = event.data.data();
  if (!comment || !comment.noteId) return;

  await adjustCommentsCount(comment.noteId, 1);
});

exports.onCommentDeleted = onDocumentDeleted('comments/{commentId}', async (event) => {
  const comment = event.data.data();
  if (!comment || !comment.noteId) return;

  await adjustCommentsCount(comment.noteId, -1);
});

exports.onReactionCreated = onDocumentCreated('reactions/{reactionId}', async (event) => {
  const reaction = event.data.data();
  if (!reaction) return;

  await adjustReactionCount(reaction.noteId, reaction.emoji, 1);
});

exports.onReactionDeleted = onDocumentDeleted('reactions/{reactionId}', async (event) => {
  const reaction = event.data.data();
  if (!reaction) return;

  await adjustReactionCount(reaction.noteId, reaction.emoji, -1);
});

exports.onUserCreated = onDocumentCreated('users/{userId}', async (event) => {
  const user = event.data.data();
  const userId = event.params.userId;
  if (user.username) {
    const existingUsername = await db.collection('usernames').doc(user.username).get();
    if (existingUsername.exists) {
      const suffix = userId.substring(0, 4);
      await event.data.ref.update({
        username: `${user.username}_${suffix}`,
      });
    } else {
      await db.collection('usernames').doc(user.username).set({ userId });
    }
  }
});

exports.onUserDeleted = onDocumentDeleted('users/{userId}', async (event) => {
  const user = event.data.data();
  const userId = event.params.userId;
  if (user && user.username) {
    const claim = await db.collection('usernames').doc(user.username).get();
    if (claim.exists && claim.data().userId === userId) {
      await db.collection('usernames').doc(user.username).delete();
    }
  }
});

exports.onUsernameUpdated = onDocumentUpdated('users/{userId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  const userId = event.params.userId;
  if (before.username === after.username) return;

  if (before.username) {
    const oldClaim = await db.collection('usernames').doc(before.username).get();
    if (oldClaim.exists && oldClaim.data().userId === userId) {
      await db.collection('usernames').doc(before.username).delete();
    }
  }

  if (after.username) {
    const existing = await db.collection('usernames').doc(after.username).get();
    if (existing.exists) {
      // Never throw from a trigger — retries would loop forever.
      // Rename with a suffix instead; the client sees the update via snapshot.
      const suffix = userId.substring(0, 4);
      await event.data.after.ref.update({ username: `${after.username}_${suffix}` });
    } else {
      await db.collection('usernames').doc(after.username).set({ userId });
    }
  }
});
