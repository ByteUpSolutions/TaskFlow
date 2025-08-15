# Instruções de Configuração - TaskFlow

## 🔧 Configuração Completa do Projeto

### 1. Configuração do Firebase

#### 1.1 Criar Projeto no Firebase
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Digite o nome do projeto (ex: "taskflow-sistema")
4. Desabilite o Google Analytics (opcional)
5. Clique em "Criar projeto"

#### 1.2 Configurar Authentication
1. No painel do Firebase, vá em "Authentication"
2. Clique em "Começar"
3. Na aba "Sign-in method", clique em "Email/senha"
4. Ative "Email/senha" e clique em "Salvar"

#### 1.3 Configurar Firestore Database
1. No painel do Firebase, vá em "Firestore Database"
2. Clique em "Criar banco de dados"
3. Selecione "Iniciar no modo de teste" (temporário)
4. Escolha uma localização (ex: southamerica-east1)
5. Clique em "Concluído"

#### 1.4 Obter Credenciais do Projeto
1. No painel do Firebase, vá em "Configurações do projeto" (ícone de engrenagem)
2. Na aba "Geral", role até "Seus aplicativos"
3. Clique no ícone "</>" para adicionar um app web
4. Digite um nome para o app (ex: "taskflow-web")
5. NÃO marque "Configurar Firebase Hosting"
6. Clique em "Registrar app"
7. Copie as credenciais mostradas (você precisará delas no passo 2.3)

#### 1.5 Configurar Regras de Segurança
1. No Firestore Database, vá na aba "Regras"
2. Substitua o conteúdo pelas regras do arquivo `firestore.rules`
3. Clique em "Publicar"

### 2. Configuração Local do Projeto

#### 2.1 Clonar e Instalar
```bash
# Clone o repositório
git clone <url-do-seu-repositorio>
cd taskflow

# Instale as dependências
npm install
# ou
pnpm install
```

#### 2.2 Configurar Variáveis de Ambiente
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o arquivo .env com suas credenciais do Firebase
nano .env
```

#### 2.3 Preencher o arquivo .env
Substitua os valores no arquivo `.env` pelas credenciais obtidas no passo 1.4:

```env
VITE_FIREBASE_API_KEY=sua_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto_id
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

### 3. Executar o Projeto

#### 3.1 Desenvolvimento
```bash
npm run dev
# ou
pnpm run dev
```

Acesse: `http://localhost:5173`

#### 3.2 Build para Produção
```bash
npm run build
# ou
pnpm run build
```

### 4. Deploy no GitHub Pages

#### 4.1 Configurar GitHub Pages
1. No seu repositório GitHub, vá em "Settings"
2. Role até "Pages" no menu lateral
3. Em "Source", selecione "Deploy from a branch"
4. Selecione "gh-pages" como branch
5. Clique em "Save"

#### 4.2 Atualizar package.json
Edite o arquivo `package.json` e atualize a linha `homepage`:
```json
{
  "homepage": "https://SEU_USUARIO.github.io/NOME_DO_REPOSITORIO"
}
```

#### 4.3 Fazer Deploy
```bash
npm run deploy
# ou
pnpm run deploy
```

### 5. Primeiro Uso

#### 5.1 Criar Usuários de Teste
1. Acesse a aplicação
2. Clique em "Cadastre-se"
3. Crie usuários com diferentes perfis:
   - **Solicitante**: Para criar chamados
   - **Executor**: Para resolver chamados
   - **Gestor**: Para aprovar/recusar chamados

#### 5.2 Testar Fluxo Completo
1. **Como Solicitante**: Crie um chamado
2. **Como Executor**: Assuma e resolva o chamado
3. **Como Gestor**: Aprove ou recuse o chamado

### 6. Estrutura de Dados

#### 6.1 Coleção `usuarios`
```javascript
{
  id: "userId_do_firebase_auth",
  nome: "Nome do Usuário",
  email: "email@exemplo.com",
  perfil: "Solicitante|Executor|Gestor"
}
```

#### 6.2 Coleção `chamados`
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
  historico: [...]
}
```

### 7. Solução de Problemas

#### 7.1 Erro de Autenticação
- Verifique se as credenciais no `.env` estão corretas
- Confirme se o Authentication está habilitado no Firebase
- Verifique se o método Email/senha está ativo

#### 7.2 Erro de Permissão no Firestore
- Confirme se as regras de segurança foram aplicadas corretamente
- Verifique se o usuário tem o perfil correto no documento `usuarios`

#### 7.3 Erro de Deploy
- Confirme se o `homepage` no `package.json` está correto
- Verifique se o GitHub Pages está configurado para a branch `gh-pages`
- Execute `npm run build` antes do deploy para verificar erros

### 8. Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Preview do build
npm run preview

# Deploy
npm run deploy

# Lint
npm run lint
```

### 9. Próximos Passos

1. **Personalização**: Ajuste cores, logos e textos conforme sua necessidade
2. **Funcionalidades**: Adicione campos customizados aos chamados
3. **Notificações**: Implemente notificações por email
4. **Relatórios**: Adicione dashboards com métricas
5. **Mobile**: Otimize para dispositivos móveis

### 10. Suporte

Para dúvidas ou problemas:
1. Consulte a documentação do Firebase
2. Verifique os logs do console do navegador
3. Consulte a documentação do React e Vite
4. Abra uma issue no repositório do projeto

