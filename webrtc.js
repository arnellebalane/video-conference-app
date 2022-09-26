const $participants = document.querySelector('.participants');
const peerConnections = {};
let mediaStream;

export async function offerPeerConnection(peerId, options) {
  const peerConnection = createPeerConnection();
  peerConnections[peerId] = peerConnection;
  addMediaStreamToPeerConnection(peerConnection, mediaStream);
  attachPeerConnectionListeners(peerConnection, options);
  const offer = await createSessionDescriptionOffer(peerConnection);
  return offer.toJSON();
}

export async function answerPeerConnection(peerId, offer, options) {
  const peerConnection = createPeerConnection();
  peerConnections[peerId] = peerConnection;
  addMediaStreamToPeerConnection(peerConnection, mediaStream);
  attachPeerConnectionListeners(peerConnection, options);
  receiveRemoteSessionDescription(peerConnection, offer);
  const answer = await createSessionDescriptionAnswer(peerConnection);
  return answer.toJSON();
}

export async function completePeerConnection(peerId, answer) {
  const peerConnection = peerConnections[peerId];
  await receiveRemoteSessionDescription(peerConnection, answer);
}

export async function displayLocalMediaStream() {
  mediaStream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: 1920,
      height: 1080,
    },
    audio: true,
  });
  displayMediaStream(mediaStream, { muted: true });
}

export async function receiveRemoteIceCandidate(peerId, candidate) {
  const peerConnection = peerConnections[peerId];
  await peerConnection.addIceCandidate(candidate);
}

function createPeerConnection() {
  return new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
          'stun:stun3.l.google.com:19302',
          'stun:stun4.l.google.com:19302',
        ],
      },
    ],
  });
}

function displayMediaStream(mediaStream, options) {
  const video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;
  video.srcObject = mediaStream;
  video.muted = options?.muted ?? false;
  $participants.append(video);
}

function attachPeerConnectionListeners(peerConnection, options) {
  peerConnection.addEventListener('icecandidate', ({ candidate }) => {
    if (candidate) {
      if (typeof options?.onIceCandidate === 'function') {
        options.onIceCandidate(candidate.toJSON());
      }
    }
  });
  peerConnection.addEventListener('track', ({ streams, track }) => {
    if ((streams?.length ?? 0) > 0 && track.kind === 'video') {
      displayMediaStream(streams[0]);
    }
  });
}

function addMediaStreamToPeerConnection(peerConnection, mediaStream) {
  mediaStream.getTracks().forEach((mediaStreamTrack) => {
    peerConnection.addTrack(mediaStreamTrack, mediaStream);
  });
}

async function createSessionDescriptionOffer(peerConnection) {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  return offer;
}

async function createSessionDescriptionAnswer(peerConnection) {
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  return answer;
}

async function receiveRemoteSessionDescription(peerConnection, sessionDescription) {
  await peerConnection.setRemoteDescription(sessionDescription);
}
