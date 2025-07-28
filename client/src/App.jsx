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

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }
      });

    socket.on("me", (id) => setMe(id));

    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setName(data.name);
      setCallerSignal(data.signal);
    });

    socket.on("callAccepted", (signal) => {
      if (connectionRef.current && !connectionRef.current.destroyed) {
        setCallAccepted(true);
        connectionRef.current.signal(signal);
      }
    });
  }, []);

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
  };

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessageList((prev) => [...prev, data]);
    });
    return () => socket.off("receive_message");
  }, []);

  const handleSubmit = () => {
    const message = messageRef.current.value;
    if (!message.trim()) return;
    socket.emit("message", message);
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
      <h1 style={{ textAlign: "center", color: "#fff" }}>Meet</h1>
      <div className="container">
        <div className="video-container">
          <div className="video">
            {stream && (
              <video
                playsInline
                muted
                ref={myVideo}
                autoPlay
                style={{ width: "300px" }}
              />
            )}
          </div>
          <div className="video">
            {callAccepted && !callEnded && (
              <video
                playsInline
                ref={userVideo}
                autoPlay
                style={{ width: "300px" }}
              />
            )}
          </div>
        </div>
        <div className="myId">
          <TextField
            label="Name"
            variant="filled"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginBottom: "20px" }}
          />
          <CopyToClipboard text={me} style={{ marginBottom: "2rem" }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AssignmentIcon fontSize="large" />}
            >
              Copy ID
            </Button>
          </CopyToClipboard>

          <TextField
            label="ID to call"
            variant="filled"
            value={idToCall}
            onChange={(e) => setIdToCall(e.target.value)}
          />
          <div className="call-button">
            {callAccepted && !callEnded ? (
              <Button variant="contained" color="secondary" onClick={leaveCall}>
                End Call
              </Button>
            ) : (
              <IconButton color="primary" onClick={() => callUser(idToCall)}>
                <PhoneIcon fontSize="large" />
              </IconButton>
            )}
          </div>
        </div>
        <div>
          {receivingCall && !callAccepted && (
            <div className="caller">
              <h1>{name} is calling...</h1>
              <Button variant="contained" color="primary" onClick={answerCall}>
                Answer
              </Button>
            </div>
          )}
        </div>
        <div>
          <div className="chat-container">
            <h1 className="chat-title">Chat</h1>
            <div className="chat-body">
              {messageList.map((message, index) => (
                <div
                  key={index}
                  className={
                    message.authorId === socket.id
                      ? "message-aux message-mine"
                      : "message-container"
                  }
                >
                  <div className="message-text">{message.text}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="chat-footer">
              <input
                className="mensagem"
                type="text"
                ref={messageRef}
                placeholder="Mensagem"
                onKeyDown={getEnterKey}
              />
              <br />
              <button className="botao" onClick={handleSubmit}>
                Enviar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
