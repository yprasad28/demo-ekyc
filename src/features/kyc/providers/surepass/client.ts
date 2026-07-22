import { surepassConfig } from "@/lib/config/surepass";

export interface SurepassApiResponse {
  status: number;
  message: string;
  result?: Record<string, unknown>;
  client_id?: string;
}

async function getToken(): Promise<string> {
  const url = `${surepassConfig.baseUrl}/api/v1/auth/token`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: surepassConfig.apiKey }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Surepass auth failed: ${response.status}`);
  }

  const data = await response.json();
  return data.token || data.result?.token || "";
}

export async function surepassRequest(
  path: string,
  body: Record<string, unknown>
): Promise<SurepassApiResponse> {
  const token = await getToken();
  const url = `${surepassConfig.baseUrl}${path}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Surepass API error ${response.status}: ${errorBody}`
    );
  }

  return response.json();
}
