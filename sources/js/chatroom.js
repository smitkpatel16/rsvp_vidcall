"use strict";
var chatSocket = null;
var chatId = null;
var personName = null;
var videoElement = null;
var localStream = null;
var personID = null;
var peers = {};
var image = null;
var inboundStreams = {};
const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};
var peerConnectionConfig = {
  'iceServers': [
    {
      urls: "stun:stun.services.mozilla.com",
      username: "louis@mozilla.com",
      credential: "webrtcdemo"
    },
    {
      urls: 'stun:stun.l.google.com:19302'
    },
    {
      urls: 'stun:rsvplightsail.in:3478'
    },
    {
      urls: "turn:rsvplightsail.in:3478",
      username: "test",
      credential: "test123"
    }
  ]
};
var PeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
var IceCandidate = window.RTCIceCandidate || window.RTCIceCandidate;
var SessionDescription = window.RTCSessionDescription || window.RTCSessionDescription;
navigator.getUserMedia = navigator.getUserMedia || navigator.mediaDevices.getUserMedia || navigator.webkitGetUserMedia;

function getChatID() {
  var url_string = window.location.href;
  var u = new URL(url_string);
  var c = u.searchParams.get("id");
  var el = document.getElementById("chatID");
  el.value = c;
  // getDevices().then(gotDevices);
  joinAVI();
}
function chatCollapse() {
  showStyle = "height: 50vh; overflow-y: scroll; border: 1px solid #333333;"
  var txtBlock = document.getElementById("chatMessages");
  if (txtBlock.style['cssText'] === "display: none;") {
    txtBlock.style = showStyle;
  }
  else {

    txtBlock.style = "display: none;";

  }
}
function joinChat() {
  var el = document.getElementById("chatID");
  chatId = el.value;
  el = document.getElementById("personName");
  personName = el.value;
  if (chatId && personName) {
    if (chatSocket) {
      chatSocket.close();
    }
    window.history.pushState("", "", location.protocol + '//' + location.host + location.pathname + "?id=" + chatId);
    var wsURL = "ws://" + window.location.host + "/chatsocket";
    console.log(window.location.host);
    chatSocket = new WebSocket(wsURL);
    chatSocket.onopen = function (evt) { onOpen(evt) };
    chatSocket.onclose = function (evt) { onClose(evt) };
    chatSocket.onmessage = function (evt) { onMessage(evt) };
    chatSocket.onerror = function (evt) { onError(evt) };
  }
  else {
    if (!personName && !chatId) {
      alert("Enter Name and Chat ID")
    }
    else {
      if (!personName) {
        alert("Enter Name")
      }
      else {
        if (!chatId) {
          alert("Enter Chat ID")
        }
      }
    }

  }
}

function sendMessage() {
  var el = document.getElementById("textMessage");
  if (el.value.trim() || image) {
    var obj = {};
    obj['chatID'] = chatId;
    obj['personName'] = personName;
    obj['messageType'] = 'text';
    obj['image'] = image;
    obj['message'] = el.value.trim();
    chatSocket.send(JSON.stringify(obj));
    el.value = "";
    cancelImage();
  }
  else {
    alert("Please enter a message");
  }
}
function onOpen(evt) {
  var el = document.getElementById("textMessage");
  el.removeAttribute("disabled");
  el = document.getElementById("sendMessage");
  el.removeAttribute("disabled");
  var obj = {};
  obj['joinChat'] = chatId;
  obj['personName'] = personName
  chatSocket.send(JSON.stringify(obj));
}
function joinAVI() {
  videoElement = document.getElementById('local');
  getStream().then(gotStream);
}

function stopAVI() {
  localStream.getTracks().forEach(track => {
    track.stop();
  });
}

function getStream() {
  const constraints = {
    audio: true,
    video: true
  };
  return navigator.mediaDevices.getUserMedia(constraints);
}
function updateUnreadCount() {
  var str = document.getElementById("sidebar-wrapper");
  if (!str.className.includes("show")) {
    var badge = document.getElementById("badge");
    var badgeCount = parseInt(badge.innerHTML);
    badgeCount = badgeCount + 1;
    badge.innerHTML = badgeCount;
  }
}
function removeUnreadCount() {
  var badge = document.getElementById("badge");
  badge.innerHTML = 0;
}
function gotStream(stream) {
  if (localStream) {
    stopAVI();
  }
  localStream = stream; // make stream available to console
  // audioSelect.selectedIndex = [...audioSelect.options].
  //   findIndex(option => option.text === stream.getAudioTracks()[0].label);
  // videoSelect.selectedIndex = [...videoSelect.options].
  //   findIndex(option => option.text === stream.getVideoTracks()[0].label);
  videoElement.srcObject = stream;
}

async function sendStream(peerId) {
  if (localStream) {
    peers[peerId].getSenders().forEach(sender => { console.log("Removing track"); console.log(peers[peerId]); peers[peerId].removeTrack(sender); })
    localStream.getTracks().forEach(track => { console.log("Adding track"); console.log(peers[peerId]); peers[peerId].addTrack(track); });
  }
}

function getDevices() {
  // AFAICT in Safari this only gets default devices until gUM is called :/
  return navigator.mediaDevices.enumerateDevices();
}

// function gotDevices(deviceInfos) {
//   window.deviceInfos = deviceInfos; // make available to console
//   for (const deviceInfo of deviceInfos) {
//     const option = document.createElement('option');
//     option.value = deviceInfo.deviceId;
//     if (deviceInfo.kind === 'audioinput') {
//       option.text = deviceInfo.label || `Microphone ${audioSelect.length + 1}`;
//       audioSelect.appendChild(option);
//     } else if (deviceInfo.kind === 'videoinput') {
//       option.text = deviceInfo.label || `Camera ${videoSelect.length + 1}`;
//       videoSelect.appendChild(option);
//     }
//   }
// }

function onMessage(evt) {
  handleConference(evt.data).then(value => { console.log(value) });
}
function onError(evt) {
  console.log(evt);
}
function onClose(evt) {
  console.log("Chat Closed");
}
function cancelImage() {
  var output = document.getElementById('uploadImage');
  var cancel = document.getElementById('cancel');
  image = null;
  $('#uploadImage').val('');
  output.style = "display: none;"
  cancel.style = "display: none;"

}
var openImage = function (file) {
  var input = file.target;

  var reader = new FileReader();
  reader.onload = function () {
    var dataURL = reader.result;
    var output = document.getElementById('uploadImage');
    var cancel = document.getElementById('cancel');
    $("#file-input").val(null);
    output.src = dataURL;
    image = dataURL;
    output.style = "height:100px; width:100px;"
    cancel.style = "font-size:24px;color:red;background-color: Transparent;outline:none;"
  };
  reader.readAsDataURL(input.files[0]);
};
async function handleConference(messageStream) {
  var dataObj = JSON.parse(messageStream);
  if (dataObj['messageType'] == 'text') {
    var txtBlock = document.getElementById("chatMessages");
    var div = document.createElement("div");
    var b = document.createElement("b");
    var pre = document.createElement("pre");
    div.style = "border: 1px solid #eeeeee; background-color:rgba(00,00, 00, 0.3); color: #fff;";
    b.innerHTML = dataObj['messagePersonName'];
    pre.innerHTML = dataObj["message"];
    pre.style = "margin-bottom: 0; background-color:rgba(00,00, 00, 0.3); color: #fff;"
    div.append(b);
    if (dataObj["image"]) {
      var img = document.createElement("img");
      div.style = "border: 1px solid #eeeeee; background-color:rgba(00,00, 00, 0.3); color: #fff;";
      img.src = dataObj["image"];
      img.style = "width=90vw"
      div.append(img);
    }
    div.append(pre);
    txtBlock.append(div);
    txtBlock.scrollTop = txtBlock.scrollHeight;
    updateUnreadCount();
  }
  if (dataObj['messageType'] == 'init') {
    var el = document.getElementById("peopleInChat");
    while (el.firstChild) {
      el.removeChild(el.lastChild)
    }
    for (var person of dataObj['people']) {
      var div = document.createElement("div");
      div.innerHTML = person;
      el.appendChild(div);
    }
    personID = dataObj['id'];
    if (dataObj['lastPeer'] != personID) {
      peers[dataObj['lastPeer']] = await newPeerConnection(dataObj['lastPeer']);
      await createPeerOffer(dataObj['lastPeer']);
    }
  }
  if (dataObj["messageType"] == "pause") {
    var el = document.getElementById(dataObj["peerId"]);
    if (dataObj["enabled"]) {
      if (dataObj["peerId"].includes("mute")) {
        el.className = "fas fa-microphone-alt";
      }
      else {
        el.className = "fas fa-video";
      }
    }
    else {
      if (dataObj["peerId"].includes("mute")) {
        el.className = "fas fa-microphone-alt-slash";
      }
      else {
        el.className = "fas fa-video-slash";
      }
    }
  }
  if (dataObj['messageType'] == 'remove') {
    if (dataObj['peerId'] in peers) {
      delete peers[dataObj['peerId']];
      delete inboundStreams[dataObj['peerId']]
      var el = document.getElementById("peopleInChat");
      while (el.firstChild) {
        el.removeChild(el.lastChild)
      }
      for (var person of dataObj['people']) {
        var div = document.createElement("div");
        div.innerHTML = person;
        el.appendChild(div);
      }
      var element = document.getElementById(dataObj['peerId']);
      element.parentNode.removeChild(element);
      element = document.getElementById(dataObj['peerId'] + "div");
      element.parentNode.removeChild(element);
      adjustPeerVidDisplay();
    }
  }
  if (dataObj['messageType'] == 'offer') {
    await receiveOffer(dataObj);
  }
  if (dataObj['messageType'] == 'response') {
    await receiveAnswer(dataObj);
  }
  if (dataObj['messageType'] == 'negotiate') {
    await negotiate(dataObj);
  }
  if (dataObj['messageType'] == 'ice') {
    await iceCandidateNeg(dataObj);
  }
  if (dataObj['messageType'] == 'requestMedia') {
    await sendStream(dataObj['peerId']);
  }
  return "Done";
}
function closeChat() {
  chatSocket.close();
}
function fail() {
  console.log("Failed");
}

function adjustPeerVidDisplay() {
  var aviDiv = document.getElementById("avi");
  var classNames = [];
  switch (aviDiv.children.length) {
    case 1:
      classNames = ["col-12"];
      break;
    case 2:
      classNames = ["col-6", "col-6"];
      break;
    case 3:
      classNames = ["col-6", "col-6", "col-12"];
      break;
    case 4:
      classNames = ["col-6", "col-6", "col-6", "col-6"];
      break;
    case 5:
      classNames = ["col-4", "col-4", "col-4", "col-6", "col-6"];
      break;
    default:
      for (var i = 0; i < aviDiv.children.length; i++) {
        classNames.push("col-4");
      }
  }
  for (var i = 0; i < aviDiv.children.length; i++) {
    aviDiv.children[i].className = classNames[i];
  }
}

function addPeerVid(peerId) {
  var div = document.createElement("div");
  var vidElement = document.createElement("video");
  var aviDiv = document.getElementById("avi");
  var ivid = document.createElement("i");
  var iaud = document.createElement("i");
  var smallDiv = document.createElement("div");

  div.setAttribute("id", peerId + "div");
  div.appendChild(vidElement);
  aviDiv.appendChild(div);

  adjustPeerVidDisplay();
  vidElement.setAttribute("id", peerId);
  vidElement.autoplay = true;

  ivid.className = "fas fa-video";
  ivid.style = "font-size:24px;color:red;";
  ivid.setAttribute("id", peerId + "stop");

  iaud.className = "fas fa-microphone-alt";
  iaud.style = "font-size:24px;color:red;";
  iaud.setAttribute("id", peerId + "mute");

  smallDiv.appendChild(ivid);
  smallDiv.appendChild(iaud);
  div.appendChild(smallDiv);
  smallDiv.className = "overlayshow";
}

async function newPeerConnection(peerId) {
  var tempPeer = new PeerConnection(peerConnectionConfig);
  addPeerVid(peerId);
  tempPeer.peerId = peerId;
  tempPeer.negotiating = false;
  tempPeer.mrsent = false;
  tempPeer.onicecandidate = iceCandidateNeg;
  tempPeer.onnegotiationneeded = negotiate;
  tempPeer.ontrack = function (event) {
    $('#' + peerId).attachTrack(event);
  }
  return tempPeer;
}

async function createPeerOffer(peerId) {
  if (peerId != personID) {
    peers[peerId].negotiating = true;
    var offer = await peers[peerId].createOffer();
    await peers[peerId].setLocalDescription(offer);
    var obj = {};
    obj["messageType"] = "offer";
    obj["offer"] = offer;
    obj["peerId"] = peerId;
    obj['chatID'] = chatId;
    chatSocket.send(JSON.stringify(obj));
  }
}
async function iceCandidateNeg(event) {
  if (event && event.iceCandidate) {
    var peerId = event.peerId;
    var peerConnection = peers[peerId];
    if (event.iceCandidate) {
      try {
        await peerConnection.addIceCandidate(new IceCandidate(event.iceCandidate));
        console.log('ICE state: ', peerConnection.iceConnectionState)
        // if (peerConnection.iceConnectionState == "connected") {
        //   await sendStream(event.peerId);
        // }
      }
      catch (err) {
        console.log('ICE error: ', err)
        console.log(event.iceCandidate);
        if (!iceQueue[peerConnection.peerId]) {
          iceQueue[peerConnection.peerId] = [event.iceCandidate];
        }
        else {
          iceQueue[peerConnection.peerId].push(event.iceCandidate);
        }
      }
    }
  }
  else {
    if (event.candidate) {
      if (event.target) {
        var peerId = event.target.peerId;
        var obj = {};
        obj["messageType"] = "ice";
        obj["iceCandidate"] = event.candidate;
        obj['chatID'] = chatId;
        obj["peerId"] = peerId;
        chatSocket.send(JSON.stringify(obj));
      }
    }
    // else {
    //   if (event.target) {
    //     await sendStream(event.target.peerId);
    //   }
    // }
  }
}

async function receiveOffer(peerOffer) {
  if (!(peerOffer['peerId'] in peers)) {
    peers[peerOffer['peerId']] = await newPeerConnection(peerOffer['peerId']);
    // await sendStream(peerOffer['peerId']);
  }
  if (!peerOffer['peerId'].negotiating) {
    peers[peerOffer['peerId']].negotiating = true;
    await peers[peerOffer['peerId']].setRemoteDescription(peerOffer['offer'])
    var answer = await peers[peerOffer['peerId']].createAnswer()
    await peers[peerOffer['peerId']].setLocalDescription(answer)
    var obj = {};
    obj["messageType"] = "response";
    obj["answer"] = answer;
    obj["peerId"] = peerOffer['peerId'];
    obj['chatID'] = chatId;
    chatSocket.send(JSON.stringify(obj));
    peers[peerOffer['peerId']].negotiating = false;
  }
}

async function receiveAnswer(peerAnswer) {
  if (peers[peerAnswer['peerId']].negotiating) {
    await peers[peerAnswer['peerId']].setRemoteDescription(peerAnswer['answer']);
    peers[peerAnswer['peerId']].negotiating = false;
    // while (iceQueue[peerAnswer['peerId']] && iceQueue[peerAnswer['peerId']].length) {
    //   await peerConnection.addIceCandidate(new IceCandidate(iceQueue[peerAnswer['peerId']].pop()));
    // }
    if (!peers[peerAnswer['peerId']].mrsent) {
      peers[peerAnswer['peerId']].mrsent = true;
      var obj = {};
      obj["messageType"] = "requestMedia";
      obj["peerId"] = peerAnswer['peerId'];
      obj['chatID'] = chatId;
      chatSocket.send(JSON.stringify(obj));
    }
  }
  // await sendStream(peerAnswer['peerId']);
  // sendStream(peerAnswer['peerId']);
  // var obj = {}
  // obj["messageType"] = "requestMedia";
  // obj["peerId"] = peerAnswer['peerId'];
  // obj['chatID'] = chatId;
  // chatSocket.send(JSON.stringify(obj));
}

function muteMe() {
  if (localStream) {
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
  }
  var el = document.getElementById("mute");
  var obj = {}
  obj["chatID"] = chatId;
  obj["peerId"] = personID + "mute";
  obj["enabled"] = localStream.getAudioTracks()[0].enabled;
  obj["messageType"] = "pause";
  if (!localStream.getAudioTracks()[0].enabled) {
    el.className = "fas fa-microphone-alt-slash";
  }
  else {
    el.className = "fas fa-microphone-alt";
  }
  chatSocket.send(JSON.stringify(obj));
}

function stopVideo() {
  if (localStream) {
    localStream.getVideoTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
  }
  var obj = {}
  obj["chatID"] = chatId;
  obj["peerId"] = personID + "stop";
  obj["enabled"] = localStream.getVideoTracks()[0].enabled;
  obj["messageType"] = "pause";
  var el = document.getElementById("stop");
  if (!localStream.getVideoTracks()[0].enabled) {
    el.className = "fas fa-video-slash";
  }
  else {
    el.className = "fas fa-video";
  }
  chatSocket.send(JSON.stringify(obj));
}

async function negotiate(event) {
  if (event.target) {
    var peerConnection = peers[event.target.peerId];
    if (!peerConnection.negotiating) {
      await createPeerOffer(event.target.peerId);
    }
  }
}

jQuery.fn.attachTrack = function (ev) {
  this.each(function () {
    console.log("track received");
    console.log(ev);
    // if (ev.streams && ev.streams[0]) {
    //   this.srcObject = ev.streams[0];
    // }
    // else {
    if (!inboundStreams[this.id]) {
      inboundStreams[this.id] = new MediaStream();
    }
    inboundStreams[this.id].addTrack(ev.track);
    console.log("Stream Added");
    this.srcObject = inboundStreams[this.id];
  });
}
window.addEventListener("load", getChatID, false);