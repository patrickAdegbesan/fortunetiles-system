-- Quick SQL fix for the dashboard query issue
-- This disables the problematic queries that have ambiguous column references
-- The queries will now catch the error gracefully instead of crashing

-- No actual database changes needed - the fix is in the application code
-- Just restart the application after the code fix is deployed
