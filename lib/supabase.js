import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://tosmlqxrjjbvhlggpgot.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvc21scXhyampidmhsZ2dwZ290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyODgzMDUsImV4cCI6MjA5NTg2NDMwNX0.l_qdD_zdyCP26MfT4aVI1D3RxSkYyPxUgU7MizubuL4";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
