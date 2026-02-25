-- 1. Profiles table to store user credits
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    available_credits INT4 DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- 2. Update Payments table to include credits
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS credits_purchased INT4;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Trigger for Credit Decrement on Publish
CREATE OR REPLACE FUNCTION public.decrement_credit_on_publish()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the property is being published
  IF (NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published')) THEN
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

-- DROP TRIGGER IF EXISTS property_publish_credit_trigger ON public.properties;
CREATE TRIGGER property_publish_credit_trigger
BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.decrement_credit_on_publish();

-- 4. Automatically create profile on user signup (Trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, available_credits)
  VALUES (new.id, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. RPC to add credits (used by Stripe Webhook)
CREATE OR REPLACE FUNCTION public.add_credits(user_id_param UUID, credits_param INT4)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.profiles (id, available_credits, updated_at)
  VALUES (user_id_param, credits_param, NOW())
  ON CONFLICT (id) DO UPDATE
  SET available_credits = public.profiles.available_credits + credits_param,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
