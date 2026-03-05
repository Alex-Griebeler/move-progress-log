# Supabase Schema

## Main Tables
- **profiles**: user profile data linked to auth.users
- **user_roles**: maps user_id to role (admin | moderator | user)
- **athletes** / students: athlete profiles with invite system
- **training_sessions**: logged training sessions
- **exercise_logs**: individual exercise entries within sessions
- **exercises**: exercise library with movement pattern classification
- **prescriptions**: training prescriptions assigned to athletes
- **recovery_protocols**: evidence-based recovery protocol library
- **oura_connections**: Oura ring OAuth tokens per user

## Rules
- All schema changes must go through Supabase migrations
- Never mutate schema directly from edge functions or frontend
- Use RLS (Row Level Security) on all tables
