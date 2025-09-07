const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { Client, GatewayIntentBits } = require("discord.js");

admin.initializeApp();
const db = admin.firestore();

// 1. Inicialize o cliente mas NÃO faça o login ainda
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
});

// ✅ Acessa o token a partir dos segredos definidos
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

let isDiscordReady = false;
client.once("clientReady", () => {
  console.log("Bot do Discord está pronto e online!");
  isDiscordReady = true;
});

const ensureDiscordReady = async () => {
  if (!isDiscordReady) {
    await client.login(DISCORD_TOKEN);
  }
};

const GENERAL_CHANNEL_ID = "1413886639033548872"; // Lembre-se de substituir isto

const sendDM = async (userId, message) => {
  await ensureDiscordReady();
  const userDoc = await db.collection("usuarios").doc(userId).get();
  const discordId = userDoc.data()?.discordId;

  if (discordId) {
    try {
      const discordUser = await client.users.fetch(discordId);
      await discordUser.send(message);
    } catch (error) {
      console.error(
        `Não foi possível enviar DM para o utilizador ${discordId}`,
        error
      );
    }
  }
};

// ✅ ATUALIZADO: A função agora declara que precisa do segredo DISCORD_TOKEN
exports.onnewchamado = onDocumentCreated(
  {
    document: "chamados/{chamadoId}",
    secrets: ["DISCORD_TOKEN"],
  },
  async (event) => {
    await ensureDiscordReady();

    const snap = event.data;
    if (!snap) return;

    const chamado = snap.data();
    const solicitanteDoc = await db
      .collection("usuarios")
      .doc(chamado.solicitanteId)
      .get();
    const solicitanteNome = solicitanteDoc.data()?.nome || "Desconhecido";

    const channel = await client.channels.fetch(GENERAL_CHANNEL_ID);
    if (channel) {
      await channel.send({
        embeds: [
          {
            title: `📢 Novo Chamado Aberto: ${chamado.titulo}`,
            description: `Um novo chamado de prioridade **${chamado.prioridade}** foi criado por **${solicitanteNome}**.`,
            color: 0x3498db,
            fields: [
              {
                name: "Descrição",
                value: (chamado.descricao || "").substring(0, 200) + "...",
              },
              {
                name: "Prazo",
                value: chamado.prazo
                  ? new Date(chamado.prazo.seconds * 1000).toLocaleDateString(
                      "pt-BR"
                    )
                  : "Não definido",
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }
  }
);

// ✅ ATUALIZADO: A função agora declara que precisa do segredo DISCORD_TOKEN
exports.onchamadoupdate = onDocumentUpdated(
  {
    document: "chamados/{chamadoId}",
    secrets: ["DISCORD_TOKEN"],
  },
  async (event) => {
    await ensureDiscordReady();

    if (!event.data) return;

    const antes = event.data.before.data();
    const depois = event.data.after.data();

    const channel = await client.channels.fetch(GENERAL_CHANNEL_ID);
    const solicitanteDoc = await db
      .collection("usuarios")
      .doc(depois.solicitanteId)
      .get();
    const solicitanteNome = solicitanteDoc.data()?.nome || "Desconhecido";

    // Cenário 1: Novos responsáveis foram adicionados
    const novosResponsaveis = (depois.executorIds || []).filter(
      (id) => !(antes.executorIds || []).includes(id)
    );
    if (novosResponsaveis.length > 0) {
      for (const userId of novosResponsaveis) {
        await sendDM(userId, {
          embeds: [
            {
              title: `✅ Você foi atribuído a um novo chamado: ${depois.titulo}`,
              description: `Criado por **${solicitanteNome}**. Por favor, verifique o dashboard.`,
              color: 0x2ecc71,
            },
          ],
        });
      }
    }

    // Cenário 2: Um comentário foi adicionado
    const comentariosAntes = antes.comentarios?.length || 0;
    const comentariosDepois = depois.comentarios?.length || 0;
    if (comentariosDepois > comentariosAntes) {
      const novoComentario = depois.comentarios[comentariosDepois - 1];
      const autorNome = novoComentario.autorNome;
      if (channel) {
        await channel.send(
          `💬 **${autorNome}** adicionou um novo comentário no chamado **"${depois.titulo}"**.`
        );
      }
    }

    // Cenário 3: O status mudou
    if (antes.status !== depois.status) {
      let embed;
      if (depois.status === "Resolvido") {
        embed = {
          title: `🔧 Chamado Resolvido: ${depois.titulo}`,
          description: `O chamado foi marcado como resolvido e aguarda aprovação.`,
          color: 0x9b59b6,
        };
      } else if (depois.status === "Aprovado") {
        embed = {
          title: `🎉 Chamado Aprovado: ${depois.titulo}`,
          description: `O chamado foi aprovado e finalizado com sucesso!`,
          color: 0x2ecc71,
        };
      } else if (
        depois.status === "Em Andamento" &&
        antes.status === "Recusado"
      ) {
        embed = {
          title: `❌ Chamado Recusado: ${depois.titulo}`,
          description: `O chamado foi recusado e voltou para "Em Andamento". Justificativa: **${
            depois.justificativaGestor || "N/A"
          }**`,
          color: 0xe74c3c,
        };
      }
      if (embed && channel) {
        await channel.send({ embeds: [embed] });
      }
    }
  }
);
