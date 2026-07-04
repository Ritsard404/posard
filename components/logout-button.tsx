"use client";

import { Button } from "@/components/ui/button";
import { clearClientSessionForLogout } from "@/lib/auth/client-logout";

export function LogoutButton() {
  const logout = async () => {
    try {
      await clearClientSessionForLogout();
    } finally {
      window.location.assign("/auth/logout");
    }
  };

  return <Button onClick={logout}>Logout</Button>;
}
