export default async function fetcher<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  const data = (await response.json()) as T;
  return data;
}
