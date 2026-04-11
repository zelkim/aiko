import { google } from "googleapis";
import { auth } from "@/lib/auth";

export async function getCalendarClient(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session) {
    throw new Error("Not authenticated. Please sign in first.");
  }

  const tokenData = await auth.api.getAccessToken({
    body: { providerId: "google" },
    headers,
  });

  if (!tokenData?.accessToken) {
    throw new Error("No Google account linked. Please sign in with Google.");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2Client.setCredentials({
    access_token: tokenData.accessToken,
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function listCalendars(headers: Headers) {
  const calendar = await getCalendarClient(headers);
  const res = await calendar.calendarList.list({ minAccessRole: "writer" });
  return res.data.items || [];
}

export async function createEvents(headers: Headers, calendarId: string, events: any[]) {
  const calendar = await getCalendarClient(headers);
  const results = await Promise.all(
    events.map(async (eventDetails) => {
      try {
        const res = await calendar.events.insert({
          calendarId,
          requestBody: eventDetails,
        });
        return res.data;
      } catch (err: any) {
        console.error('[google-api] events.insert failed:', {
          status: err?.status ?? err?.code,
          message: err?.message,
          errors: err?.errors ?? err?.response?.data?.error,
          requestBody: eventDetails,
        });
        throw err;
      }
    })
  );
  return results;
}

export async function editEvent(headers: Headers, calendarId: string, eventId: string, eventDetails: any) {
  const calendar = await getCalendarClient(headers);
  try {
    const res = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: eventDetails,
    });
    return res.data;
  } catch (err: any) {
    console.error('[google-api] events.patch failed:', {
      status: err?.status ?? err?.code,
      message: err?.message,
      errors: err?.errors ?? err?.response?.data?.error,
      eventId,
      requestBody: eventDetails,
    });
    throw err;
  }
}

export async function deleteEvent(headers: Headers, calendarId: string, eventId: string) {
  const calendar = await getCalendarClient(headers);
  try {
    await calendar.events.delete({
      calendarId,
      eventId,
    });
    return { success: true };
  } catch (err: any) {
    console.error('[google-api] events.delete failed:', {
      status: err?.status ?? err?.code,
      message: err?.message,
      errors: err?.errors ?? err?.response?.data?.error,
      eventId,
    });
    throw err;
  }
}
