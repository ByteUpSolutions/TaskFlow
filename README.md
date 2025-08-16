# TaskFlow - Sistema de Gestão de Chamados

Um sistema web de gerenciamento de chamados (tarefas) desenvolvido em React, projetado para ser hospedado no GitHub Pages e utilizar Firebase como backend.

## 🚀 Características

- **Frontend**: React com Vite
- **Backend**: Firebase (Authentication + Firestore)
- **UI**: Tailwind CSS + shadcn/ui
- **Deploy**: GitHub Pages
- **Dois níveis de acesso**: Solicitante, Executor e Gestor

## 📋 Funcionalidades

### Perfis de Usuário

**Executor**
- Visualizar todos os chamados com status "Aberto"
- Assumir chamados (mudando status para "Em Andamento")
- Resolver chamados (mudando status para "Resolvido")

**Gestor**
- Todas as permissões de um Executor
- Aprovar ou recusar chamados resolvidos
- Visualizar todos os chamados do sistema

### Ciclo de Vida dos Chamados

1. **Aberto** - Chamado criado pelo solicitante
2. **Em Andamento** - Chamado assumido por um executor
3. **Resolvido** - Chamado marcado como resolvido pelo executor
4. **Aprovado** - Chamado aprovado pelo gestor (fechado)
5. **Recusado** - Chamado recusado pelo gestor (reaberto)

## 🛠️ Configuração

### Pré-requisitos

- Node.js 18+
- Conta no Firebase
- Conta no GitHub

### 1. Configuração do Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto
3. Ative o Authentication (Email/Password)
4. Ative o Cloud Firestore
5. Configure as regras de segurança do Firestore (use o arquivo `firestore.rules`)

### 2. Configuração Local

1. Clone o repositório:
```bash
git clone <seu-repositorio>
cd taskflow
```

2. Instale as dependências:
```bash
npm install
# ou
pnpm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

4. Edite o arquivo `.env` com suas credenciais do Firebase:
```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto_id
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

### 3. Regras de Segurança do Firestore

Copie o conteúdo do arquivo `firestore.rules` para as regras do seu projeto no Firebase Console.

### 4. Estrutura do Banco de Dados

O Firestore será estruturado automaticamente com as seguintes coleções:

**usuarios**
```javascript
{
  id: "userId_do_firebase_auth",
  nome: "Nome do Usuário",
  email: "email@exemplo.com",
  perfil: "Solicitante|Executor|Gestor"
}
```

**chamados**
```javascript
{
  id: "id_gerado_automaticamente",
  titulo: "Título do chamado",
  descricao: "Descrição detalhada",
  prioridade: "Baixa|Média|Alta",
  status: "Aberto|Em Andamento|Resolvido|Aprovado|Recusado",
  solicitanteId: "userId_do_solicitante",
  executorId: "userId_do_executor", // opcional
  criadoEm: timestamp,
  assumidoEm: timestamp, // opcional
  resolvidoEm: timestamp, // opcional
  tempoGasto: number, // opcional
  notasResolucao: "string", // opcional
  justificativaGestor: "string", // opcional
  historico: [
    {
      autor: "userId",
      acao: "Ação realizada",
      timestamp: timestamp,
      detalhes: "Detalhes da ação"
    }
  ]
}
```

## 🚀 Execução

### Desenvolvimento

```bash
npm run dev
# ou
pnpm run dev
```

Acesse `http://localhost:5173`

### Build

```bash
npm run build
# ou
pnpm run build
```

### Deploy no GitHub Pages

1. Atualize o campo `homepage` no `package.json`:
```json
{
  "homepage": "https://seu-usuario.github.io/taskflow"
}
```

2. Execute o deploy:
```bash
npm run deploy
# ou
pnpm run deploy
```

## 📱 Uso

### Primeiro Acesso

1. Acesse a aplicação
2. Clique em "Cadastre-se"
3. Preencha os dados e selecione seu perfil
4. Faça login com suas credenciais

### Criando um Chamado (Gestor)

1. No dashboard, clique em "Novo Chamado"
2. Preencha título, descrição e prioridade
3. Clique em "Criar Chamado"

### Assumindo um Chamado (Executor/Gestor)

1. No dashboard, visualize os chamados na visão Kanban
2. Clique em "Ver Detalhes" em um chamado aberto
3. Clique em "Assumir Chamado"

### Resolvendo um Chamado (Executor/Gestor)

1. Acesse um chamado em andamento que você assumiu
2. Preencha o tempo gasto e notas de resolução
3. Clique em "Marcar como Resolvido"

### Aprovando/Recusando (Gestor)

1. Acesse um chamado com status "Resolvido"
2. Adicione uma justificativa (opcional)
3. Clique em "Aprovar" ou "Recusar"

## 🔒 Segurança

O sistema utiliza as regras de segurança do Firestore para garantir que:

- Usuários só acessem dados permitidos para seu perfil
- Solicitantes só vejam seus próprios chamados
- Executores só possam assumir chamados abertos
- Gestores tenham acesso completo ao sistema

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte, abra uma issue no GitHub ou entre em contato através do email do projeto.

