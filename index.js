const signalling = new BroadcastChannel('signalling');
const peerConnection = new RTCPeerConnection();
const $participants = document.querySelector('.participants');

const $startCall = document.querySelector('.start-call');
$startCall.addEventListener('click', startCall);

peerConnection.addEventListener('icecandidate', ({ candidate }) => {
  if (candidate) {
    sendLocalIceCandidateToRemote(candidate);
  }
});
peerConnection.addEventListener('track', ({ streams, track }) => {
  if ((streams?.length ?? 0) > 0 && track.kind === 'video') {
    displayMediaStream(streams[0]);
  }
});

signalling.addEventListener('message', async (event) => {
  const { type, payload } = event.data;
  if (type === 'offer') {
    await receiveRemoteSessionDescription(payload);
    const mediaStream = await displayLocalMediaStream();
    addMediaStreamToPeerConnection(mediaStream);
    const answer = await createSessionDescriptionAnswer();
    console.log(answer.sdp);
    await sendLocalSessionDescriptionToRemote(answer);
  } else if (type === 'answer') {
    await receiveRemoteSessionDescription(payload);
  } else if (type === 'candidate') {
    await receiveRemoteIceCandidate(payload);
  }
});

async function startCall() {
  const mediaStream = await displayLocalMediaStream();
  addMediaStreamToPeerConnection(mediaStream);
  const offer = await createSessionDescriptionOffer();
  console.log(offer.sdp);
  await sendLocalSessionDescriptionToRemote(offer);
}

async function displayLocalMediaStream() {
  const mediaStream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: 1920,
      height: 1080,
    },
    audio: true,
  });
  displayMediaStream(mediaStream);
  return mediaStream;
}

function displayMediaStream(mediaStream) {
  const video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;
  video.srcObject = mediaStream;
  $participants.append(video);
}

function addMediaStreamToPeerConnection(mediaStream) {
  mediaStream.getTracks().forEach((mediaStreamTrack) => {
    peerConnection.addTrack(mediaStreamTrack, mediaStream);
  });
}

async function createSessionDescriptionOffer() {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  return offer;
}

async function createSessionDescriptionAnswer() {
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  return answer;
}

async function receiveRemoteSessionDescription(sessionDescription) {
  await peerConnection.setRemoteDescription(sessionDescription);
}

async function sendLocalSessionDescriptionToRemote(sessionDescription) {
  signalling.postMessage({
    type: sessionDescription.type,
    payload: sessionDescription.toJSON(),
  });
}

async function receiveRemoteIceCandidate(iceCandidate) {
  peerConnection.addIceCandidate(iceCandidate);
}

async function sendLocalIceCandidateToRemote(iceCandidate) {
  signalling.postMessage({
    type: 'candidate',
    payload: iceCandidate.toJSON(),
  });
}
