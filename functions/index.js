const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.leaveCall = functions.https.onRequest(async (request, response) => {
  const { callid, participantid } = JSON.parse(request.body);
  await admin.firestore().doc(`calls/${callid}/participants/${participantid}`).delete();
  response.end();
});
