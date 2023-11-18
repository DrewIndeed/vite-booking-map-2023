/* eslint-disable @typescript-eslint/no-explicit-any */
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
      Authorization: `Bearer ${import.meta.env.VITE_AUTH_TOKEN}`,
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
