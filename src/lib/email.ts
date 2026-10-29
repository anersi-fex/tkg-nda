import "server-only";

/**
 * Emails a signed copy through Resend's HTTP API. Optional: without RESEND_API_KEY and
 * EMAIL_FROM nothing is sent and the signer downloads the PDF instead. Logs carry no addresses.
 */
export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}

export async function sendSignedCopy(input: { to: string[]; subject: string; text: string; pdf: Uint8Array; filename: string }): Promise<boolean> {
  if (!emailConfigured() || input.to.length === 0) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        text: input.text,
        attachments: [{ filename: input.filename, content: Buffer.from(input.pdf).toString("base64") }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`email_send_failed status=${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`email_send_failed ${err instanceof Error ? err.name : "error"}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}
