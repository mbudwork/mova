/**
 * GENERATED FILE — do not edit by hand.
 *
 * Produced from the live schema by scripts/gen-types.mjs:
 *   npm run types:generate
 *
 * Regenerate after every migration.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      analytics_events: {
        Row: {
          id: string;
          user_id: string | null;
          event_type: string;
          payload: Json;
          created_at: string;
          anonymous_id: string | null;
          session_id: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          utm_term: string | null;
          landing_variant: string | null;
          device_category: string | null;
          locale: string | null;
          landing_locale: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          event_type: string;
          payload?: Json;
          created_at?: string;
          anonymous_id?: string | null;
          session_id?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_term?: string | null;
          landing_variant?: string | null;
          device_category?: string | null;
          locale?: string | null;
          landing_locale?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          event_type?: string;
          payload?: Json;
          created_at?: string;
          anonymous_id?: string | null;
          session_id?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_term?: string | null;
          landing_variant?: string | null;
          device_category?: string | null;
          locale?: string | null;
          landing_locale?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'analytics_events_landing_locale_fkey';
            columns: ['landing_locale'];
            isOneToOne: false;
            referencedRelation: 'languages';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'analytics_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      audio_assets: {
        Row: {
          id: string;
          phrase_id: string | null;
          combination_id: string | null;
          voice_id: string;
          speed: 'slow' | 'normal' | 'natural';
          style: string | null;
          provider: string;
          storage_path: string | null;
          duration_ms: number | null;
          text_checksum: string | null;
          approved: boolean;
          generated_at: string;
          status: 'pending' | 'generated' | 'approved' | 'rejected';
          external_ref: string | null;
        };
        Insert: {
          id?: string;
          phrase_id?: string | null;
          combination_id?: string | null;
          voice_id: string;
          speed?: 'slow' | 'normal' | 'natural';
          style?: string | null;
          provider?: string;
          storage_path?: string | null;
          duration_ms?: number | null;
          text_checksum?: string | null;
          approved?: boolean;
          generated_at?: string;
          status?: 'pending' | 'generated' | 'approved' | 'rejected';
          external_ref?: string | null;
        };
        Update: {
          id?: string;
          phrase_id?: string | null;
          combination_id?: string | null;
          voice_id?: string;
          speed?: 'slow' | 'normal' | 'natural';
          style?: string | null;
          provider?: string;
          storage_path?: string | null;
          duration_ms?: number | null;
          text_checksum?: string | null;
          approved?: boolean;
          generated_at?: string;
          status?: 'pending' | 'generated' | 'approved' | 'rejected';
          external_ref?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audio_assets_combination_id_fkey';
            columns: ['combination_id'];
            isOneToOne: false;
            referencedRelation: 'generated_combinations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audio_assets_phrase_id_fkey';
            columns: ['phrase_id'];
            isOneToOne: false;
            referencedRelation: 'phrases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audio_assets_voice_id_fkey';
            columns: ['voice_id'];
            isOneToOne: false;
            referencedRelation: 'voices';
            referencedColumns: ['id'];
          },
        ];
      };
      audio_generation_jobs: {
        Row: {
          id: string;
          phrase_id: string | null;
          combination_id: string | null;
          voice_id: string;
          speed: 'slow' | 'normal' | 'natural';
          status: 'queued' | 'running' | 'done' | 'failed';
          error: string | null;
          requested_by: string | null;
          created_at: string;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          phrase_id?: string | null;
          combination_id?: string | null;
          voice_id: string;
          speed?: 'slow' | 'normal' | 'natural';
          status?: 'queued' | 'running' | 'done' | 'failed';
          error?: string | null;
          requested_by?: string | null;
          created_at?: string;
          finished_at?: string | null;
        };
        Update: {
          id?: string;
          phrase_id?: string | null;
          combination_id?: string | null;
          voice_id?: string;
          speed?: 'slow' | 'normal' | 'natural';
          status?: 'queued' | 'running' | 'done' | 'failed';
          error?: string | null;
          requested_by?: string | null;
          created_at?: string;
          finished_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audio_generation_jobs_combination_id_fkey';
            columns: ['combination_id'];
            isOneToOne: false;
            referencedRelation: 'generated_combinations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audio_generation_jobs_phrase_id_fkey';
            columns: ['phrase_id'];
            isOneToOne: false;
            referencedRelation: 'phrases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audio_generation_jobs_voice_id_fkey';
            columns: ['voice_id'];
            isOneToOne: false;
            referencedRelation: 'voices';
            referencedColumns: ['id'];
          },
        ];
      };
      checkout_consents: {
        Row: {
          id: string;
          user_id: string | null;
          email: string | null;
          locale: string;
          terms_version: string;
          refund_policy_version: string;
          privacy_version: string;
          consent_form_version: string;
          terms_consent_text: string;
          immediate_access_consent_text: string;
          terms_accepted: boolean;
          immediate_access_accepted: boolean;
          ip_address: string | null;
          user_agent: string | null;
          stripe_checkout_session_id: string | null;
          payment_status: string | null;
          entitlement_granted_at: string | null;
          confirmation_email_sent_at: string | null;
          consented_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email?: string | null;
          locale?: string;
          terms_version: string;
          refund_policy_version: string;
          privacy_version: string;
          consent_form_version: string;
          terms_consent_text: string;
          immediate_access_consent_text: string;
          terms_accepted: boolean;
          immediate_access_accepted: boolean;
          ip_address?: string | null;
          user_agent?: string | null;
          stripe_checkout_session_id?: string | null;
          payment_status?: string | null;
          entitlement_granted_at?: string | null;
          confirmation_email_sent_at?: string | null;
          consented_at?: string;
        };
        Update: {
          user_id?: string | null;
          email?: string | null;
          stripe_checkout_session_id?: string | null;
          payment_status?: string | null;
          entitlement_granted_at?: string | null;
          confirmation_email_sent_at?: string | null;
        };
        Relationships: [];
      };
      checkout_leads: {
        Row: {
          id: string;
          user_id: string;
          product_code: string;
          status: 'pending' | 'contacted' | 'converted' | 'dismissed';
          locale: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_code?: string;
          status?: 'pending' | 'contacted' | 'converted' | 'dismissed';
          locale?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_code?: string;
          status?: 'pending' | 'contacted' | 'converted' | 'dismissed';
          locale?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'checkout_leads_locale_fkey';
            columns: ['locale'];
            isOneToOne: false;
            referencedRelation: 'languages';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'checkout_leads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      content_reviews: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          from_status: 'draft' | 'language_review' | 'native_review' | 'trade_review' | 'safety_review' | 'approved' | 'rejected' | 'archived' | null;
          to_status: 'draft' | 'language_review' | 'native_review' | 'trade_review' | 'safety_review' | 'approved' | 'rejected' | 'archived';
          reviewer_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          from_status?: 'draft' | 'language_review' | 'native_review' | 'trade_review' | 'safety_review' | 'approved' | 'rejected' | 'archived' | null;
          to_status: 'draft' | 'language_review' | 'native_review' | 'trade_review' | 'safety_review' | 'approved' | 'rejected' | 'archived';
          reviewer_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          entity_type?: string;
          entity_id?: string;
          from_status?: 'draft' | 'language_review' | 'native_review' | 'trade_review' | 'safety_review' | 'approved' | 'rejected' | 'archived' | null;
          to_status?: 'draft' | 'language_review' | 'native_review' | 'trade_review' | 'safety_review' | 'approved' | 'rejected' | 'archived';
          reviewer_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      content_sources: {
        Row: {
          id: string;
          name: string;
          url: string | null;
          validates: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          url?: string | null;
          validates?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          url?: string | null;
          validates?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      content_templates: {
        Row: {
          id: string;
          pattern: string;
          description: string | null;
          speaker: 'bauleiter' | 'polier' | 'colleague' | 'worker' | 'customer';
          difficulty: number;
          verification_status: 'draft' | 'language_review' | 'native_review' | 'trade_review' | 'safety_review' | 'approved' | 'rejected' | 'archived';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pattern: string;
          description?: string | null;
          speaker?: 'bauleiter' | 'polier' | 'colleague' | 'worker' | 'customer';
          difficulty?: number;
          verification_status?: 'draft' | 'language_review' | 'native_review' | 'trade_review' | 'safety_review' | 'approved' | 'rejected' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pattern?: string;
          description?: string | null;
          speaker?: 'bauleiter' | 'polier' | 'colleague' | 'worker' | 'customer';
          difficulty?: number;
          verification_status?: 'draft' | 'language_review' | 'native_review' | 'trade_review' | 'safety_review' | 'approved' | 'rejected' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      diagnostic_options: {
        Row: {
          id: string;
          question_id: string;
          position: number;
          text_ru: string;
          is_correct: boolean;
          text_uk: string | null;
        };
        Insert: {
          id?: string;
          question_id: string;
          position: number;
          text_ru: string;
          is_correct?: boolean;
          text_uk?: string | null;
        };
        Update: {
          id?: string;
          question_id?: string;
          position?: number;
          text_ru?: string;
          is_correct?: boolean;
          text_uk?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'diagnostic_options_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'diagnostic_questions';
            referencedColumns: ['id'];
          },
        ];
      };
      diagnostic_questions: {
        Row: {
          id: string;
          position: number;
          source_phrase: string;
          german_text: string;
          skill_label: string;
          audio_path: string | null;
          audio_status: 'pending' | 'ready';
          is_active: boolean;
          created_at: string;
          skill_label_uk: string | null;
          is_uk_reviewed: boolean;
        };
        Insert: {
          id?: string;
          position: number;
          source_phrase: string;
          german_text: string;
          skill_label: string;
          audio_path?: string | null;
          audio_status?: 'pending' | 'ready';
          is_active?: boolean;
          created_at?: string;
          skill_label_uk?: string | null;
          is_uk_reviewed?: boolean;
        };
        Update: {
          id?: string;
          position?: number;
          source_phrase?: string;
          german_text?: string;
          skill_label?: string;
          audio_path?: string | null;
          audio_status?: 'pending' | 'ready';
          is_active?: boolean;
          created_at?: string;
          skill_label_uk?: string | null;
          is_uk_reviewed?: boolean;
        };
        Relationships: [];
      };
      entitlements: {
        Row: {
          id: string;
          user_id: string;
          product_code: string;
          status: 'active' | 'revoked' | 'expired';
          source: string;
          granted_at: string;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_code?: string;
          status?: 'active' | 'revoked' | 'expired';
          source?: string;
          granted_at?: string;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_code?: string;
          status?: 'active' | 'revoked' | 'expired';
          source?: string;
          granted_at?: string;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'entitlements_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      favorites: {
        Row: {
          user_id: string;
          item_type: 'phrase' | 'vocabulary' | 'lesson';
          item_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          item_type: 'phrase' | 'vocabulary' | 'lesson';
          item_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          item_type?: 'phrase' | 'vocabulary' | 'lesson';
          item_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'favorites_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      generated_combination_translations: {
        Row: {
          combination_id: string;
          language_code: string;
          text: string;
        };
        Insert: {
          combination_id: string;
          language_code: string;
          text: string;
        };
        Update: {
          combination_id?: string;
          language_code?: string;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'generated_combination_translations_combination_id_fkey';
            columns: ['combination_id'];
            isOneToOne: false;
            referencedRelation: 'generated_combinations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'generated_combination_translations_language_code_fkey';
            columns: ['language_code'];
            isOneToOne: false;
            referencedRelation: 'languages';
            referencedColumns: ['code'];
          },
        ];
      };
      generated_combinations: {
        Row: {
          id: string;
          template_id: string;
          german_text: string;
          slot_values: Json;
          approved: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          german_text: string;
          slot_values?: Json;
          approved?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          german_text?: string;
          slot_values?: Json;
          approved?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'generated_combinations_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'content_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      languages: {
        Row: {
          code: string;
          name_native: string;
          name_en: string;
          is_source: boolean;
          is_active: boolean;
          sort_order: number;
        };
        Insert: {
          code: string;
          name_native: string;
          name_en: string;
          is_source?: boolean;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: {
          code?: string;
          name_native?: string;
          name_en?: string;
          is_source?: boolean;
          is_active?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      lesson_phrases: {
        Row: {
          lesson_id: string;
          phrase_id: string;
          order_index: number;
          role: 'primary' | 'review_pool';
        };
        Insert: {
          lesson_id: string;
          phrase_id: string;
          order_index?: number;
          role?: 'primary' | 'review_pool';
        };
        Update: {
          lesson_id?: string;
          phrase_id?: string;
          order_index?: number;
          role?: 'primary' | 'review_pool';
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_phrases_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_phrases_phrase_id_fkey';
            columns: ['phrase_id'];
            isOneToOne: false;
            referencedRelation: 'phrases';
            referencedColumns: ['id'];
          },
        ];
      };
      lesson_progress: {
        Row: {
          user_id: string;
          lesson_id: string;
          status: string;
          score_percent: number | null;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          user_id: string;
          lesson_id: string;
          status?: string;
          score_percent?: number | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          user_id?: string;
          lesson_id?: string;
          status?: string;
          score_percent?: number | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_progress_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lesson_progress_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      lesson_translations: {
        Row: {
          lesson_id: string;
          language_code: string;
          title: string;
          goal: string | null;
        };
        Insert: {
          lesson_id: string;
          language_code: string;
          title: string;
          goal?: string | null;
        };
        Update: {
          lesson_id?: string;
          language_code?: string;
          title?: string;
          goal?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_translations_language_code_fkey';
            columns: ['language_code'];
            isOneToOne: false;
            referencedRelation: 'languages';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'lesson_translations_lesson_id_fkey';
            columns: ['lesson_id'];
            isOneToOne: false;
            referencedRelation: 'lessons';
            referencedColumns: ['id'];
          },
        ];
      };
      lessons: {
        Row: {
          id: string;
          module_id: string;
          slug: string;
          kind: 'intro' | 'training' | 'listening' | 'mixed' | 'test';
          order_index: number;
          est_minutes: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
          external_id: string | null;
          track: string | null;
          content_module: string | null;
          outcome: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          module_id: string;
          slug: string;
          kind?: 'intro' | 'training' | 'listening' | 'mixed' | 'test';
          order_index?: number;
          est_minutes?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
          external_id?: string | null;
          track?: string | null;
          content_module?: string | null;
          outcome?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          module_id?: string;
          slug?: string;
          kind?: 'intro' | 'training' | 'listening' | 'mixed' | 'test';
          order_index?: number;
          est_minutes?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
          external_id?: string | null;
          track?: string | null;
          content_module?: string | null;
          outcome?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lessons_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'modules';
            referencedColumns: ['id'];
          },
        ];
      };
      module_translations: {
        Row: {
          module_id: string;
          language_code: string;
          title: string;
          description: string | null;
        };
        Insert: {
          module_id: string;
          language_code: string;
          title: string;
          description?: string | null;
        };
        Update: {
          module_id?: string;
          language_code?: string;
          title?: string;
          description?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'module_translations_language_code_fkey';
            columns: ['language_code'];
            isOneToOne: false;
            referencedRelation: 'languages';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'module_translations_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'modules';
            referencedColumns: ['id'];
          },
        ];
      };
      modules: {
        Row: {
          id: string;
          slug: string;
          scope: 'core' | 'profession';
          profession_id: string | null;
          order_index: number;
          min_level: 'B0' | 'B1' | 'B2' | 'B3' | 'B4';
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          scope?: 'core' | 'profession';
          profession_id?: string | null;
          order_index?: number;
          min_level?: 'B0' | 'B1' | 'B2' | 'B3' | 'B4';
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          scope?: 'core' | 'profession';
          profession_id?: string | null;
          order_index?: number;
          min_level?: 'B0' | 'B1' | 'B2' | 'B3' | 'B4';
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'modules_profession_id_fkey';
            columns: ['profession_id'];
            isOneToOne: false;
            referencedRelation: 'professions';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          user_id: string | null;
          provider: string;
          provider_payment_id: string;
          product_code: string;
          amount_cents: number;
          currency: string;
          status: 'pending' | 'succeeded' | 'failed' | 'refunded';
          raw: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          provider?: string;
          provider_payment_id: string;
          product_code?: string;
          amount_cents: number;
          currency?: string;
          status?: 'pending' | 'succeeded' | 'failed' | 'refunded';
          raw?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          provider?: string;
          provider_payment_id?: string;
          product_code?: string;
          amount_cents?: number;
          currency?: string;
          status?: 'pending' | 'succeeded' | 'failed' | 'refunded';
          raw?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      phrase_components: {
        Row: {
          id: string;
          phrase_id: string;
          component_type: 'ACTION' | 'OBJECT' | 'LOCATION' | 'QUANTITY' | 'MEASUREMENT' | 'SEQUENCE' | 'QUALITY' | 'WARNING';
          surface_text: string;
          char_start: number | null;
          char_end: number | null;
          order_index: number;
          vocabulary_item_id: string | null;
        };
        Insert: {
          id?: string;
          phrase_id: string;
          component_type: 'ACTION' | 'OBJECT' | 'LOCATION' | 'QUANTITY' | 'MEASUREMENT' | 'SEQUENCE' | 'QUALITY' | 'WARNING';
          surface_text: string;
          char_start?: number | null;
          char_end?: number | null;
          order_index?: number;
          vocabulary_item_id?: string | null;
        };
        Update: {
          id?: string;
          phrase_id?: string;
          component_type?: 'ACTION' | 'OBJECT' | 'LOCATION' | 'QUANTITY' | 'MEASUREMENT' | 'SEQUENCE' | 'QUALITY' | 'WARNING';
          surface_text?: string;
          char_start?: number | null;
          char_end?: number | null;
          order_index?: number;
          vocabulary_item_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'phrase_components_phrase_id_fkey';
            columns: ['phrase_id'];
            isOneToOne: false;
            referencedRelation: 'phrases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'phrase_components_vocab_fk';
            columns: ['vocabulary_item_id'];
            isOneToOne: false;
            referencedRelation: 'vocabulary_items';
            referencedColumns: ['id'];
          },
        ];
      };
      phrase_families: {
        Row: {
          id: string;
          key: string;
          intent: string;
          notes: string | null;
          created_at: string;
          external_id: string | null;
          kind: 'family' | 'natural_variant';
          content_module: string | null;
          profession_id: string | null;
          status: 'draft' | 'language_review' | 'native_review' | 'trade_review' | 'safety_review' | 'approved' | 'rejected' | 'archived';
          source_ref: string | null;
        };
        Insert: {
          id?: string;
          key: string;
          intent: string;
          notes?: string | null;
          created_at?: string;
          external_id?: string | null;
          kind?: 'family' | 'natural_variant';
          content_module?: string | null;
          profession_id?: string | null;
          status?: 'draft' | 'language_review' | 'native_review' | 'trade_review' | 'safety_review' | 'approved' | 'rejected' | 'archived';
          source_ref?: string | null;
        };
        Update: {
          id?: string;
          key?: string;
          intent?: string;
          notes?: string | null;
          created_at?: string;
          external_id?: string | null;
          kind?: 'family' | 'natural_variant';
          content_module?: string | null;
          profession_id?: string | null;
          status?: 'draft' | 'language_review' | 'native_review' | 'trade_review' | 'safety_review' | 'approved' | 'rejected' | 'archived';
          source_ref?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'phrase_families_profession_id_fkey';
            columns: ['profession_id'];
            isOneToOne: false;
            referencedRelation: 'professions';
            referencedColumns: ['id'];
          },
        ];
      };
      phrase_family_translations: {
        Row: {
          family_id: string;
          language_code: string;
          meaning: string;
        };
        Insert: {
          family_id: string;
          language_code: string;
          meaning: string;
        };
        Update: {
          family_id?: string;
          language_code?: string;
          meaning?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'phrase_family_translations_family_id_fkey';
            columns: ['family_id'];
            isOneToOne: false;
            referencedRelation: 'phrase_families';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'phrase_family_translations_language_code_fkey';
            columns: ['language_code'];
            isOneToOne: false;
            referencedRelation: 'languages';
            referencedColumns: ['code'];
          },
        ];
      };
      phrase_family_variants: {
        Row: {
          id: string;
          family_id: string;
          register_level: number;
          german_text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          register_level: number;
          german_text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          register_level?: number;
          german_text?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'phrase_family_variants_family_id_fkey';
            columns: ['family_id'];
            isOneToOne: false;
            referencedRelation: 'phrase_families';
            referencedColumns: ['id'];
          },
        ];
      };
      phrase_progress: {
        Row: {
          user_id: string;
          phrase_id: string;
          state: 'new' | 'learning' | 'recognizing' | 'understood' | 'weak' | 'mastered';
          correct_count: number;
          incorrect_count: number;
          current_streak: number;
          interval_days: number;
          listening_seen: number;
          listening_correct: number;
          text_seen: number;
          text_correct: number;
          listening_accuracy: number | null;
          text_accuracy: number | null;
          last_seen_at: string | null;
          next_review_at: string;
          updated_at: string;
          last_answer_correct: boolean | null;
        };
        Insert: {
          user_id: string;
          phrase_id: string;
          state?: 'new' | 'learning' | 'recognizing' | 'understood' | 'weak' | 'mastered';
          correct_count?: number;
          incorrect_count?: number;
          current_streak?: number;
          interval_days?: number;
          listening_seen?: number;
          listening_correct?: number;
          text_seen?: number;
          text_correct?: number;
          last_seen_at?: string | null;
          next_review_at?: string;
          updated_at?: string;
          last_answer_correct?: boolean | null;
        };
        Update: {
          user_id?: string;
          phrase_id?: string;
          state?: 'new' | 'learning' | 'recognizing' | 'understood' | 'weak' | 'mastered';
          correct_count?: number;
          incorrect_count?: number;
          current_streak?: number;
          interval_days?: number;
          listening_seen?: number;
          listening_correct?: number;
          text_seen?: number;
          text_correct?: number;
          last_seen_at?: string | null;
          next_review_at?: string;
          updated_at?: string;
          last_answer_correct?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: 'phrase_progress_phrase_id_fkey';
            columns: ['phrase_id'];
            isOneToOne: false;
            referencedRelation: 'phrases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'phrase_progress_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      phrase_translations: {
        Row: {
          phrase_id: string;
          language_code: string;
          text: string;
          pronunciation: string | null;
          literal_hint: string | null;
          keywords: string[];
        };
        Insert: {
          phrase_id: string;
          language_code: string;
          text: string;
          pronunciation?: string | null;
          literal_hint?: string | null;
          keywords?: string[];
        };
        Update: {
          phrase_id?: string;
          language_code?: string;
          text?: string;
          pronunciation?: string | null;
          literal_hint?: string | null;
          keywords?: string[];
        };
        Relationships: [
          {
            foreignKeyName: 'phrase_translations_language_code_fkey';
            columns: ['language_code'];
            isOneToOne: false;
            referencedRelation: 'languages';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'phrase_translations_phrase_id_fkey';
            columns: ['phrase_id'];
            isOneToOne: false;
            referencedRelation: 'phrases';
            referencedColumns: ['id'];
          },
        ];
      };
      phrase_vocabulary: {
        Row: {
          phrase_id: string;
          vocabulary_item_id: string;
        };
        Insert: {
          phrase_id: string;
          vocabulary_item_id: string;
        };
        Update: {
          phrase_id?: string;
          vocabulary_item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'phrase_vocabulary_phrase_id_fkey';
            columns: ['phrase_id'];
            isOneToOne: false;
            referencedRelation: 'phrases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'phrase_vocabulary_vocabulary_item_id_fkey';
            columns: ['vocabulary_item_id'];
            isOneToOne: false;
            referencedRelation: 'vocabulary_items';
            referencedColumns: ['id'];
          },
        ];
      };
      phrases: {
        Row: {
          id: string;
          german_text: string;
          natural_variant: string | null;
          formal_variant: string | null;
          intent: string | null;
          speaker: 'bauleiter' | 'polier' | 'colleague' | 'worker' | 'customer';
          direction: 'DE_TO_L1' | 'L1_TO_DE';
          family_id: string | null;
          register_level: number;
          difficulty: number;
          frequency_score: number;
          min_level: 'B0' | 'B1' | 'B2' | 'B3' | 'B4';
          profession_id: string | null;
          safety_sensitive: boolean;
          safety_approved: boolean;
          verification_status: 'draft' | 'language_review' | 'native_review' | 'trade_review' | 'safety_review' | 'approved' | 'rejected' | 'archived';
          verified: boolean | null;
          source_type: 'manual' | 'field_collected' | 'imported' | 'template_generated';
          is_free_preview: boolean;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          external_id: string | null;
          priority: 'A' | 'B' | 'C' | null;
          stage: 'SURVIVAL' | 'WORKING_CORE' | 'TRADE' | null;
          content_module: string | null;
          source_ref: string | null;
          confidence: string | null;
        };
        Insert: {
          id?: string;
          german_text: string;
          natural_variant?: string | null;
          formal_variant?: string | null;
          intent?: string | null;
          speaker?: 'bauleiter' | 'polier' | 'colleague' | 'worker' | 'customer';
          direction?: 'DE_TO_L1' | 'L1_TO_DE';
          family_id?: string | null;
          register_level?: number;
          difficulty?: number;
          frequency_score?: number;
          min_level?: 'B0' | 'B1' | 'B2' | 'B3' | 'B4';
          profession_id?: string | null;
          safety_sensitive?: boolean;
          safety_approved?: boolean;
          verification_status?: 'draft' | 'language_review' | 'native_review' | 'trade_review' | 'safety_review' | 'approved' | 'rejected' | 'archived';
          source_type?: 'manual' | 'field_collected' | 'imported' | 'template_generated';
          is_free_preview?: boolean;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          external_id?: string | null;
          priority?: 'A' | 'B' | 'C' | null;
          stage?: 'SURVIVAL' | 'WORKING_CORE' | 'TRADE' | null;
          content_module?: string | null;
          source_ref?: string | null;
          confidence?: string | null;
        };
        Update: {
          id?: string;
          german_text?: string;
          natural_variant?: string | null;
          formal_variant?: string | null;
          intent?: string | null;
          speaker?: 'bauleiter' | 'polier' | 'colleague' | 'worker' | 'customer';
          direction?: 'DE_TO_L1' | 'L1_TO_DE';
          family_id?: string | null;
          register_level?: number;
          difficulty?: number;
          frequency_score?: number;
          min_level?: 'B0' | 'B1' | 'B2' | 'B3' | 'B4';
          profession_id?: string | null;
          safety_sensitive?: boolean;
          safety_approved?: boolean;
          verification_status?: 'draft' | 'language_review' | 'native_review' | 'trade_review' | 'safety_review' | 'approved' | 'rejected' | 'archived';
          source_type?: 'manual' | 'field_collected' | 'imported' | 'template_generated';
          is_free_preview?: boolean;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          external_id?: string | null;
          priority?: 'A' | 'B' | 'C' | null;
          stage?: 'SURVIVAL' | 'WORKING_CORE' | 'TRADE' | null;
          content_module?: string | null;
          source_ref?: string | null;
          confidence?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'phrases_family_id_fkey';
            columns: ['family_id'];
            isOneToOne: false;
            referencedRelation: 'phrase_families';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'phrases_profession_id_fkey';
            columns: ['profession_id'];
            isOneToOne: false;
            referencedRelation: 'professions';
            referencedColumns: ['id'];
          },
        ];
      };
      processed_webhook_events: {
        Row: {
          provider: string;
          event_id: string;
          received_at: string;
        };
        Insert: {
          provider: string;
          event_id: string;
          received_at?: string;
        };
        Update: {
          provider?: string;
          event_id?: string;
          received_at?: string;
        };
        Relationships: [];
      };
      production_gates: {
        Row: {
          gate: string;
          scope: string;
          content: string | null;
          reviewer: string | null;
          status: string;
          rule: string | null;
          updated_at: string;
        };
        Insert: {
          gate: string;
          scope: string;
          content?: string | null;
          reviewer?: string | null;
          status: string;
          rule?: string | null;
          updated_at?: string;
        };
        Update: {
          gate?: string;
          scope?: string;
          content?: string | null;
          reviewer?: string | null;
          status?: string;
          rule?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profession_translations: {
        Row: {
          profession_id: string;
          language_code: string;
          name: string;
          description: string | null;
        };
        Insert: {
          profession_id: string;
          language_code: string;
          name: string;
          description?: string | null;
        };
        Update: {
          profession_id?: string;
          language_code?: string;
          name?: string;
          description?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'profession_translations_language_code_fkey';
            columns: ['language_code'];
            isOneToOne: false;
            referencedRelation: 'languages';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'profession_translations_profession_id_fkey';
            columns: ['profession_id'];
            isOneToOne: false;
            referencedRelation: 'professions';
            referencedColumns: ['id'];
          },
        ];
      };
      professions: {
        Row: {
          id: string;
          slug: string;
          icon: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          icon?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          icon?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          role: 'user' | 'admin';
          display_name: string | null;
          ui_locale: string;
          self_level: 'none' | 'words' | 'simple_commands' | 'some_speaking' | null;
          current_level: 'B0' | 'B1' | 'B2' | 'B3' | 'B4';
          primary_profession_id: string | null;
          onboarding_completed: boolean;
          daily_goal_minutes: number;
          streak_days: number;
          last_active_on: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: 'user' | 'admin';
          display_name?: string | null;
          ui_locale?: string;
          self_level?: 'none' | 'words' | 'simple_commands' | 'some_speaking' | null;
          current_level?: 'B0' | 'B1' | 'B2' | 'B3' | 'B4';
          primary_profession_id?: string | null;
          onboarding_completed?: boolean;
          daily_goal_minutes?: number;
          streak_days?: number;
          last_active_on?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: 'user' | 'admin';
          display_name?: string | null;
          ui_locale?: string;
          self_level?: 'none' | 'words' | 'simple_commands' | 'some_speaking' | null;
          current_level?: 'B0' | 'B1' | 'B2' | 'B3' | 'B4';
          primary_profession_id?: string | null;
          onboarding_completed?: boolean;
          daily_goal_minutes?: number;
          streak_days?: number;
          last_active_on?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profiles_primary_profession_id_fkey';
            columns: ['primary_profession_id'];
            isOneToOne: false;
            referencedRelation: 'professions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profiles_ui_locale_fkey';
            columns: ['ui_locale'];
            isOneToOne: false;
            referencedRelation: 'languages';
            referencedColumns: ['code'];
          },
        ];
      };
      review_queue: {
        Row: {
          id: string;
          area: string;
          issue: string;
          reviewer: string | null;
          decision: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          area: string;
          issue: string;
          reviewer?: string | null;
          decision: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          area?: string;
          issue?: string;
          reviewer?: string | null;
          decision?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      search_queries: {
        Row: {
          id: string;
          user_id: string | null;
          query_text: string;
          query_language: string;
          results_count: number;
          clicked_phrase_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          query_text: string;
          query_language?: string;
          results_count?: number;
          clicked_phrase_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          query_text?: string;
          query_language?: string;
          results_count?: number;
          clicked_phrase_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'search_queries_clicked_phrase_id_fkey';
            columns: ['clicked_phrase_id'];
            isOneToOne: false;
            referencedRelation: 'phrases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'search_queries_query_language_fkey';
            columns: ['query_language'];
            isOneToOne: false;
            referencedRelation: 'languages';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'search_queries_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      template_slot_option_translations: {
        Row: {
          option_id: string;
          language_code: string;
          text: string;
        };
        Insert: {
          option_id: string;
          language_code: string;
          text: string;
        };
        Update: {
          option_id?: string;
          language_code?: string;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'template_slot_option_translations_language_code_fkey';
            columns: ['language_code'];
            isOneToOne: false;
            referencedRelation: 'languages';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'template_slot_option_translations_option_id_fkey';
            columns: ['option_id'];
            isOneToOne: false;
            referencedRelation: 'template_slot_options';
            referencedColumns: ['id'];
          },
        ];
      };
      template_slot_options: {
        Row: {
          id: string;
          slot_id: string;
          german_surface: string;
          vocabulary_item_id: string | null;
          approved: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slot_id: string;
          german_surface: string;
          vocabulary_item_id?: string | null;
          approved?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slot_id?: string;
          german_surface?: string;
          vocabulary_item_id?: string | null;
          approved?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'template_slot_options_slot_id_fkey';
            columns: ['slot_id'];
            isOneToOne: false;
            referencedRelation: 'template_slots';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'template_slot_options_vocabulary_item_id_fkey';
            columns: ['vocabulary_item_id'];
            isOneToOne: false;
            referencedRelation: 'vocabulary_items';
            referencedColumns: ['id'];
          },
        ];
      };
      template_slots: {
        Row: {
          id: string;
          template_id: string;
          slot_key: string;
          component_type: 'ACTION' | 'OBJECT' | 'LOCATION' | 'QUANTITY' | 'MEASUREMENT' | 'SEQUENCE' | 'QUALITY' | 'WARNING';
          position: number;
        };
        Insert: {
          id?: string;
          template_id: string;
          slot_key: string;
          component_type: 'ACTION' | 'OBJECT' | 'LOCATION' | 'QUANTITY' | 'MEASUREMENT' | 'SEQUENCE' | 'QUALITY' | 'WARNING';
          position?: number;
        };
        Update: {
          id?: string;
          template_id?: string;
          slot_key?: string;
          component_type?: 'ACTION' | 'OBJECT' | 'LOCATION' | 'QUANTITY' | 'MEASUREMENT' | 'SEQUENCE' | 'QUALITY' | 'WARNING';
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'template_slots_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'content_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      test_answers: {
        Row: {
          id: string;
          attempt_id: string;
          question_id: string;
          selected_option_id: string | null;
          is_correct: boolean;
          response_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          question_id: string;
          selected_option_id?: string | null;
          is_correct?: boolean;
          response_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          attempt_id?: string;
          question_id?: string;
          selected_option_id?: string | null;
          is_correct?: boolean;
          response_ms?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'test_answers_attempt_id_fkey';
            columns: ['attempt_id'];
            isOneToOne: false;
            referencedRelation: 'test_attempts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'test_answers_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'test_questions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'test_answers_selected_option_id_fkey';
            columns: ['selected_option_id'];
            isOneToOne: false;
            referencedRelation: 'test_question_options';
            referencedColumns: ['id'];
          },
        ];
      };
      test_attempts: {
        Row: {
          id: string;
          user_id: string;
          test_id: string;
          started_at: string;
          finished_at: string | null;
          total_questions: number;
          total_correct: number;
          scores: Json;
        };
        Insert: {
          id?: string;
          user_id: string;
          test_id: string;
          started_at?: string;
          finished_at?: string | null;
          total_questions?: number;
          total_correct?: number;
          scores?: Json;
        };
        Update: {
          id?: string;
          user_id?: string;
          test_id?: string;
          started_at?: string;
          finished_at?: string | null;
          total_questions?: number;
          total_correct?: number;
          scores?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'test_attempts_test_id_fkey';
            columns: ['test_id'];
            isOneToOne: false;
            referencedRelation: 'tests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'test_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      test_question_option_translations: {
        Row: {
          option_id: string;
          language_code: string;
          text: string;
        };
        Insert: {
          option_id: string;
          language_code: string;
          text: string;
        };
        Update: {
          option_id?: string;
          language_code?: string;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'test_question_option_translations_language_code_fkey';
            columns: ['language_code'];
            isOneToOne: false;
            referencedRelation: 'languages';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'test_question_option_translations_option_id_fkey';
            columns: ['option_id'];
            isOneToOne: false;
            referencedRelation: 'test_question_options';
            referencedColumns: ['id'];
          },
        ];
      };
      test_question_options: {
        Row: {
          id: string;
          question_id: string;
          order_index: number;
          is_correct: boolean;
          german_text: string | null;
        };
        Insert: {
          id?: string;
          question_id: string;
          order_index?: number;
          is_correct?: boolean;
          german_text?: string | null;
        };
        Update: {
          id?: string;
          question_id?: string;
          order_index?: number;
          is_correct?: boolean;
          german_text?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'test_question_options_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'test_questions';
            referencedColumns: ['id'];
          },
        ];
      };
      test_questions: {
        Row: {
          id: string;
          test_id: string;
          question_type: 'audio_to_translation' | 'de_to_l1' | 'l1_to_de' | 'audio_to_reaction' | 'audio_identify_object' | 'audio_identify_measurement' | 'audio_identify_location' | 'audio_identify_sequence' | 'unseen_combination';
          phrase_id: string | null;
          combination_id: string | null;
          prompt_mode: string;
          order_index: number;
          scoring_bucket: string | null;
        };
        Insert: {
          id?: string;
          test_id: string;
          question_type: 'audio_to_translation' | 'de_to_l1' | 'l1_to_de' | 'audio_to_reaction' | 'audio_identify_object' | 'audio_identify_measurement' | 'audio_identify_location' | 'audio_identify_sequence' | 'unseen_combination';
          phrase_id?: string | null;
          combination_id?: string | null;
          prompt_mode?: string;
          order_index?: number;
          scoring_bucket?: string | null;
        };
        Update: {
          id?: string;
          test_id?: string;
          question_type?: 'audio_to_translation' | 'de_to_l1' | 'l1_to_de' | 'audio_to_reaction' | 'audio_identify_object' | 'audio_identify_measurement' | 'audio_identify_location' | 'audio_identify_sequence' | 'unseen_combination';
          phrase_id?: string | null;
          combination_id?: string | null;
          prompt_mode?: string;
          order_index?: number;
          scoring_bucket?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'test_questions_combination_id_fkey';
            columns: ['combination_id'];
            isOneToOne: false;
            referencedRelation: 'generated_combinations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'test_questions_phrase_id_fkey';
            columns: ['phrase_id'];
            isOneToOne: false;
            referencedRelation: 'phrases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'test_questions_test_id_fkey';
            columns: ['test_id'];
            isOneToOne: false;
            referencedRelation: 'tests';
            referencedColumns: ['id'];
          },
        ];
      };
      test_templates: {
        Row: {
          id: string;
          test_type: string;
          track: string;
          mechanic: string;
          distractor_rule: string | null;
          skill: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          test_type: string;
          track: string;
          mechanic: string;
          distractor_rule?: string | null;
          skill?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          test_type?: string;
          track?: string;
          mechanic?: string;
          distractor_rule?: string | null;
          skill?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tests: {
        Row: {
          id: string;
          slug: string;
          kind: 'diagnostic' | 'lesson' | 'module' | 'final';
          module_id: string | null;
          profession_id: string | null;
          question_count: number;
          pass_percent: number;
          is_published: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          kind: 'diagnostic' | 'lesson' | 'module' | 'final';
          module_id?: string | null;
          profession_id?: string | null;
          question_count?: number;
          pass_percent?: number;
          is_published?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          kind?: 'diagnostic' | 'lesson' | 'module' | 'final';
          module_id?: string | null;
          profession_id?: string | null;
          question_count?: number;
          pass_percent?: number;
          is_published?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tests_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'modules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tests_profession_id_fkey';
            columns: ['profession_id'];
            isOneToOne: false;
            referencedRelation: 'professions';
            referencedColumns: ['id'];
          },
        ];
      };
      user_attribution: {
        Row: {
          user_id: string;
          anonymous_id: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          utm_term: string | null;
          landing_variant: string | null;
          first_seen_at: string;
        };
        Insert: {
          user_id: string;
          anonymous_id?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_term?: string | null;
          landing_variant?: string | null;
          first_seen_at?: string;
        };
        Update: {
          user_id?: string;
          anonymous_id?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_term?: string | null;
          landing_variant?: string | null;
          first_seen_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_attribution_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      user_professions: {
        Row: {
          user_id: string;
          profession_id: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          profession_id: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          profession_id?: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_professions_profession_id_fkey';
            columns: ['profession_id'];
            isOneToOne: false;
            referencedRelation: 'professions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_professions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      vocabulary_items: {
        Row: {
          id: string;
          german_term: string;
          formal_term: string | null;
          colloquial_term: string | null;
          article: string | null;
          plural_form: string | null;
          part_of_speech: string;
          category: string | null;
          profession_id: string | null;
          frequency: number;
          difficulty: number;
          safety_sensitive: boolean;
          verification_status: 'draft' | 'language_review' | 'native_review' | 'trade_review' | 'safety_review' | 'approved' | 'rejected' | 'archived';
          verified: boolean | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          external_id: string | null;
          priority: 'A' | 'B' | 'C' | null;
          content_module: string | null;
          colloquial_note: string | null;
          source_ref: string | null;
          confidence: string | null;
        };
        Insert: {
          id?: string;
          german_term: string;
          formal_term?: string | null;
          colloquial_term?: string | null;
          article?: string | null;
          plural_form?: string | null;
          part_of_speech?: string;
          category?: string | null;
          profession_id?: string | null;
          frequency?: number;
          difficulty?: number;
          safety_sensitive?: boolean;
          verification_status?: 'draft' | 'language_review' | 'native_review' | 'trade_review' | 'safety_review' | 'approved' | 'rejected' | 'archived';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          external_id?: string | null;
          priority?: 'A' | 'B' | 'C' | null;
          content_module?: string | null;
          colloquial_note?: string | null;
          source_ref?: string | null;
          confidence?: string | null;
        };
        Update: {
          id?: string;
          german_term?: string;
          formal_term?: string | null;
          colloquial_term?: string | null;
          article?: string | null;
          plural_form?: string | null;
          part_of_speech?: string;
          category?: string | null;
          profession_id?: string | null;
          frequency?: number;
          difficulty?: number;
          safety_sensitive?: boolean;
          verification_status?: 'draft' | 'language_review' | 'native_review' | 'trade_review' | 'safety_review' | 'approved' | 'rejected' | 'archived';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          external_id?: string | null;
          priority?: 'A' | 'B' | 'C' | null;
          content_module?: string | null;
          colloquial_note?: string | null;
          source_ref?: string | null;
          confidence?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'vocabulary_items_profession_id_fkey';
            columns: ['profession_id'];
            isOneToOne: false;
            referencedRelation: 'professions';
            referencedColumns: ['id'];
          },
        ];
      };
      vocabulary_translations: {
        Row: {
          vocabulary_item_id: string;
          language_code: string;
          term: string;
          synonyms: string[];
          pronunciation: string | null;
        };
        Insert: {
          vocabulary_item_id: string;
          language_code: string;
          term: string;
          synonyms?: string[];
          pronunciation?: string | null;
        };
        Update: {
          vocabulary_item_id?: string;
          language_code?: string;
          term?: string;
          synonyms?: string[];
          pronunciation?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'vocabulary_translations_language_code_fkey';
            columns: ['language_code'];
            isOneToOne: false;
            referencedRelation: 'languages';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'vocabulary_translations_vocabulary_item_id_fkey';
            columns: ['vocabulary_item_id'];
            isOneToOne: false;
            referencedRelation: 'vocabulary_items';
            referencedColumns: ['id'];
          },
        ];
      };
      voices: {
        Row: {
          id: string;
          provider: string;
          provider_voice_id: string;
          label: string;
          gender: string | null;
          role_hint: 'bauleiter' | 'polier' | 'colleague' | 'worker' | 'customer' | null;
          is_active: boolean;
          notes: string | null;
        };
        Insert: {
          id?: string;
          provider?: string;
          provider_voice_id: string;
          label: string;
          gender?: string | null;
          role_hint?: 'bauleiter' | 'polier' | 'colleague' | 'worker' | 'customer' | null;
          is_active?: boolean;
          notes?: string | null;
        };
        Update: {
          id?: string;
          provider?: string;
          provider_voice_id?: string;
          label?: string;
          gender?: string | null;
          role_hint?: 'bauleiter' | 'polier' | 'colleague' | 'worker' | 'customer' | null;
          is_active?: boolean;
          notes?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      accessible_lessons: { Args: Record<string, never>; Returns: { lesson_id: string | null; lesson_slug: string | null; module_id: string | null; module_order: number | null; lesson_order: number | null; scope: 'core' | 'profession' | null; profession_id: string | null }[] };
      complete_lesson: { Args: { p_lesson_id: string }; Returns: boolean };
      course_progress: { Args: Record<string, never>; Returns: { lessons_total: number | null; lessons_completed: number | null; phrases_total: number | null; phrases_learned: number | null; phrases_started: number | null }[] };
      due_review_phrases: { Args: { p_limit?: number }; Returns: { phrase_id: string | null; state: 'new' | 'learning' | 'recognizing' | 'understood' | 'weak' | 'mastered' | null; next_review_at: string | null }[] };
      funnel_summary: { Args: { p_from?: string; p_to?: string; p_locale?: string }; Returns: { utm_campaign: string | null; landing_locale: string | null; landing_views: number | null; tests_started: number | null; tests_completed: number | null; offers_viewed: number | null; purchase_clicks: number | null; checkouts_started: number | null; purchases: number | null }[] };
      handle_new_user: { Args: Record<string, never>; Returns: unknown };
      has_full_access: { Args: Record<string, never>; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      next_lesson: { Args: Record<string, never>; Returns: string };
      next_progress_state: { Args: { p_current: 'new' | 'learning' | 'recognizing' | 'understood' | 'weak' | 'mastered'; p_correct: boolean }; Returns: 'new' | 'learning' | 'recognizing' | 'understood' | 'weak' | 'mastered' };
      next_review_interval: { Args: { p_state: 'new' | 'learning' | 'recognizing' | 'understood' | 'weak' | 'mastered' }; Returns: string };
      phrase_is_public: { Args: { p: unknown }; Returns: boolean };
      prevent_role_escalation: { Args: Record<string, never>; Returns: unknown };
      record_answer: { Args: { p_phrase_id: string; p_correct: boolean }; Returns: { state: 'new' | 'learning' | 'recognizing' | 'understood' | 'weak' | 'mastered' | null; next_review_at: string | null }[] };
      start_lesson: { Args: { p_lesson_id: string }; Returns: undefined };
      touch_updated_at: { Args: Record<string, never>; Returns: unknown };
      user_id_by_email: { Args: { p_email: string }; Returns: string | null };
      count_scope_phrases: { Args: { p_scope: string }; Returns: number };
    };
    Enums: {
      app_role: 'user' | 'admin';
      audio_asset_status: 'pending' | 'generated' | 'approved' | 'rejected';
      audio_availability: 'pending' | 'ready';
      audio_speed: 'slow' | 'normal' | 'natural';
      component_type: 'ACTION' | 'OBJECT' | 'LOCATION' | 'QUANTITY' | 'MEASUREMENT' | 'SEQUENCE' | 'QUALITY' | 'WARNING';
      content_priority: 'A' | 'B' | 'C';
      content_stage: 'SURVIVAL' | 'WORKING_CORE' | 'TRADE';
      entitlement_status: 'active' | 'revoked' | 'expired';
      family_kind: 'family' | 'natural_variant';
      favorite_type: 'phrase' | 'vocabulary' | 'lesson';
      job_status: 'queued' | 'running' | 'done' | 'failed';
      lead_status: 'pending' | 'contacted' | 'converted' | 'dismissed';
      lesson_kind: 'intro' | 'training' | 'listening' | 'mixed' | 'test';
      lesson_phrase_role: 'primary' | 'review_pool';
      module_scope: 'core' | 'profession';
      payment_status: 'pending' | 'succeeded' | 'failed' | 'refunded';
      phrase_direction: 'DE_TO_L1' | 'L1_TO_DE';
      progress_state: 'new' | 'learning' | 'recognizing' | 'understood' | 'weak' | 'mastered';
      question_type: 'audio_to_translation' | 'de_to_l1' | 'l1_to_de' | 'audio_to_reaction' | 'audio_identify_object' | 'audio_identify_measurement' | 'audio_identify_location' | 'audio_identify_sequence' | 'unseen_combination';
      self_reported_level: 'none' | 'words' | 'simple_commands' | 'some_speaking';
      skill_level: 'B0' | 'B1' | 'B2' | 'B3' | 'B4';
      source_type: 'manual' | 'field_collected' | 'imported' | 'template_generated';
      speaker_type: 'bauleiter' | 'polier' | 'colleague' | 'worker' | 'customer';
      test_kind: 'diagnostic' | 'lesson' | 'module' | 'final';
      verification_status: 'draft' | 'language_review' | 'native_review' | 'trade_review' | 'safety_review' | 'approved' | 'rejected' | 'archived';
    };
    CompositeTypes: Record<never, never>;
  };
};
