export default async function fetcher<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  const data = (await response.json()) as T;
  return data;
}

export async function fetchLocalJSON(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch JSON file. Status: ${response.status}`);
    }
    const json = await response.json();
    return json;
  } catch (error) {
    console.error("Error fetching JSON:", error);
    throw error;
  }
}

export async function getMap(showingId: number): Promise<any> {
  const url = `https://api-v2.ticketbox.dev/event/api/v1/events/showings/${showingId}/seatmap`;
  const showMap = await fetcher<any>(url);
  return showMap;
}

export async function getAdminShowing(showingId: number): Promise<any> {
  const url = `https://api-v2.ticketbox.dev/event/api/admin/events/showings/${showingId}`;
  const showMap = await fetcher<any>(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhcGkudGlja2V0Ym94LnZuIiwiZXhwIjoxNzAwMjM5Nzc2LCJpYXQiOjE3MDAxNTMzNzYsImlzcyI6ImlkZW50aXR5LnRpY2tldGJveC52biIsInVzZXJfaWQiOjE4LCJwZXJtaXNzaW9ucyI6WyJldmVudC5ldmVudC5jcmVhdGUiLCJldmVudC5ldmVudC52aWV3IiwiZXZlbnQuZXZlbnQuYXNzaWduX3NlYXRtYXAiLCJldmVudC5zZWF0bWFwLmNyZWF0ZSIsImV2ZW50LnNlYXRtYXAudXBkYXRlIiwiZXZlbnQuc2VhdG1hcC52aWV3IiwiZXZlbnQub3JkZXIuY3JlYXRlIiwiZXZlbnQub3JkZXIudXBkYXRlIiwiZXZlbnQub3JkZXIudmlldyIsImV2ZW50LmFwcHNldHRpbmcuY3JlYXRlIiwiZXZlbnQuYXBwc2V0dGluZy51cGRhdGUiLCJldmVudC5hcHBzZXR0aW5nLnZpZXciLCJldmVudC5jYW1wYWlnbi52aWV3IiwiZXZlbnQuY2FtcGFpZ24udXBkYXRlIiwiZXZlbnQuY2FtcGFpZ24uY3JlYXRlIiwiZXZlbnQucHJvbW90aW9uLmNyZWF0ZSIsImV2ZW50LnByb21vdGlvbi51cGRhdGUiLCJldmVudC5wcm9tb3Rpb24udmlldyIsImV2ZW50LmV2ZW50cGF5bWVudC52aWV3IiwiZXZlbnQuZXZlbnRwYXltZW50LmNyZWF0ZSIsImV2ZW50LmV2ZW50cGF5bWVudC51cGRhdGUiLCJldmVudC5ldmVudHBheW1lbnQuZXhwb3J0IiwiZXZlbnQuZXh0cmFjaGFyZ2UuY3JlYXRlIiwiZXZlbnQuZXh0cmFjaGFyZ2UudXBkYXRlIiwiZXZlbnQuZXh0cmFjaGFyZ2UudmlldyIsImV2ZW50LnNhbGVyZXBvcnQudmlldyIsImV2ZW50LnNhbGVyZXBvcnQuZXhwb3J0IiwiZXZlbnQuZXZlbnQuY3JlYXRlIiwiZXZlbnQuZXZlbnQudmlldyIsImV2ZW50LmV2ZW50LmFzc2lnbl9zZWF0bWFwIiwiZXZlbnQuc2VhdG1hcC5jcmVhdGUiLCJldmVudC5zZWF0bWFwLnVwZGF0ZSIsImV2ZW50LnNlYXRtYXAudmlldyIsImV2ZW50Lm9yZGVyLmNyZWF0ZSIsImV2ZW50Lm9yZGVyLnVwZGF0ZSIsImV2ZW50Lm9yZGVyLnZpZXciLCJldmVudC5hcHBzZXR0aW5nLmNyZWF0ZSIsImV2ZW50LmFwcHNldHRpbmcudXBkYXRlIiwiZXZlbnQuYXBwc2V0dGluZy52aWV3IiwiZXZlbnQuY2FtcGFpZ24udmlldyIsImV2ZW50LmNhbXBhaWduLnVwZGF0ZSIsImV2ZW50LmNhbXBhaWduLmNyZWF0ZSIsImV2ZW50LnByb21vdGlvbi5jcmVhdGUiLCJldmVudC5wcm9tb3Rpb24udXBkYXRlIiwiZXZlbnQucHJvbW90aW9uLnZpZXciLCJldmVudC5yZWZ1bmQudmlldyIsImV2ZW50LnJlZnVuZC5jcmVhdGUiLCJldmVudC5yZWZ1bmQudXBkYXRlIiwiZXZlbnQucmVmdW5kLmNvbmZpcm0iLCJldmVudC5yZWZ1bmQuY2FuY2VsIl0sImdyb3VwX2lkcyI6WzEsNCwyLDMsOF0sInVzZXJuYW1lIjoidGhhbmgucGhhbiJ9.gLGHrha_bdmT_FfA3hps8MriOu0HcUE_STvCUDhLBQqfLUFkfrRLx8foj9qARArCk01XCOjNkfE7p0qqgU4tl7-sGKT9iwWRij0PTmanU3vxdw55UCrYcCoEOzeBjzLgiqlvb5OFyTt8uzziI1K1dNi72RleDu5Hw7RB_B8ecHCTK3dOSymSYI-GTYj2CQW_OvF-Os1ExYgpmMYNVLEBAHNGa7SlhlQLn2Fda3pdsifLeJm1KKbbz3saNvg59eby1_rKcW228ewe1P8w33hf1c1KnQZvzAPVOWIVwiK4y29gkLX5e8M3iPNLvMD1X1zBbNssLRYE5q9Ny8r_JXkQxw`,
    },
  });
  return showMap;
}

export async function getSections(
  showingId: number,
  sectionId: number
): Promise<any> {
  const url = `https://api-v2.ticketbox.dev/event/api/v1/events/showings/${showingId}/sections/${sectionId}`;
  const showSection = await fetcher<any>(url);
  return showSection;
}
