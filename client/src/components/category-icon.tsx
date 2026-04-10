import { School, Palette, Users, BookOpen, type LucideProps } from "lucide-react";

const CATEGORY_ICONS: Record<string, React.FC<LucideProps>> = {
  liceu: School,
  hobby: Palette,
  sfaturi: Users,
  general: BookOpen,
};

interface CategoryIconProps extends LucideProps {
  category: string;
}

export function CategoryIcon({ category, className, ...props }: CategoryIconProps) {
  const Icon = CATEGORY_ICONS[category] || BookOpen;
  return <Icon className={className} {...props} />;
}
