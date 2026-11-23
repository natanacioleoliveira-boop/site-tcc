
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = "https://duwekmkdkinhciabpcef.supabase.co";

const supabaseKey = "sb_publishable__qaf9YCVmlqbDvSvABhHBQ_OUhpJbAA";

export const supabase = createClient(supabaseUrl, supabaseKey);

