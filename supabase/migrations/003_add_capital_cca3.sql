-- ─── GeoQuest Feature Expansion — Migration 003 ─────────────────────────────
-- Adds cca3 and capital columns to the countries table
-- Run this in: Supabase Dashboard → SQL Editor → New Query

-- Add cca3 column (ISO 3166-1 alpha-3)
alter table public.countries
  add column if not exists cca3 text default '';

-- Add capital column
alter table public.countries
  add column if not exists capital text default '';
