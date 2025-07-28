const app = require("express")(); // Importa o módulo express e cria a instância do app
const server = require("http").createServer(app); // Cria o servidor HTTP usando o app
const io = require("socket.io")(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://wondrous-capybara-495e07.netlify.app",
    ],
    methods: ["GET", "POST"],
  },
}); // Cria a instância do Socket.IO e define as configurações de CORS
const PORT = process.env.PORT || 8000; // Porta do servidor

io.on("connection", (socket) => {
  socket.emit("me", socket.id); // Envia o ID do socket para o cliente

  console.log("Usuário conectado!", socket.id); // Imprime no console que um usuário se conectou

  socket.on("disconnect", (reason) => {
    console.log("Usuário desconectado!", socket.id); // Imprime no console que um usuário se desconectou
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("callEnded"); // Emite um evento para todos os clientes informando que a chamada foi encerrada
  });

  socket.on("callUser", (data) => {
    io.to(data.userToCall).emit("callUser", {
      signal: data.signalData,
      from: data.from,
      name: data.name,
    }); // Emite um evento para o cliente específico informando que está sendo chamado
  });

  socket.on("answerCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal); // Emite um evento para o cliente específico informando que a chamada foi aceita
  });

  useEffect(() => {
    socket.on("callEnded", () => {
      setCallEnded(true);
      connectionRef.current?.destroy();
      connectionRef.current = null;
    });

    return () => {
      socket.off("callEnded");
    };
  }, []);

  socket.on("message", (text) => {
    io.emit("receive_message", {
      // Emite um evento para todos os clientes informando a mensagem recebida
      text,
      authorId: socket.id,
    });
  });
});

server.listen(PORT, () => console.log("Servidor executando...")); // Inicia o servidor na porta especificada e imprime uma mensagem no console
