import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const LOOPS_API_BASE = "https://app.loops.so/api/v1";

serve(async (req: Request) => {
  // Only accept POST requests (from Supabase Database Webhook)
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const loopsApiKey = Deno.env.get("LOOPS_API_KEY");
  if (!loopsApiKey) {
    console.error("LOOPS_API_KEY not set");
    return new Response("Server configuration error", { status: 500 });
  }

  try {
    const payload = await req.json();

    // Supabase Database Webhook sends: { type, table, record, schema, old_record }
    const record = payload.record;
    if (!record?.email) {
      console.error("No email in payload:", JSON.stringify(payload));
      return new Response("No email in record", { status: 400 });
    }

    const headers = {
      Authorization: `Bearer ${loopsApiKey}`,
      "Content-Type": "application/json",
    };

    // Step 1: Create contact in Loops
    const contactRes = await fetch(`${LOOPS_API_BASE}/contacts/create`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: record.email,
        firstName: record.name || "",
        source: "100k-signup",
        tier: record.tier || "",
        city: record.city || "",
      }),
    });

    const contactData = await contactRes.json();
    console.log("Loops contact create:", JSON.stringify(contactData));

    // If contact already exists, that's fine — continue to send event
    if (!contactRes.ok && !contactData.message?.includes("already exists")) {
      console.error("Failed to create contact:", JSON.stringify(contactData));
      return new Response("Failed to create contact", { status: 500 });
    }

    // Step 2: Send event to trigger the drip Loop
    const eventRes = await fetch(`${LOOPS_API_BASE}/events/send`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: record.email,
        eventName: "newsletter_signup",
      }),
    });

    const eventData = await eventRes.json();
    console.log("Loops event send:", JSON.stringify(eventData));

    if (!eventRes.ok) {
      console.error("Failed to send event:", JSON.stringify(eventData));
      return new Response("Failed to send event", { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
