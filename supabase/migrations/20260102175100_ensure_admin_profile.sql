-- Garantir que usuário admin tenha perfil
-- Este script cria o perfil admin se não existir

DO $$
DECLARE
  admin_user_id UUID;
  admin_exists BOOLEAN;
BEGIN
  -- Buscar ID do usuário admin pelo email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@loumar.com'
  LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'Usuário admin@loumar.com não encontrado. Crie o usuário primeiro via Dashboard.';
    RETURN;
  END IF;
  
  -- Verificar se já tem perfil
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE id = admin_user_id
  ) INTO admin_exists;
  
  IF NOT admin_exists THEN
    -- Criar perfil admin
    INSERT INTO public.profiles (id, display_name, role, whatsapp_opt_in, created_at, updated_at)
    VALUES (
      admin_user_id,
      'Administrador',
      'admin',
      false,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✅ Perfil admin criado para usuário %', admin_user_id;
  ELSE
    -- Atualizar para garantir que é admin
    UPDATE public.profiles
    SET 
      role = 'admin',
      display_name = COALESCE(display_name, 'Administrador'),
      updated_at = NOW()
    WHERE id = admin_user_id;
    
    RAISE NOTICE '✅ Perfil admin já existe e foi atualizado para usuário %', admin_user_id;
  END IF;
END $$;

-- Verificar resultado
SELECT 
  u.email,
  p.display_name,
  p.role,
  CASE WHEN p.id IS NULL THEN 'SEM PERFIL' ELSE 'OK' END as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'admin@loumar.com';

