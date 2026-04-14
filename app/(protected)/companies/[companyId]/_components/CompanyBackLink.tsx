import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompanyBackLinkProps {
  href: string;
  label: string;
}

export function CompanyBackLink({ href, label }: CompanyBackLinkProps) {
  return (
    <Button asChild variant="ghost" className="h-10 px-0 text-sm font-medium">
      <Link href={href}>
        <ArrowLeft className="size-4" />
        {label}
      </Link>
    </Button>
  );
}
