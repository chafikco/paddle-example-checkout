import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  'https://bkivvixwzqwfdqucebcq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraXZ2aXh3enF3ZmRxdWNlYmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzY1ODQwOTEsImV4cCI6MTk5MjE2MDA5MX0.ia7V8BPOfgiCfCnQykA7f5ZfPwQmnrHE3jjLmq8FOMs'
);