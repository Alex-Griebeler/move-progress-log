import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import { handleControl } from "./handler.ts";
Deno.serve((req) =>
  handleControl(
    req,
    (url, key) => createClient(url, key, { auth: { persistSession: false } }),
  )
);
