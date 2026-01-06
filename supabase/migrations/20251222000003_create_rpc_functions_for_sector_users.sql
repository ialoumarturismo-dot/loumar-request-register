-- Migration: Create RPC functions for sector users to update demands
-- These functions enforce field-level restrictions and log events

-- Function: Set demand status (sector users only)
CREATE OR REPLACE FUNCTION public.set_demand_status(
  p_demand_id UUID,
  p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
  v_assigned_to UUID;
  v_result JSONB;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Validate user is sector_user
  IF v_user_role != 'sector_user' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Apenas usuários de setor podem atualizar status operacional'
    );
  END IF;
  
  -- Get assigned user
  SELECT assigned_to_user_id INTO v_assigned_to
  FROM public.demands
  WHERE id = p_demand_id;
  
  -- Validate assignment
  IF v_assigned_to != auth.uid() THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Demanda não atribuída a você'
    );
  END IF;
  
  -- Validate status
  IF p_new_status NOT IN ('Recebido', 'Em análise', 'Em execução', 'Concluído') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Status inválido'
    );
  END IF;
  
  -- Get old status for event
  DECLARE
    v_old_status TEXT;
  BEGIN
    SELECT status INTO v_old_status
    FROM public.demands
    WHERE id = p_demand_id;
    
    -- Update status
    UPDATE public.demands
    SET status = p_new_status
    WHERE id = p_demand_id;
    
    -- Log event
    INSERT INTO public.demand_events (
      demand_id,
      author_user_id,
      event_type,
      body,
      visibility
    ) VALUES (
      p_demand_id,
      auth.uid(),
      'status_change',
      'Status alterado de ' || COALESCE(v_old_status, 'N/A') || ' para ' || p_new_status,
      'manager_only'
    );
    
    RETURN jsonb_build_object('ok', true);
  END;
END;
$$;

-- Function: Add demand comment (sector users only, manager_only visibility)
CREATE OR REPLACE FUNCTION public.add_demand_comment(
  p_demand_id UUID,
  p_body TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
  v_assigned_to UUID;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Validate user is sector_user
  IF v_user_role != 'sector_user' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Apenas usuários de setor podem adicionar comentários'
    );
  END IF;
  
  -- Get assigned user
  SELECT assigned_to_user_id INTO v_assigned_to
  FROM public.demands
  WHERE id = p_demand_id;
  
  -- Validate assignment
  IF v_assigned_to != auth.uid() THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Demanda não atribuída a você'
    );
  END IF;
  
  -- Validate body
  IF p_body IS NULL OR TRIM(p_body) = '' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Comentário não pode estar vazio'
    );
  END IF;
  
  -- Insert event
  INSERT INTO public.demand_events (
    demand_id,
    author_user_id,
    event_type,
    body,
    visibility
  ) VALUES (
    p_demand_id,
    auth.uid(),
    'comment',
    p_body,
    'manager_only'
  );
  
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.set_demand_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_demand_comment(UUID, TEXT) TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.set_demand_status IS 'Permite usuários de setor atualizarem status operacional de demandas atribuídas a eles';
COMMENT ON FUNCTION public.add_demand_comment IS 'Permite usuários de setor adicionarem comentários (manager_only) em demandas atribuídas a eles';

