-- Políticas de Storage para o bucket demand-uploads
-- Execute este script no SQL Editor do Supabase Dashboard APÓS criar o bucket

-- Permitir que usuários autenticados visualizem arquivos do bucket
-- (necessário para o admin visualizar os uploads)
CREATE POLICY "Authenticated users can view uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'demand-uploads');

-- Nota: Uploads serão feitos via Server Action usando service_role key
-- que bypassa RLS, então não é necessário policy de INSERT aqui.

