# Como Criar Usuário Admin

O sistema não possui credenciais pré-configuradas. Você precisa criar um usuário admin no Supabase.

## 🎯 Método Recomendado: Via Dashboard do Supabase

### Passo a Passo:

1. **Acesse o Supabase Dashboard**
   - Vá para: https://supabase.com/dashboard
   - Faça login na sua conta
   - Selecione o projeto do sistema de demandas

2. **Navegue até Authentication**
   - No menu lateral, clique em **"Authentication"**
   - Depois clique em **"Users"**

3. **Criar Novo Usuário**
   - Clique no botão **"Add user"** (canto superior direito)
   - Selecione **"Create new user"**

4. **Preencher Dados**
   - **Email**: Digite o email que você quer usar (ex: `admin@empresa.com`)
   - **Password**: Digite uma senha segura
   - **Auto Confirm User**: ✅ **MARQUE ESTA OPÇÃO** (muito importante!)
   - **Send magic link**: Deixe desmarcado

5. **Criar Usuário**
   - Clique em **"Create user"**
   - O usuário será criado e já estará confirmado

6. **Fazer Login**
   - Acesse: `http://localhost:3001/login` (ou a porta que estiver rodando)
   - Use o email e senha que você acabou de criar
   - Você será redirecionado para `/admin`

## 🔧 Método Alternativo: Via API (Node.js)

Se preferir criar via código, execute este script uma vez:

```bash
# Crie um arquivo temporário: create-admin.js
```

```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  console.error('Certifique-se de que .env.local existe com as variáveis corretas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  console.log('🔐 Criando usuário admin...');
  
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@exemplo.com', // ALTERE AQUI
    password: 'senha_segura_123', // ALTERE AQUI
    email_confirm: true, // Confirma email automaticamente
  });

  if (error) {
    console.error('❌ Erro ao criar usuário:', error.message);
    process.exit(1);
  } else {
    console.log('✅ Usuário criado com sucesso!');
    console.log('📧 Email:', data.user.email);
    console.log('🆔 ID:', data.user.id);
    console.log('\n💡 Agora você pode fazer login na aplicação!');
  }
}

createAdminUser();
```

Execute:
```bash
node create-admin.js
```

**⚠️ IMPORTANTE**: Após criar o usuário, delete o arquivo `create-admin.js` por segurança!

## 🔒 Segurança

- Use uma senha forte (mínimo 8 caracteres, com letras, números e símbolos)
- Não compartilhe as credenciais
- Considere criar usuários separados para diferentes administradores
- Em produção, desative o signup público se não for necessário

## ❓ Problemas Comuns

### "Email already exists"
- O email já está cadastrado. Use outro email ou faça login com o existente.

### "Invalid login credentials"
- Verifique se o email está correto
- Verifique se marcou "Auto Confirm User" ao criar
- Tente resetar a senha no Dashboard do Supabase

### Não consigo acessar /admin
- Certifique-se de que está logado
- Verifique se o middleware está redirecionando corretamente
- Limpe os cookies e tente novamente

