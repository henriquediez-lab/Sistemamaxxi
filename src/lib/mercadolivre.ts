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

export type MlOrder = {
  id: number;
  status: string;
  status_detail: string | null;
  date_created: string;
  date_closed: string | null;
  total_amount: number;
  paid_amount: number | null;
  currency_id: string;
  buyer?: { nickname?: string };
  order_items: Array<{
    item: { id: string; title: string };
    quantity: number;
    unit_price: number;
  }>;
};

const ORDERS_PAGE_SIZE = 50;
// A busca por offset da API do Mercado Livre não permite ultrapassar 1000
// resultados por consulta. Para ir além, em vez de "adivinhar" cortes de
// data, usamos a data do próprio pedido mais antigo de cada lote como novo
// limite superior da próxima consulta (paginação por cursor) — mais
// confiável do que dividir o período às cegas, que se mostrou instável
// para intervalos muito antigos nessa API.
const ORDERS_MAX_OFFSET = 1000;

function toMlDateParam(date: Date): string {
  return date.toISOString().replace("Z", "-00:00");
}

async function fetchOrdersPage(
  sellerId: string,
  accessToken: string,
  opts: { to: Date | null; offset: number }
): Promise<{ results: MlOrder[]; total: number }> {
  const url = new URL(`${API_BASE_URL}/orders/search`);
  url.searchParams.set("seller", sellerId);
  url.searchParams.set("sort", "date_desc");
  url.searchParams.set("offset", String(opts.offset));
  url.searchParams.set("limit", String(ORDERS_PAGE_SIZE));
  if (opts.to) {
    url.searchParams.set("order.date_created.to", toMlDateParam(opts.to));
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      `Não foi possível listar os pedidos (HTTP ${response.status})`
    );
  }
  const data = (await response.json()) as {
    results: MlOrder[];
    paging: { total: number };
  };
  return { results: data.results, total: data.paging.total };
}

export type FetchOrdersResult = {
  total: number;
  /** true quando chegou até `fromDate` (ou acabaram os pedidos); false se
   * parou no meio (ex: por tempo), podendo ser retomado depois. */
  completo: boolean;
};

/**
 * Busca pedidos (vendas) do vendedor a partir de `fromDate`, do mais
 * recente para o mais antigo, chamando `onBatch` a cada lote encontrado
 * (para permitir salvar no banco aos poucos) e `onCursorAdvance` com o
 * ponto onde parou (para poder retomar dali numa próxima chamada, caso
 * essa não dê tempo de terminar). Contorna o limite de 1000 resultados por
 * consulta avançando o filtro `order.date_created.to` usando a data real do
 * pedido mais antigo já visto, em vez de datas calculadas às cegas.
 */
export async function fetchAllOrders(
  sellerId: string,
  accessToken: string,
  fromDate: Date,
  initialCursorTo: Date | null,
  onBatch: (orders: MlOrder[]) => Promise<void>,
  onCursorAdvance: (cursor: Date | null) => Promise<void>
): Promise<FetchOrdersResult> {
  let total = 0;
  let cursorTo: Date | null = initialCursorTo;

  while (true) {
    const first = await fetchOrdersPage(sellerId, accessToken, {
      to: cursorTo,
      offset: 0,
    });

    const batch: MlOrder[] = [...first.results];
    const lastOffset = Math.min(first.total, ORDERS_MAX_OFFSET);
    for (
      let offset = ORDERS_PAGE_SIZE;
      offset < lastOffset;
      offset += ORDERS_PAGE_SIZE
    ) {
      const page = await fetchOrdersPage(sellerId, accessToken, {
        to: cursorTo,
        offset,
      });
      if (page.results.length === 0) break;
      batch.push(...page.results);
    }

    if (batch.length === 0) {
      await onCursorAdvance(null);
      return { total, completo: true };
    }

    // batch vem do mais recente para o mais antigo (sort=date_desc)
    const dentroDoPeriodo = batch.filter(
      (order) => new Date(order.date_created) >= fromDate
    );
    if (dentroDoPeriodo.length > 0) {
      await onBatch(dentroDoPeriodo);
      total += dentroDoPeriodo.length;
    }

    const maisAntigoDoLote = batch[batch.length - 1];
    const dataMaisAntiga = new Date(maisAntigoDoLote.date_created);

    // Chegou antes do início do período desejado, ou essa consulta trouxe
    // tudo que existia (total menor que o limite por consulta): não há
    // mais pedidos mais antigos para buscar, terminou.
    if (dataMaisAntiga < fromDate || first.total <= ORDERS_MAX_OFFSET) {
      await onCursorAdvance(null);
      return { total, completo: true };
    }

    cursorTo = new Date(dataMaisAntiga.getTime() - 1);
    await onCursorAdvance(cursorTo);
  }
}
