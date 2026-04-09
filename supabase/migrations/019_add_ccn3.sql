-- Migration 019: Add ccn3 (ISO 3166-1 numeric) column to countries table
-- Required for WorldMapView feature ID lookups (Natural Earth GeoJSON uses numeric CCN3 as feature IDs)
-- Run this in: Supabase Dashboard → SQL Editor → New Query

alter table public.countries
  add column if not exists ccn3 text default '';
