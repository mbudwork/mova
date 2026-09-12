-- =============================================================================
-- MOVA — checkout_consents
--
-- Referenced by src/lib/legal/consent.ts, src/app/checkout/actions.ts and
-- src/app/api/stripe/webhook/route.ts (and already described in
-- src/types/database.ts) since the Stripe checkout was wired up, but the
-- table itself was never created by a migration. Every call to
-- recordCheckoutConsent() therefore failed at the database with an
-- "unknown relation" error, which startStripeCheckout surfaces to the buyer
-- as the generic "Не получилось отправить заявку" message right before
-- payment — this migration is that missing piece.
--
-- Written with the admin (service role) client only, so RLS here is a
-- defence-in-depth backstop, not the primary access control.
-- =============================================================================

create table checkout_consents (
  id                             uuid primary key default gen_random_uuid(),
  user_id                        uuid references profiles(id) on delete set null,
  email                          text,
  locale                         text references languages(code),

  terms_version                  text not null,
  refund_policy_version          text not null,
  privacy_version                text not null,
  consent_form_version           text not null,
  terms_consent_text             text not null,
  immediate_access_consent_text  text not null,
  terms_accepted                 boolean not null default false,
  immediate_access_accepted      boolean not null default false,

  ip_address                     text,
  user_agent                     text,

  stripe_checkout_session_id     text,
  payment_status                 text default 'pending',
  entitlement_granted_at         timestamptz,
  confirmation_email_sent_at     timestamptz,

  consented_at                   timestamptz not null default now()
);

-- The webhook looks this row up by id (session.metadata.consent_id) and the
-- checkout return page needs to find it by Stripe session id.
create unique index checkout_consents_stripe_session_idx
  on checkout_consents (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index checkout_consents_user_idx on checkout_consents (user_id, consented_at desc);

alter table checkout_consents enable row level security;

-- Written exclusively via the service role client (recordCheckoutConsent,
-- attachSessionToConsent, the Stripe webhook), which bypasses RLS. No
-- policy grants insert/update to authenticated or anon on purpose: a
-- consent record is proof of what was accepted before payment, and it must
-- not be forgeable or editable from the client.
create policy checkout_consents_own on public.checkout_consents
  for select to authenticated using (user_id = auth.uid());

create policy checkout_consents_admin on public.checkout_consents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.checkout_consents to authenticated;
