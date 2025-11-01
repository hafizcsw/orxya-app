type Props = { tone?: "neutral"|"success"|"warn"|"danger"|"info"; children: any; className?: string };

export default function Badge({ tone="neutral", children, className="" }: Props) {
  const map = {
    neutral: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    warn:    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    danger:  "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    info:    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[tone]} ${className}`}>{children}</span>;
}
