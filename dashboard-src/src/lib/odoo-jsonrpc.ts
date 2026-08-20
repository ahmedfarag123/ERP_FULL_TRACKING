export class OdooConnectionError extends Error {
  readonly code: number | null;
  readonly data: unknown;

  constructor(message: string, code: number | null = null, data: unknown = null) {
    super(message);
    this.name = "OdooConnectionError";
    this.code = code;
    this.data = data;
  }
}

export interface OdooJsonRpcPayload {
  jsonrpc: "2.0";
  method: "call";
  id: number;
  params: {
    service: string;
    method: string;
    args: unknown[];
  };
}

export interface OdooJsonRpcError {
  code?: number;
  message?: string;
  data?: unknown;
}

export interface OdooJsonRpcResponse {
  jsonrpc?: string;
  id?: number;
  result?: unknown;
  error?: OdooJsonRpcError;
}

export const ODOO_JSON_RPC_BASE_URL = String(
  import.meta.env.VITE_ODOO_BASE_URL ?? "https://horeca.mas-tradeco.com"
).replace(/\/+$/, "");

export const ODOO_JSON_RPC_ENDPOINT = "/jsonrpc";

function formatErrorMessage(error: OdooJsonRpcError): string {
  const message = String(error.message ?? "").trim();
  if (message) return message;
  if (typeof error.code === "number") return `Odoo JSON-RPC error ${error.code}.`;
  return "Odoo JSON-RPC error.";
}

function formatNetworkError(error: unknown): string {
  if (error instanceof Error) {
    return `Odoo request failed: ${error.message || "network error"}`;
  }
  return "Odoo request failed: network error";
}

export class OdooJsonRpcClient {
  readonly current_url: string;

  private _rpc_id = 0;

  constructor(current_url: string) {
    this.current_url = current_url.replace(/\/+$/, "");
  }

  buildPayload(
    endpoint: string,
    service: string,
    method: string,
    args: unknown[]
  ): OdooJsonRpcPayload {
    this._rpc_id += 1;
    return {
      jsonrpc: "2.0",
      method: "call",
      id: this._rpc_id,
      params: {
        service,
        method,
        args,
      },
    };
  }

  async _json_rpc<T = unknown>(
    endpoint: string,
    service: string,
    method: string,
    args: unknown[]
  ): Promise<T> {
    const payload = this.buildPayload(endpoint, service, method, args);
    const url = `${this.current_url}${endpoint}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (networkError) {
      throw new OdooConnectionError(formatNetworkError(networkError), null, networkError);
    }

    let data: OdooJsonRpcResponse;
    try {
      data = (await response.json()) as OdooJsonRpcResponse;
    } catch {
      throw new OdooConnectionError(
        `Odoo returned a non-JSON response (HTTP ${response.status}).`,
        response.status,
        null
      );
    }

    if (data && typeof data === "object" && "error" in data && data.error) {
      const code = typeof data.error.code === "number" ? data.error.code : null;
      throw new OdooConnectionError(
        formatErrorMessage(data.error),
        code,
        data.error.data ?? data.error
      );
    }

    if (!response.ok) {
      throw new OdooConnectionError(`Odoo request failed (HTTP ${response.status}).`, response.status, data);
    }

    return (data?.result ?? null) as T;
  }

  async authenticate(
    database: string,
    login: string,
    password: string,
    context: Record<string, unknown> = {}
  ): Promise<number> {
    const uid = await this._json_rpc<number>(
      ODOO_JSON_RPC_ENDPOINT,
      "common",
      "authenticate",
      [database, login, password, context]
    );
    if (!Number.isFinite(uid) || uid <= 0) {
      throw new OdooConnectionError("Odoo authentication failed.");
    }
    return uid;
  }

  async version(): Promise<string> {
    return this._json_rpc<string>(ODOO_JSON_RPC_ENDPOINT, "common", "version", []);
  }

  async execute_kw<T = unknown>(
    database: string,
    uid: number,
    password: string,
    model: string,
    method: string,
    args: unknown[] = [],
    kwargs: Record<string, unknown> = {}
  ): Promise<T> {
    return this._json_rpc<T>(
      ODOO_JSON_RPC_ENDPOINT,
      "object",
      "execute_kw",
      [database, uid, password, model, method, args, kwargs]
    );
  }

  async search_read<T = Record<string, unknown>>(
    database: string,
    uid: number,
    password: string,
    model: string,
    domain: unknown[] = [],
    fields: string[] = [],
    options: { limit?: number; offset?: number; order?: string } = {}
  ): Promise<T[]> {
    return this.execute_kw<T[]>(database, uid, password, model, "search_read", [domain], {
      ...(fields.length > 0 ? { fields } : {}),
      ...(options.limit != null ? { limit: options.limit } : {}),
      ...(options.offset != null ? { offset: options.offset } : {}),
      ...(options.order ? { order: options.order } : {}),
    });
  }

  async create<T = number>(
    database: string,
    uid: number,
    password: string,
    model: string,
    values: Record<string, unknown>
  ): Promise<T> {
    return this.execute_kw<T>(database, uid, password, model, "create", [values]);
  }

  async write<T = boolean>(
    database: string,
    uid: number,
    password: string,
    model: string,
    ids: Array<number | string>,
    values: Record<string, unknown>
  ): Promise<T> {
    return this.execute_kw<T>(database, uid, password, model, "write", [ids, values]);
  }

  async unlink<T = boolean>(
    database: string,
    uid: number,
    password: string,
    model: string,
    ids: Array<number | string>
  ): Promise<T> {
    return this.execute_kw<T>(database, uid, password, model, "unlink", [ids]);
  }
}

export const odooJsonRpcClient = new OdooJsonRpcClient(ODOO_JSON_RPC_BASE_URL);
