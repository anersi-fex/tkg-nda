import { NavBar } from "@/components/nav-bar";
import { requirePage } from "@/lib/auth";
import { initialsOf } from "@/lib/document";
import { loadSettings } from "@/lib/settings";
import { logout } from "@/app/login/actions";

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  await requirePage();
  const settings = await loadSettings();
  return (
    <>
      <NavBar initials={initialsOf(settings.ownerName) || "A"} onLogout={logout} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-10">{children}</main>
    </>
  );
}
