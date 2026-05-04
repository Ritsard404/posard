"use client";

import { createClient } from "@/lib/supabase/client";
import {
  sanitizeCustomerDisplayDTO,
  type CustomerDisplayDTO,
} from "./_dto/customer-display.dto";

type CustomerDisplayChangePayload = {
  new: {
    payload?: unknown;
  };
};

export function subscribeToCustomerDisplay(
  terminalId: string,
  onDisplay: (display: CustomerDisplayDTO) => void,
  onError?: () => void,
  onLive?: () => void,
) {
  const supabase = createClient();
  const channel = supabase
    .channel(`customer-display:${terminalId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "customer_display_state",
        filter: `terminal_id=eq.${terminalId}`,
      },
      (payload: CustomerDisplayChangePayload) => {
        onDisplay(sanitizeCustomerDisplayDTO(payload.new.payload, terminalId));
      },
    );

  let closed = false;

  async function start() {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      supabase.realtime.setAuth(data.session.access_token);
    }

    if (closed) {
      return;
    }

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        onLive?.();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        onError?.();
      }
    });
  }

  void start();

  return () => {
    closed = true;
    void supabase.removeChannel(channel);
  };
}
