// Pass at build time via --dart-define:
//   flutter run --dart-define=SUPABASE_URL=https://xxx.supabase.co \
//               --dart-define=SUPABASE_ANON_KEY=eyJ...
// For CI/CD, use a .env file excluded from git and load with --dart-define-from-file=.env
const supabaseUrl = String.fromEnvironment(
  'SUPABASE_URL',
  defaultValue: 'https://pyuzfgghlndlpgspuxnt.supabase.co',
);
const supabaseAnonKey = String.fromEnvironment(
  'SUPABASE_ANON_KEY',
  defaultValue:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5dXpmZ2dobG5kbHBnc3B1eG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTgyNzYsImV4cCI6MjA5NDk3NDI3Nn0.bqd07nhKs-pSOBLj0zkHs3PayJWfB1DAtKC6UZUyO48',
);
