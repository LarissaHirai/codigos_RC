import React, { useRef, useState, useEffect } from "react";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import TextField from "@material-ui/core/TextField";
import AssignmentIcon from "@material-ui/icons/Assignment";
import PhoneIcon from "@material-ui/icons/Phone";
import "./App.css";
import { CopyToClipboard } from "react-copy-to-clipboard";
import io from "socket.io-client";
import Peer from "simple-peer";

const socket = io.connect("https://codigos-rc.onrender.com");

function App() {
  const [me, setMe] = useState("");
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState("");
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const messageRef = useRef();
  const [messageList, setMessageList] = useState([]);
  const bottomRef = useRef();
  const signalApplied = useRef(false);
  const [lastChatTarget, setLastChatTarget] = useState("");
  const [chatTargetId, setChatTargetId] = useState("");

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
      });

    socket.on("me", (id) => setMe(id));

    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setName(data.name);
      setCallerSignal(data.signal);
    });

    socket.on("callAccepted", (signal) => {
      if (
        connectionRef.current &&
        !connectionRef.current.destroyed &&
        !signalApplied.current
      ) {
        setCallAccepted(true);
        connectionRef.current.signal(signal);
        signalApplied.current = true;
      }
    });
  }, []);

  useEffect(() => {
    if (myVideo.current && stream) {
      myVideo.current.srcObject = stream;
    }
  }, [stream]);

  const callUser = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ],
      },
    });

    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me,
        name: name,
      });
    });

    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ],
      },
    });

    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });

    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current?.destroy();
    connectionRef.current = null;
    signalApplied.current = false;
  };

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessageList((prev) => [...prev, data]);
      setLastChatTarget(data.authorId); // grava quem mandou como alvo da conversa
    });

    return () => socket.off("receive_message");
  }, []);

  const handleSubmit = () => {
    const message = messageRef.current.value;
    const destinationId = chatTargetId || lastChatTarget;

    if (!message.trim() || !destinationId) return;

    socket.emit("message", {
      to: destinationId,
      text: message,
    });

    setLastChatTarget(destinationId); // registra o destino como última conversa
    setMessageList((prev) => [
      ...prev,
      { text: message, authorId: socket.id, targetId: destinationId },
    ]);

    messageRef.current.value = "";
    messageRef.current.focus();
  };

  const getEnterKey = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageList]);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-100 to-cyan-100 px-4 py-6">
        {/* Título e Info da Chamada */}
        <header className="text-center mb-8">
          <h1 className="font-semibold text-5xl sm:text-6xl md:text-7xl text-slate-600">
            Video
            <span className="text-indigo-500 bold">Meet</span>
          </h1>
          {receivingCall && !callAccepted && (
            <div className="mt-4 bg-yellow-200 text-yellow-900 px-4 py-2 rounded shadow-md inline-block">
              <h2 className="font-semibold">{name} is calling...</h2>
              <Button
                variant="contained"
                color="primary"
                onClick={answerCall}
                className="ml-4"
              >
                Answer
              </Button>
            </div>
          )}
        </header>

        {/* Área de Conteúdo */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Vídeos */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 justify-center">
            {/* Seu vídeo */}
            <div className="bg-black rounded-lg overflow-hidden shadow-md flex justify-center items-center aspect-video">
              {stream && (
                <video
                  playsInline
                  muted
                  ref={myVideo}
                  autoPlay
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Vídeo do outro */}

            {callAccepted && !callEnded && (
              <div className="bg-black rounded-lg overflow-hidden shadow-md flex justify-center items-center aspect-video">
                <video
                  playsInline
                  ref={userVideo}
                  autoPlay
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Painel Lateral */}
          <div className="w-full lg:w-[350px] bg-white rounded-lg shadow-md p-4 space-y-6">
            {/* ID e Chamadas */}
            <div>
              <div className="mb-3">
                <TextField
                  label="Name"
                  variant="filled"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  fullWidth
                  required
                />
              </div>
              <div className="mb-3">
                <CopyToClipboard text={me}>
                  <Button
                    variant="contained"
                    color="primary"
                    className="w-full mb-4"
                    startIcon={<AssignmentIcon />}
                    fullWidth
                  >
                    Copy ID
                  </Button>
                </CopyToClipboard>
              </div>
              <div className="mb-1">
                <TextField
                  label="ID to call"
                  variant="filled"
                  value={idToCall}
                  onChange={(e) => setIdToCall(e.target.value)}
                  className="w-full mt-4"
                  required
                />
              </div>
              <div className="mb-1">
                <TextField
                  label="ID to chat"
                  variant="filled"
                  value={chatTargetId}
                  onChange={(e) => setChatTargetId(e.target.value)}
                  placeholder={lastChatTarget || "Enter ID to chat"}
                  className="w-full mt-4"
                />
              </div>
              <div className="mt-2 text-center">
                {callAccepted && !callEnded ? (
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={leaveCall}
                  >
                    End Call
                  </Button>
                ) : (
                  <IconButton
                    color="primary"
                    onClick={() => callUser(idToCall)}
                  >
                    <PhoneIcon fontSize="large" />
                  </IconButton>
                )}
              </div>
            </div>

            {/* Chat */}
            <div className="bg-gray-100 rounded p-3 h-[300px] flex flex-col">
              <h2 className="text-lg font-bold mb-2 text-gray-700">💬 Chat</h2>
              <p className="text-sm text-gray-500 mb-2 text-center">
                Chatting with:{" "}
                <strong className="text-gray-700">
                  {chatTargetId || lastChatTarget || "Nobody yet"}
                </strong>
              </p>
              <div className="flex-1 overflow-y-auto space-y-2 px-1">
                {messageList.map((message, index) => (
                  <div
                    key={index}
                    className={`px-3 py-1 rounded-lg max-w-fit ${
                      message.authorId === socket.id
                        ? "bg-blue-500 text-white ml-auto"
                        : "bg-white border text-gray-700"
                    }`}
                  >
                    {message.text}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  ref={messageRef}
                  className="flex-1 border rounded px-2 py-1 text-sm text-black"
                  placeholder="Mensagem"
                  onKeyDown={getEnterKey}
                />
                <button
                  onClick={handleSubmit}
                  color="primary"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                >
                  Enter
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
