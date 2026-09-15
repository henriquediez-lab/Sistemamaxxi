import "server-only";

const AUTH_BASE_URL = "https://auth.mercadolivre.com.br/authorization";
const API_BASE_URL = "https://api.mercadolibre.com";

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ${name} não configurada no .env`);
  }
  return value;
}

export type MlTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
};

export function buildAuthorizationUrl(params: {
  state: string;
  codeChallenge: string;
}) {
  const url = new URL(AUTH_BASE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", getEnv("ML_CLIENT_ID"));
  url.searchParams.set("redirect_uri", getEnv("ML_REDIRECT_URI"));
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

async function postForm(path: string, body: Record<string, string>) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(body).toString(),
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : `Falha ao comunicar com o Mercado Livre (HTTP ${response.status})`;
    throw new Error(message);
  }

  return data;
}

export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<MlTokenResponse> {
  return postForm("/oauth/token", {
    grant_type: "authorization_code",
    client_id: getEnv("ML_CLIENT_ID"),
    client_secret: getEnv("ML_CLIENT_SECRET"),
    code,
    redirect_uri: getEnv("ML_REDIRECT_URI"),
    code_verifier: codeVerifier,
  });
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<MlTokenResponse> {
  return postForm("/oauth/token", {
    grant_type: "refresh_token",
    client_id: getEnv("ML_CLIENT_ID"),
    client_secret: getEnv("ML_CLIENT_SECRET"),
    refresh_token: refreshToken,
  });
}

export type MlUserInfo = {
  id: number;
  nickname: string;
  site_id: string;
};

export async function fetchMe(accessToken: string): Promise<MlUserInfo> {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      `Não foi possível obter os dados da conta no Mercado Livre (HTTP ${response.status})`
    );
  }
  return response.json();
}

/** Busca todos os IDs de anúncios do vendedor, percorrendo todas as páginas (scan search). */
export async function fetchAllItemIds(
  sellerId: string,
  accessToken: string
): Promise<string[]> {
  const ids: string[] = [];
  let scrollId: string | undefined;

  for (let page = 0; page < 1000; page++) {
    const url = new URL(`${API_BASE_URL}/users/${sellerId}/items/search`);
    url.searchParams.set("search_type", "scan");
    url.searchParams.set("limit", "100");
    if (scrollId) url.searchParams.set("scroll_id", scrollId);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(
        `Não foi possível listar os anúncios (HTTP ${response.status})`
      );
    }
    const data = (await response.json()) as {
      scroll_id?: string;
      results: string[];
    };

    if (!data.results || data.results.length === 0) break;
    ids.push(...data.results);
    scrollId = data.scroll_id;
    if (!scrollId) break;
  }

  return ids;
}

export type MlItemDetail = {
  id: string;
  title: string;
  permalink: string;
  thumbnail: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  sold_quantity: number;
  status: string;
  condition: string;
  listing_type_id: string;
  category_id: string;
  catalog_listing?: boolean;
  date_created: string;
  last_updated: string;
};

const ITEM_ATTRIBUTES = [
  "id",
  "title",
  "permalink",
  "thumbnail",
  "price",
  "currency_id",
  "available_quantity",
  "sold_quantity",
  "status",
  "condition",
  "listing_type_id",
  "category_id",
  "catalog_listing",
  "date_created",
  "last_updated",
].join(",");

/** Busca detalhes de itens em lotes de 20 (limite da API de multiget do Mercado Livre). */
export async function fetchItemsDetails(
  ids: string[],
  accessToken: string
): Promise<MlItemDetail[]> {
  const details: MlItemDetail[] = [];
  const batchSize = 20;

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const url = new URL(`${API_BASE_URL}/items`);
    url.searchParams.set("ids", batch.join(","));
    url.searchParams.set("attributes", ITEM_ATTRIBUTES);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(
        `Não foi possível obter detalhes dos anúncios (HTTP ${response.status})`
      );
    }
    const data = (await response.json()) as Array<{
      code: number;
      body: MlItemDetail;
    }>;

    for (const entry of data) {
      if (entry.code === 200) details.push(entry.body);
    }
  }

  return details;
}
