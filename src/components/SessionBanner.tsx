import { useAuth } from '@/contexts/AuthContext';

export function SessionBanner() {
  const { user } = useAuth();
  if (user) return null;
  
  return (
    <div className="w-full bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-xl p-3 my-2 text-sm text-yellow-900 dark:text-yellow-100">
      للمزامنة السحابيّة، رجاءً سجّل الدخول. ستعمل الإدخالات أوفلاين وتُزامَن لاحقًا.
    </div>
  );
}
