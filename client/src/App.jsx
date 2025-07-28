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

// Conexão do socket
const socket = io.connect("https://wondrous-capybara-495e07.netlify.app/");

function App() {
  // Definição dos estados
  const [me, setMe] = useState(""); // ID do usuário atual
  const [stream, setStream] = useState(); // Stream de mídia
  const [receivingCall, setReceivingCall] = useState(false); // Indica se está recebendo uma chamada
  const [caller, setCaller] = useState(""); // ID do chamador
  const [callerSignal, setCallerSignal] = useState(); // Dados de sinalização do chamador
  const [callAccepted, setCallAccepted] = useState(false); // Indica se a chamada foi aceita
  const [idToCall, setIdToCall] = useState(""); // ID do usuário a ser chamado
  const [callEnded, setCallEnded] = useState(false); // Indica se a chamada foi encerrada
  const [name, setName] = useState(""); // Nome do usuário
  const myVideo = useRef(); // Referência para o elemento de vídeo do usuário atual
  const userVideo = useRef(); // Referência para o elemento de vídeo do outro usuário
  const connectionRef = useRef(); // Referência para a conexão do Simple Peer
  const messageRef = useRef(); // Referência para o campo de input de mensagem
  const [messageList, setMessageList] = useState([]); // Lista de mensagens
  const bottomRef = useRef(); // Referência para a parte inferior da lista de mensagens

  useEffect(() => {
    // Solicitação de permissão de mídia
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (myVideo.current) {
          myVideo.current.srcObject = stream;
        }
      });

    // Evento 'me': Recebe o ID do usuário atual do servidor
    socket.on("me", (id) => {
      setMe(id);
    });

    // Evento 'callUser': Recebe a chamada de outro usuário
    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setName(data.name);
      setCallerSignal(data.signal);
    });
  }, []);

  const callUser = (id) => {
    // Inicia uma chamada para o usuário com o ID especificado
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    // Evento 'signal': Envia os dados de sinalização para o servidor
    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me,
        name: name,
      });
    });

    // Evento 'stream': Recebe a stream de mídia do outro usuário
    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });

    // Evento 'callAccepted': Sinaliza que a chamada foi aceita e envia os dados de sinalização
    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer; // Armazena a conexão do Simple Peer
  };

  const answerCall = () => {
    // Responde a uma chamada recebida
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    // Evento 'signal': Envia os dados de sinalização para o servidor
    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });

    // Evento 'stream': Recebe a stream de mídia do outro usuário
    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal); // Sinaliza a chamada com os dados de sinalização do chamador
    connectionRef.current = peer; // Armazena a conexão do Simple Peer
  };

  const leaveCall = () => {
    // Encerra a chamada
    setCallEnded(true);
    connectionRef.current.destroy();
  };

  useEffect(() => {
    // Evento 'receive_message': Recebe uma nova mensagem
    socket.on("receive_message", (data) => {
      setMessageList((current) => [...current, data]);
    });

    return () => socket.off("receive_message"); // Remove o ouvinte do evento ao desmontar o componente
  }, [socket]);

  const handleSubmit = () => {
    // Envia uma mensagem
    const message = messageRef.current.value;
    if (!message.trim()) return;

    socket.emit("message", message);
    clearInput();
    focusInput();
  };

  const clearInput = () => {
    // Limpa o campo de input de mensagem
    messageRef.current.value = "";
  };

  const getEnterKey = (e) => {
    // Verifica se a tecla pressionada é 'Enter'
    if (e.key === "Enter") handleSubmit();
  };

  useEffect(() => {
    // Atualiza a rolagem para a parte inferior da lista de mensagens
    scrollDown();
  }, [messageList]);

  const scrollDown = () => {
    // Rola para a parte inferior da lista de mensagens
    bottomRef.current.scrollIntoView({ behavior: "smooth" });
  };

  const focusInput = () => {
    // Foca no campo de input de mensagem
    messageRef.current.focus();
  };

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
            {callAccepted && !callEnded ? (
              <video
                playsInline
                ref={userVideo}
                autoPlay
                style={{ width: "300px" }}
              />
            ) : null}
          </div>
        </div>
        <div className="myId">
          <TextField
            id="filled-basic"
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
            id="filled-basic"
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
              <IconButton
                color="primary"
                aria-label="call"
                onClick={() => callUser(idToCall)}
              >
                <PhoneIcon fontSize="large" />
              </IconButton>
            )}
            {idToCall}
          </div>
        </div>
        <div>
          {receivingCall && !callAccepted ? (
            <div className="caller">
              <h1>{name} is calling...</h1>
              <Button variant="contained" color="primary" onClick={answerCall}>
                Answer
              </Button>
            </div>
          ) : null}
        </div>
        <div>
          <div>
            <div className="chat-container">
              <h1 className="chat-title">Chat</h1>
              <div className="chat-body">
                {messageList.map((message, index) => (
                  <div>
                    <div key={index}>
                      {message.authorId === socket.id ? (
                        <div className="message-aux message-mine">
                          <div className="message-text">{message.text}</div>
                        </div>
                      ) : (
                        <div className="message-container">
                          <div className="message-text">{message.text}</div>
                        </div>
                      )}
                    </div>
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
      </div>
    </>
  );
}

export default App;
