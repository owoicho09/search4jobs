// Hand-written to match supabase/migrations/*.sql exactly. Regenerate for
// drift-free accuracy once Docker or a Supabase access token is available:
//   npx supabase gen types typescript --db-url "$DATABASE_URL" --schema public > src/lib/supabase/types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ExperienceLevel = "entry" | "junior" | "mid" | "senior" | "lead" | "executive";
export type WorkArrangement = "remote" | "hybrid" | "onsite" | "any";
export type CvStatus = "uploading" | "ready" | "failed";
export type TelegramBotStatus = "pending" | "connected" | "disconnected" | "error";
export type CreditEntryType = "daily_grant" | "purchase" | "spend" | "adjustment";
export type SubscriptionStatus = "active" | "cancelled" | "expired" | "past_due";
export type BillingInterval = "monthly" | "yearly";
export type PaymentStatus = "pending" | "success" | "failed" | "abandoned";
export type SearchSource = "dashboard" | "telegram";
export type SearchStatus = "pending" | "completed" | "failed" | "no_matches";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          full_name: string | null;
          headline: string | null;
          summary: string | null;
          skills: string[];
          experience_level: ExperienceLevel | null;
          years_experience: number | null;
          preferred_titles: string[];
          preferred_country: string | null;
          preferred_location: string | null;
          work_arrangement: WorkArrangement;
          employment_types: string[];
          salary_min: number | null;
          salary_max: number | null;
          max_days_old: number | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: never[];
      };
      cv_files: {
        Row: {
          id: string;
          user_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          status: CvStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["cv_files"]["Row"]> & {
          user_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
        };
        Update: Partial<Database["public"]["Tables"]["cv_files"]["Row"]>;
        Relationships: never[];
      };
      telegram_bots: {
        Row: {
          id: string;
          user_id: string;
          telegram_bot_id: number;
          bot_username: string | null;
          bot_token_encrypted: string;
          bot_token_hash: string;
          webhook_registered_at: string | null;
          status: TelegramBotStatus;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["telegram_bots"]["Row"]> & {
          user_id: string;
          telegram_bot_id: number;
          bot_token_encrypted: string;
          bot_token_hash: string;
        };
        Update: Partial<Database["public"]["Tables"]["telegram_bots"]["Row"]>;
        Relationships: never[];
      };
      credit_packs: {
        Row: {
          id: string;
          code: string;
          name: string;
          price_kobo: number;
          credits: number;
          active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["credit_packs"]["Row"]> & {
          code: string;
          name: string;
          price_kobo: number;
          credits: number;
        };
        Update: Partial<Database["public"]["Tables"]["credit_packs"]["Row"]>;
        Relationships: never[];
      };
      subscription_plans: {
        Row: {
          id: string;
          code: string;
          name: string;
          price_kobo: number;
          billing_interval: BillingInterval;
          daily_allowance: number;
          feature_limits: Json;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["subscription_plans"]["Row"]> & {
          code: string;
          name: string;
          price_kobo: number;
          billing_interval: BillingInterval;
          daily_allowance: number;
        };
        Update: Partial<Database["public"]["Tables"]["subscription_plans"]["Row"]>;
        Relationships: never[];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          status: SubscriptionStatus;
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["subscriptions"]["Row"]> & {
          user_id: string;
          plan_id: string;
          status: SubscriptionStatus;
          current_period_end: string;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Row"]>;
        Relationships: never[];
      };
      credit_ledger: {
        Row: {
          id: string;
          user_id: string;
          entry_type: CreditEntryType;
          amount: number;
          daily_component: number;
          purchased_component: number;
          reference_type: string | null;
          reference_id: string | null;
          idempotency_key: string;
          created_at: string;
        };
        Insert: never; // writes go only through the credit RPC functions
        Update: never;
        Relationships: never[];
      };
      daily_allowance_state: {
        Row: {
          user_id: string;
          grant_date: string;
          granted_amount: number;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: never[];
      };
      payment_transactions: {
        Row: {
          id: string;
          user_id: string;
          pack_id: string;
          provider: string;
          provider_reference: string;
          amount_kobo: number;
          credits: number;
          status: PaymentStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payment_transactions"]["Row"]> & {
          user_id: string;
          pack_id: string;
          provider_reference: string;
          amount_kobo: number;
          credits: number;
        };
        Update: Partial<Database["public"]["Tables"]["payment_transactions"]["Row"]>;
        Relationships: never[];
      };
      payment_events: {
        Row: {
          id: string;
          provider: string;
          dedupe_key: string;
          event_type: string;
          payload: Json;
          processed_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payment_events"]["Row"]> & {
          dedupe_key: string;
          event_type: string;
          payload: Json;
        };
        Update: Partial<Database["public"]["Tables"]["payment_events"]["Row"]>;
        Relationships: never[];
      };
      searches: {
        Row: {
          id: string;
          user_id: string;
          source: SearchSource;
          query_params: Json;
          requested_count: number;
          delivered_count: number;
          status: SearchStatus;
          error_message: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["searches"]["Row"]> & {
          user_id: string;
          query_params: Json;
          requested_count: number;
        };
        Update: Partial<Database["public"]["Tables"]["searches"]["Row"]>;
        Relationships: never[];
      };
      matches: {
        Row: {
          id: string;
          search_id: string;
          user_id: string;
          provider: string;
          provider_job_id: string;
          title: string;
          company: string | null;
          location: string | null;
          work_arrangement: string | null;
          employment_type: string | null;
          salary_min: number | null;
          salary_max: number | null;
          description_snippet: string | null;
          listing_url: string;
          posted_at: string | null;
          ai_relevance_score: number | null;
          ai_explanation: string | null;
          delivered_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["matches"]["Row"]> & {
          search_id: string;
          user_id: string;
          provider_job_id: string;
          title: string;
          listing_url: string;
        };
        Update: Partial<Database["public"]["Tables"]["matches"]["Row"]>;
        Relationships: never[];
      };
      saved_jobs: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          provider_job_id: string;
          title: string;
          company: string | null;
          location: string | null;
          listing_url: string;
          salary_min: number | null;
          salary_max: number | null;
          posted_at: string | null;
          snapshot: Json;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["saved_jobs"]["Row"]> & {
          user_id: string;
          provider_job_id: string;
          title: string;
          listing_url: string;
        };
        Update: Partial<Database["public"]["Tables"]["saved_jobs"]["Row"]>;
        Relationships: never[];
      };
      telegram_updates: {
        Row: {
          id: string;
          bot_id: string;
          telegram_update_id: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["telegram_updates"]["Row"]> & {
          bot_id: string;
          telegram_update_id: number;
        };
        Update: never;
        Relationships: never[];
      };
      app_config: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: { key: string; value: Json; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["app_config"]["Row"]>;
        Relationships: never[];
      };
      rate_limit_events: {
        Row: {
          id: number;
          subject: string;
          bucket: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: never[];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_credit_balance: {
        Args: { p_user_id: string };
        Returns: { daily_balance: number; purchased_balance: number }[];
      };
      grant_daily_allowance: {
        Args: { p_user_id: string };
        Returns: {
          granted_today: number;
          newly_granted: boolean;
          daily_balance: number;
          purchased_balance: number;
        }[];
      };
      spend_credits: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_reference_type: string;
          p_reference_id: string | null;
          p_idempotency_key: string;
        };
        Returns: {
          spent: number;
          daily_spent: number;
          purchased_spent: number;
          daily_balance: number;
          purchased_balance: number;
          already_processed: boolean;
        }[];
      };
      grant_purchased_credits: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_reference_type: string;
          p_reference_id: string | null;
          p_idempotency_key: string;
        };
        Returns: { granted: number; already_processed: boolean }[];
      };
      check_rate_limit: {
        Args: {
          p_subject: string;
          p_bucket: string;
          p_limit: number;
          p_window_seconds: number;
        };
        Returns: { allowed: boolean; remaining: number }[];
      };
    };
    Enums: Record<string, never>;
  };
}
