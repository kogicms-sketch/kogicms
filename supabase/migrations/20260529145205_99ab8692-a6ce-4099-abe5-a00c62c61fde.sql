CREATE OR REPLACE FUNCTION public.validate_election_result()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  total_votes numeric := 0;
  v jsonb;
  party text;
  val numeric;
BEGIN
  -- Non-negative voter counts
  IF NEW.registered_voters < 0 THEN
    RAISE EXCEPTION 'Registered voters cannot be negative.';
  END IF;

  IF NEW.accredited_voters < 0 THEN
    RAISE EXCEPTION 'Accredited voters cannot be negative.';
  END IF;

  -- Validate per-party votes and accumulate the total
  v := COALESCE(NEW.votes, '{}'::jsonb);
  FOR party, val IN
    SELECT key, value::numeric FROM jsonb_each_text(v)
  LOOP
    IF val < 0 THEN
      RAISE EXCEPTION 'Votes for % cannot be negative.', party;
    END IF;
    total_votes := total_votes + val;
  END LOOP;

  -- Accredited cannot exceed registered (when registered is provided)
  IF NEW.registered_voters > 0 AND NEW.accredited_voters > NEW.registered_voters THEN
    RAISE EXCEPTION 'Accredited voters (%) cannot exceed registered voters (%).',
      NEW.accredited_voters, NEW.registered_voters;
  END IF;

  -- Total votes cannot exceed accredited voters (when accredited is provided)
  IF NEW.accredited_voters > 0 AND total_votes > NEW.accredited_voters THEN
    RAISE EXCEPTION 'Total votes cast (%) cannot exceed accredited voters (%).',
      total_votes, NEW.accredited_voters;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_election_result_trigger ON public.election_results;
CREATE TRIGGER validate_election_result_trigger
BEFORE INSERT OR UPDATE ON public.election_results
FOR EACH ROW
EXECUTE FUNCTION public.validate_election_result();