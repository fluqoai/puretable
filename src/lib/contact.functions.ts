import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifyContactSubmission } from "@/lib/email.server";

const MessageSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255).or(z.literal("")),
  subject: z.string().trim().max(200),
  message: z.string().trim().min(1).max(4000),
});

export const submitContactMessage = createServerFn({ method: "POST" })
  .validator((input: unknown) => MessageSchema.parse(input))
  .handler(async ({ data }) => {
    const id = crypto.randomUUID();
    const email = data.email || null;
    const subject = data.subject || null;
    const { error } = await supabaseAdmin.from("contact_messages").insert({
      id,
      name: data.name,
      email,
      subject,
      message: data.message,
    });
    if (error) throw new Error(error.message);
    await notifyContactSubmission({ id, name: data.name, email, subject, message: data.message });
    return { ok: true };
  });
