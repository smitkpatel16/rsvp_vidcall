var chatSocket = null;
var chatId = null;
var personName = null;
var audioSelect = null;
var videoSelect = null;
var videoElement = null;
var localStream = null;
var personID = null;
var peers = {};
var peerConnectionConfig = { 'iceServers': [{ 'url': 'stun:stun.services.mozilla.com' }, { 'url': 'stun:stun.l.google.com:19302' }] };
var PeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
var IceCandidate = window.RTCIceCandidate || window.RTCIceCandidate;
var SessionDescription = window.RTCSessionDescription || window.RTCSessionDescription;
navigator.getUserMedia = navigator.getUserMedia || navigator.mediaDevices.getUserMedia || navigator.webkitGetUserMedia;

function handleError(error) {
  console.error('Error: ', error);
}
function getChatID() {
  url_string = window.location.href;
  var u = new URL(url_string);
  var c = u.searchParams.get("id");
  var el = document.getElementById("chatID");
  el.value = c;
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
    var wsURL = "wss://" + window.location.host + "/chatsocket";
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
  if (el.value.trim()) {
    var obj = {};
    obj['chatID'] = chatId;
    obj['personName'] = personName;
    obj['messageType'] = 'text';
    obj['message'] = el.value.trim();
    chatSocket.send(JSON.stringify(obj));
    el.value = "";
  }
  else {
    alert("Please enter a message");
  }
}
function onOpen(evt) {
  var obj = {};
  obj['joinChat'] = chatId;
  obj['personName'] = personName
  chatSocket.send(JSON.stringify(obj));
  var el = document.getElementById("textMessage");
  el.removeAttribute("disabled");
  el = document.getElementById("sendMessage");
  el.removeAttribute("disabled");
  audioSelect = document.querySelector('select#audioSource');
  videoSelect = document.querySelector('select#videoSource');
  // audioSelect.onchange = getStream;
  // videoSelect.onchange = getStream;
  // getStream().then(getDevices).then(gotDevices);
  getDevices().then(gotDevices);
  joinAVI();
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
  if (localStream) {
    localStream.getTracks().forEach(track => {
      track.stop();
    });
  }
  const audioSource = audioSelect.value;
  const videoSource = videoSelect.value;
  const constraints = {
    audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
    video: { deviceId: videoSource ? { exact: videoSource } : undefined }
  };
  return navigator.mediaDevices.getUserMedia(constraints);
}

function gotStream(stream) {
  localStream = stream; // make stream available to console
  audioSelect.selectedIndex = [...audioSelect.options].
    findIndex(option => option.text === stream.getAudioTracks()[0].label);
  videoSelect.selectedIndex = [...videoSelect.options].
    findIndex(option => option.text === stream.getVideoTracks()[0].label);
  videoElement.srcObject = stream;
  for (var peerId in peers) {
    if (localStream) {
      peers[peerId].addStream(localStream);
    }
  }
}

function getDevices() {
  // AFAICT in Safari this only gets default devices until gUM is called :/
  return navigator.mediaDevices.enumerateDevices();
}

function gotDevices(deviceInfos) {
  window.deviceInfos = deviceInfos; // make available to console
  for (const deviceInfo of deviceInfos) {
    const option = document.createElement('option');
    option.value = deviceInfo.deviceId;
    if (deviceInfo.kind === 'audioinput') {
      option.text = deviceInfo.label || `Microphone ${audioSelect.length + 1}`;
      audioSelect.appendChild(option);
    } else if (deviceInfo.kind === 'videoinput') {
      option.text = deviceInfo.label || `Camera ${videoSelect.length + 1}`;
      videoSelect.appendChild(option);
    }
  }
}

function onMessage(evt) {
  handleConference(evt.data);
}
function onError(evt) {
  console.log(evt);
}
function onClose(evt) {
  closeChat();
}
function handleConference(messageStream) {
  var dataObj = JSON.parse(messageStream);
  if (dataObj['messageType'] == 'text') {
    var txtBlock = document.getElementById("chatMessages");
    var div = document.createElement("div");
    var b = document.createElement("b");
    var pre = document.createElement("pre");
    div.style = "border: 1px solid #eeeeee; background-color: #eeeeee; margin-top: 2px;";
    b.innerHTML = dataObj['messagePersonName'];
    pre.innerHTML = dataObj["message"];
    pre.style = "margin-bottom: 0;"
    div.append(b);
    div.append(pre);
    txtBlock.append(div);
    txtBlock.scrollTop = txtBlock.scrollHeight;
  }
  if (dataObj['messageType'] == 'init') {
    var aviDiv = document.getElementById("avi");
    if (dataObj["count"] >= 2) {
      aviDiv.className = "row row-cols-2";
      if (dataObj["count"] > 4) {
        aviDiv.className = "row row-cols-3";
      }
    }
    else {
      aviDiv.className = "row row-cols-1";
    }
    var el = document.getElementById("peopleInChat");
    el.innerHTML = dataObj['people'];
    personID = dataObj['id'];
    createOffer(dataObj['peers'][dataObj['peers'].length - 1]);
  }
  if (dataObj['messageType'] == 'remove') {
    if (dataObj['peerId'] in peers) {
      delete peers[dataObj['peerId']];
      var element = document.getElementById(dataObj['peerId']);
      element.parentNode.removeChild(element);
    }
    if (dataObj["count"] >= 2) {
      aviDiv.className = "row row-cols-2";
      if (dataObj["count"] > 4) {
        aviDiv.className = "row row-cols-3";
      }
    }
    else {
      aviDiv.className = "row row-cols-1";
    }
  }
  if (dataObj['messageType'] == 'offer') {
    receiveOffer(dataObj);
  }
  if (dataObj['messageType'] == 'response') {
    receiveAnswer(dataObj);
  }
  if (dataObj['messageType'] == 'negotiate') {
    negotiate(dataObj);
  }
  if (dataObj['messageType'] == 'ice') {
    iceCandidateNeg(dataObj);
  }
}
function closeChat() {
  console.log("Close Chat");
}
function fail() {
  console.log("Failed");
}
function createOffer(peerId) {
  if (peerId != personID) {
    if (!(peerId in peers)) {
      peers[peerId] = new PeerConnection(peerConnectionConfig);
      peers[peerId].peerId = peerId;
      peers[peerId].onicecandidate = iceCandidateNeg;
      peers[peerId].onnegotiationneeded = negotiate;
      var vidElement = document.createElement("video");
      vidElement.setAttribute("id", peerId);
      videoElement.className = "col";
      var aviDiv = document.getElementById("avi");
      aviDiv.appendChild(vidElement);
      vidElement.autoplay = true;
      peers[peerId].onaddstream = function (event) {
        $('#' + peerId).attachStream(event);
      }
    }
    peers[peerId].createOffer(function (offer) {
      peers[peerId].setLocalDescription(offer, function () {
        var obj = {};
        obj["messageType"] = "offer";
        obj["offer"] = offer;
        obj["peerId"] = peerId;
        obj['chatID'] = chatId;
        chatSocket.send(JSON.stringify(obj));
      }, fail);
    }, fail);
  }
}
function iceCandidateNeg(event) {
  console.log("Ice");
  console.log(event);
  if (event.candidate) {
    if (event.target) {
      var peerId = event.target.peerId;
      var obj = {};
      obj["messageType"] = "ice";
      obj["ice"] = event;
      obj['chatID'] = chatId;
      obj["peerId"] = peerId;
      chatSocket.send(JSON.stringify(obj));
    }
  }
  if (event && event.peerId) {
    var peerId = event.peerId;
    var peerConnection = peers[peerId];
    if (event.ice.candidate) {
      peerConnection.addIceCandidate(new IceCandidate(event.ice));
    }
  }
}
function receiveOffer(peerOffer) {
  var peerId = peerOffer['peerId'];
  var offer = peerOffer['offer'];
  if (!(peerId in peers)) {
    peers[peerId] = new PeerConnection(peerConnectionConfig);
    peers[peerId].peerId = peerId;
    peers[peerId].onicecandidate = iceCandidateNeg;
    peers[peerId].onnegotiationneeded = negotiate;
    var aviDiv = document.getElementById("avi");
    var vidElement = document.createElement("video");
    videoElement.className = "col";
    vidElement.setAttribute("id", peerId);
    aviDiv.appendChild(vidElement);
    vidElement.autoplay = true;
    peers[peerId].onaddstream = function (event) {
      $('#' + peerId).attachStream(event);
    };
  }
  peers[peerId].setRemoteDescription(new SessionDescription(offer), function () {
    peers[peerId].createAnswer(function (answer) {
      peers[peerId].setLocalDescription(answer, function () {
        var obj = {};
        obj["messageType"] = "response";
        obj["answer"] = answer;
        obj["peerId"] = peerId;
        obj['chatID'] = chatId;
        chatSocket.send(JSON.stringify(obj));
      }, fail);
    }, fail);
  }, fail);
}

function receiveAnswer(peerAnswer) {
  var peerId = peerAnswer['peerId'];
  var answer = peerAnswer['answer'];
  peers[peerId].setRemoteDescription(new SessionDescription(answer));
}
async function negotiate(event) {
  console.log("Negotiate");
  console.log(event);
  if (event.target) {
    var peerId = event.target.peerId;
    var peerConnection = peers[peerId];
    const offer = await peerConnection.createOffer();
    if (peerConnection.signalingState != "stable") return;
    await peerConnection.setLocalDescription(offer);
    var obj = {}
    obj['peerId'] = peerId;
    obj['messageType'] = "negotiate";
    obj['chatID'] = chatId;
    obj["offer"] = offer;
    chatSocket.send(JSON.stringify(obj));
  }
  if (event.offer) {
    var peerId = event.peerId;
    var peerConnection = peers[peerId];
    await peerConnection.setRemoteDescription(event.offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription()
    var obj = {}
    obj['peerId'] = peerId;
    obj['messageType'] = "negotiate";
    obj['chatID'] = chatId;
    obj["answer"] = answer;
    chatSocket.send(JSON.stringify(obj));
  }
  if (event.answer) {
    var peerId = event.peerId;
    var peerConnection = peers[peerId];
    await peerConnection.setRemoteDescription(event.answer);
  }
}

jQuery.fn.attachStream = function (event) {
  this.each(function () {
    console.log(event);
    this.srcObject = event.stream;
    // this.play();
  });
}
window.addEventListener("load", getChatID, false);