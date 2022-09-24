const signalling = new BroadcastChannel('signalling');
const peerConnection = new RTCPeerConnection();
const $participants = document.querySelector('.participants');

peerConnection.addEventListener('icecandidate', ({ candidate }) => {
  if (candidate) {
    signalling.postMessage({ type: 'candidate', payload: candidate.toJSON() });
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
    peerConnection.setRemoteDescription(payload);
    const mediaStream = await initializeUserMedia();
    displayMediaStream(mediaStream);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    signalling.postMessage({ type: 'answer', payload: answer.toJSON() });
  } else if (type === 'answer') {
    await peerConnection.setRemoteDescription(payload);
  } else if (type === 'candidate') {
    await peerConnection.addIceCandidate(payload);
  }
});

async function initializeUserMedia() {
  const mediaStream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: 1920,
      height: 1080,
    },
    audio: true,
  });
  mediaStream.getTracks().forEach((mediaStreamTrack) => {
    peerConnection.addTrack(mediaStreamTrack, mediaStream);
  });
  return mediaStream;
}

async function displayMediaStream(mediaStream) {
  const video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;
  video.srcObject = mediaStream;
  $participants.append(video);
}

async function startCall() {
  const mediaStream = await initializeUserMedia();
  displayMediaStream(mediaStream);
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  signalling.postMessage({ type: 'offer', payload: offer.toJSON() });
}

window.startCall = startCall;
