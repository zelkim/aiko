import { auth } from "@/lib/auth";

export async function batchCreateEvents(calendarId: string, events: any[], headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new Error("Not authenticated");

  const tokenData = await auth.api.getAccessToken({
    body: { providerId: "google" },
    headers,
  });

  if (!tokenData?.accessToken) throw new Error("No Google access token available. Please re-authenticate.");

  const boundary = "batch_calendar_auth_boundary_xxx";
  let body = "";

  events.forEach((event, index) => {
    body += `--${boundary}\n`;
    body += `Content-Type: application/http\n`;
    body += `Content-ID: req${index}\n\n`;
    body += `POST /calendar/v3/calendars/${encodeURIComponent(calendarId)}/events HTTP/1.1\n`;
    body += `Content-Type: application/json\n\n`;
    body += `${JSON.stringify(event)}\n\n`;
  });

  body += `--${boundary}--`;

  const response = await fetch("https://www.googleapis.com/batch/calendar/v3", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${tokenData.accessToken}`,
      "Content-Type": `multipart/mixed; boundary=${boundary}`,
    },
    body: body,
  });

  const text = await response.text();
  return { success: true, raw: text };
}
