-- Update the trigger function to easily bypass credit checks if the person doing the action is an admin.
-- This allows admins to re-assign an AI property to an agent and publish it without crashing due to the agent having 0 credits.

CREATE OR REPLACE FUNCTION public.decrement_credit_on_publish()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the property is being published
  IF (NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published')) THEN
    
    -- Bypass credit check & deduction if current user performing the action is an admin
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
    ) THEN
        RETURN NEW;
    END IF;

    -- Check if user has sufficient credits
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = NEW.user_id AND available_credits > 0
    ) THEN
        -- Prevent transition to published if no credits
        RAISE EXCEPTION 'Insufficient credits to publish property.';
    END IF;

    -- Decrement the credit
    UPDATE public.profiles
    SET available_credits = available_credits - 1,
        updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
