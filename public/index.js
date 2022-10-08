import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  connectFirestoreEmulator,
} from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js';
import {
  displayLocalMediaStream,
  offerPeerConnection,
  answerPeerConnection,
  completePeerConnection,
  receiveRemoteIceCandidate,
  disconnectPeerConnection,
} from './webrtc.js';

initializeApp({
  apiKey: 'AIzaSyCX5lnUCYAq63ERmBk-j0X9LuvQnULIzKw',
  authDomain: 'video-conference-app-634cc.firebaseapp.com',
  projectId: 'video-conference-app-634cc',
  storageBucket: 'video-conference-app-634cc.appspot.com',
  messagingSenderId: '960527121460',
  appId: '1:960527121460:web:200a93c9f77909714d1e61',
});
const db = getFirestore();
let leaveCallFunctionUrl = 'https://us-central1-video-conference-app-634cc.cloudfunctions.net/leaveCall';

if (location.hostname === 'localhost') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  leaveCallFunctionUrl = 'http://localhost:5001/video-conference-app-634cc/us-central1/leaveCall';
}

(async () => {
  const params = new URLSearchParams(location.search);
  const callId = params.get('callid');
  if (!callId) {
    return;
  }

  await displayLocalMediaStream();
  const participantsRef = collection(db, 'calls', callId, 'participants');
  const participantRef = await addDoc(participantsRef, {});
  const peersRef = collection(participantRef, 'peers');
  const candidatesRef = collection(participantRef, 'candidates');

  const $leaveButton = document.querySelector('.leave-call');
  $leaveButton?.addEventListener('click', async () => {
    await deleteDoc(participantRef);
    window.close();
  });
  window.addEventListener('beforeunload', () => {
    navigator.sendBeacon(
      leaveCallFunctionUrl,
      JSON.stringify({
        callid: callId,
        participantid: participantRef.id,
      })
    );
  });

  onSnapshot(peersRef, async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type === 'added') {
        const data = change.doc.data();
        if (data.offer) {
          const answer = await answerPeerConnection(change.doc.id, data.offer, {
            async onIceCandidate(candidate) {
              await addDoc(collection(participantsRef, change.doc.id, 'candidates'), {
                candidate,
                peerId: participantRef.id,
              });
            },
            async onDisconnect() {
              await deleteDoc(doc(peersRef, change.doc.id));
            },
          });
          await setDoc(doc(participantsRef, change.doc.id, 'peers', participantRef.id), { answer });
        } else if (data.answer) {
          await completePeerConnection(change.doc.id, data.answer);
        }
      }
    }
  });
  onSnapshot(candidatesRef, async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type === 'added') {
        const { peerId, candidate } = change.doc.data();
        await receiveRemoteIceCandidate(peerId, candidate);
      }
    }
  });
  onSnapshot(participantsRef, async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type === 'removed') {
        disconnectPeerConnection(change.doc.id);
      }
    }
  });

  const participants = await getDocs(participantsRef);
  for (const participantDoc of participants.docs) {
    if (participantDoc.id !== participantRef.id) {
      const offer = await offerPeerConnection(participantDoc.id, {
        async onIceCandidate(candidate) {
          await addDoc(collection(participantsRef, participantDoc.id, 'candidates'), {
            candidate,
            peerId: participantRef.id,
          });
        },
      });
      await setDoc(doc(participantDoc.ref, 'peers', participantRef.id), { offer });
    }
  }
})();
