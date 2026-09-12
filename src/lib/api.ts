"use client";

const BASE = "/api";

function token(): string {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem("admin_token") ?? "";
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token()}`,
    ...extra,
  };
}

async function http<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { statusCode: 503, message: 'Service unavailable. Please try again.' } as unknown as T;
  }

  if (res.status === 401) {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_me");
    window.location.href = "/login";
    return {} as T;
  }

  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

const get = <T>(path: string) => http<T>("GET", path);
const post = <T>(path: string, body?: unknown) => http<T>("POST", path, body);
const put = <T>(path: string, body?: unknown) => http<T>("PUT", path, body);
const del = <T>(path: string, body?: unknown) => http<T>("DELETE", path, body);

// â”€â”€â”€ auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const authApi = {
  signIn: (username: string, password: string) =>
    post<{
      statusCode: number;
      data?: { admin: Admin; token: string };
      message?: string;
    }>(`${BASE}/admin/sign-in`, { username, password }),
  signOut: () => post(`${BASE}/admin/sign-out`),
  forgotPassword: (email: string) =>
    post<{ code: number; message: string }>(`${BASE}/user/forgot-password`, {
      email,
    }),
  resetPassword: (token: string, newPassword: string) =>
    post<{ code: number; message: string }>(`${BASE}/user/reset-password`, {
      token,
      newPassword,
    }),
};

// â”€â”€â”€ admins â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const adminsApi = {
  list: () => get<ApiList<Admin>>(`${BASE}/admin/admins`),
  create: (body: CreateAdminBody) =>
    post<ApiRes<Admin>>(`${BASE}/admin/admins`, body),
  update: (id: string, body: UpdateAdminBody) =>
    put<ApiRes<Admin>>(`${BASE}/admin/admins/${id}`, body),
  deactivate: (id: string) => del<ApiRes>(`${BASE}/admin/admins/${id}`),
};

// â”€â”€â”€ users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const usersApi = {
  list: (p?: {
    page?: number;
    limit?: number;
    search?: string;
    isBlocked?: boolean;
    verified?: boolean;
  }) => {
    const q = new URLSearchParams();
    if (p?.page !== undefined) q.set("page", String(p.page));
    if (p?.limit !== undefined) q.set("limit", String(p.limit));
    if (p?.search) q.set("search", p.search);
    if (p?.isBlocked !== undefined) q.set("isBlocked", String(p.isBlocked));
    if (p?.verified !== undefined) q.set("verified", String(p.verified));
    return get<{
      code: number;
      data: User[];
      total: number;
      page: number;
      totalPages: number;
    }>(`${BASE}/admin/users?${q}`);
  },
  getById: (id: string) => get<ApiRes<User>>(`${BASE}/admin/users/${id}`),
  block: (id: string, reason?: string) =>
    put<ApiRes>(`${BASE}/admin/users/${id}/block`, { reason }),
  unblock: (id: string) => put<ApiRes>(`${BASE}/admin/users/${id}/unblock`),
  activate: (id: string) => put<ApiRes>(`${BASE}/admin/users/${id}/activate`),
  update: (
    id: string,
    body: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      userName?: string;
      birthday?: string;
    },
  ) => put<ApiRes<User>>(`${BASE}/admin/users/${id}/profile`, body),
  setPersonalId: (id: string, personalId: string) =>
    put<ApiRes>(`${BASE}/admin/users/${id}/personal-id`, { personalId }),
  transactions: (id: string, limit = 200) =>
    get<{ code: number; data: Transaction[]; total: number; message?: string }>(
      `${BASE}/admin/users/${id}/transactions?limit=${limit}`,
    ),
  bonuses: (id: string) =>
    get<ApiRes<UserBonus[]>>(`${BASE}/admin/users/${id}/bonuses`),
  adjustBalance: (
    id: string,
    amount: number,
    type: "credit" | "debit",
    reason: string,
  ) =>
    post<ApiRes>(`${BASE}/admin/users/${id}/balance`, { amount, type, reason }),
  activateBonus: (userId: string, bonusId: string) =>
    post<ApiRes>(
      `${BASE}/admin/users/${userId}/bonuses/${bonusId}/activate`,
      {},
    ),
  chooseGameForUser: (userId: string, bonusId: string, gameUUID: string) =>
    post<ApiRes>(
      `${BASE}/admin/users/${userId}/bonuses/${bonusId}/choose-game`,
      { gameUUID },
    ),
  eligibleGames: (userId: string, bonusId: string) =>
    get<
      ApiRes<{
        userChoosesGame: boolean;
        eligibleCategories: string[];
        freeSpinsGameIds: string[];
        freeSpins: number;
        betAmountPerFreeSpin: number;
      }>
    >(`${BASE}/admin/users/${userId}/bonuses/${bonusId}/eligible-games`),
};

// â”€â”€â”€ games â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const gamesApi = {
  list: (p?: GameFilters) => {
    const q = new URLSearchParams();
    if (p?.page) q.set("page", String(p.page));
    if (p?.limit) q.set("limit", String(p.limit));
    if (p?.search) q.set("search", p.search);
    if (p?.provider) q.set("provider", p.provider);
    if (p?.isActive !== undefined) q.set("isActive", String(p.isActive));
    if (p?.category) q.set("category", p.category);
    return get<{
      code?: number;
      data: Game[];
      total: number;
      page: number;
      totalPages: number;
    }>(`${BASE}/admin/games?${q}`);
  },
  show: (id: number) => put<ApiRes>(`${BASE}/admin/games/${id}/show`),
  hide: (id: number) => put<ApiRes>(`${BASE}/admin/games/${id}/hide`),
  addCategory: (id: number, category: string) =>
    post<ApiRes>(`${BASE}/admin/games/${id}/category`, { category }),
  removeCategory: (id: number, category: string) =>
    del<ApiRes>(`${BASE}/admin/games/${id}/category/${category}`),
  categories: (id: number) =>
    get<ApiRes>(`${BASE}/admin/games/${id}/categories`),
  demoUrl: (gameHumanReadableId: string) =>
    get<{ url: string }>(`${BASE}/admin/games/demo-url?gameId=${encodeURIComponent(gameHumanReadableId)}`),
  syncRevolver: () =>
    post<ApiRes>(`${BASE}/game/revolver-refresh`, {}),
  syncNuxgame: () =>
    post<ApiRes>(`${BASE}/game/nuxgame-refresh`, {}),
};

// â”€â”€â”€ promotions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const promotionsApi = {
  list: (p?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  }) => {
    const q = new URLSearchParams();
    if (p?.page) q.set("page", String(p.page));
    if (p?.limit) q.set("limit", String(p.limit));
    if (p?.type) q.set("type", p.type);
    if (p?.status) q.set("status", p.status);
    return get<{
      code: number;
      data: Promotion[];
      total: number;
      page: number;
      totalPages: number;
    }>(`${BASE}/admin/promotions?${q}`);
  },
  get: (id: string) => get<ApiRes<Promotion>>(`${BASE}/admin/promotions/${id}`),
  create: (body: PromotionBody) =>
    post<ApiRes<Promotion>>(`${BASE}/admin/promotions`, body),
  update: (
    id: string,
    body: Partial<PromotionBody> & Record<string, unknown>,
  ) => put<ApiRes<Promotion>>(`${BASE}/admin/promotions/${id}`, body),
  delete: (id: string) => del<ApiRes>(`${BASE}/admin/promotions/${id}`),
  assign: (promotionId: string, userId: string) =>
    post<ApiRes>(`${BASE}/admin/promotions/assign`, { promotionId, userId }),
  cancelBonus: (userPromotionId: string) =>
    del<ApiRes>(`${BASE}/admin/bonuses/${userPromotionId}`),
  audit: (promotionId?: string, userId?: string) => {
    const q = new URLSearchParams();
    if (promotionId) q.set("promotionId", promotionId);
    if (userId) q.set("userId", userId);
    return get<ApiRes<AuditEntry[]>>(`${BASE}/admin/audit?${q}`);
  },
};

// â”€â”€â”€ platform â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const platformApi = {
  stats: () => get<ApiRes<PlatformStats>>(`${BASE}/admin/stats`),
  allTransactions: (p?: TxFilters) => {
    const q = new URLSearchParams();
    if (p?.page) q.set("page", String(p.page));
    if (p?.limit) q.set("limit", String(p.limit));
    if (p?.type) q.set("type", p.type);
    if (p?.status) q.set("status", p.status);
    if (p?.userId) q.set("userId", p.userId);
    if (p?.provider) q.set("provider", p.provider);
    if (p?.gameId) q.set("gameId", p.gameId);
    if (p?.dateFrom) q.set("dateFrom", p.dateFrom);
    if (p?.dateTo) q.set("dateTo", p.dateTo);
    if (p?.minAmount !== undefined) q.set("minAmount", String(p.minAmount));
    if (p?.maxAmount !== undefined) q.set("maxAmount", String(p.maxAmount));
    if (p?.sortBy) q.set("sortBy", p.sortBy);
    if (p?.sortDir) q.set("sortDir", p.sortDir);
    return get<TxPage>(`${BASE}/admin/transactions?${q}`);
  },
  userTopSpend: (userId: string, dateFrom?: string, dateTo?: string) => {
    const q = new URLSearchParams();
    if (dateFrom) q.set("dateFrom", dateFrom);
    if (dateTo) q.set("dateTo", dateTo);
    return get<ApiRes<TopSpend>>(`${BASE}/admin/users/${userId}/top-spend?${q}`);
  },
  providers: () => get<ApiRes<Provider[]>>(`${BASE}/admin/games/providers`),
  categoryOverview: () =>
    get<ApiRes<Record<string, number>>>(
      `${BASE}/admin/games/category-overview`,
    ),
};

export const categoryDefsApi = {
  list: () => get<ApiRes<CategoryDef[]>>(`${BASE}/admin/category-defs`),
  create: (body: {
    key: string;
    label: string;
    color?: string;
    sortOrder?: number;
  }) => post<ApiRes<CategoryDef>>(`${BASE}/admin/category-defs`, body),
  remove: (key: string) =>
    del<ApiRes<void>>(`${BASE}/admin/category-defs/${key}`),
};

// â”€â”€â”€ wallet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const walletApi = {
  userTransactions: () => get<unknown>(`${BASE}/wallet/user-transactions`),
};

// ─── wagering ────────────────────────────────────────────────────────────────

export const wageringApi = {
  list: (p?: { page?: number; limit?: number; status?: string; userId?: string }) => {
    const q = new URLSearchParams();
    if (p?.page)   q.set('page',   String(p.page));
    if (p?.limit)  q.set('limit',  String(p.limit));
    if (p?.status) q.set('status', p.status);
    if (p?.userId) q.set('userId', p.userId);
    return get<{ code: number; data: WageringEntry[]; total: number; page: number; totalPages: number }>(
      `${BASE}/admin/wagering?${q}`,
    );
  },
  getForUser: (userId: string) =>
    wageringApi.list({ userId, limit: 100 }),
};

// â”€â”€â”€ types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ApiRes<T = void> {
  statusCode?: number;
  code?: number;
  message?: string;
  data?: T;
}
export interface ApiList<T> {
  statusCode?: number;
  data?: T[];
}

export interface Admin {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "super_admin" | "admin" | "moderator";
  isActive: boolean;
  createdAt: string;
}

export interface CreateAdminBody {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: "super_admin" | "admin" | "moderator";
}

export interface UpdateAdminBody {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  newPassword?: string;
}

export interface User {
  id: string;
  userName: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  citizenship?: string;
  birthday?: string;
  verified?: boolean;
  personalId?: string;
  isBlocked: boolean;
  blockReason?: string;
  xp?: number;
  createdAt: string;
  updatedAt?: string;
  wallet?: { id: string; balance: number; currency?: string };
  country?: { countryName?: string; currency?: string };
}

export interface Transaction {
  id: string;
  userId: string;
  type: string;
  amount?: number;
  status?: string;
  paymentId?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  gameId?: string;
  roundId?: string;
  reason?: string;
  transactionId?: string;
  gameSessionId?: number;
  createdAt: string;
  game?: { gameName: string };
}

export interface UserBonus {
  id: string;
  status: string;
  bonusBalance?: number;
  wageringRequired?: number;
  wageringCompleted?: number;
  activatedAt?: string;
  expiresAt?: string;
  promotion?: {
    name: string;
    type: string;
    userChoosesGame?: boolean;
    allowedGameUUIDs?: string[];
  };
}

export interface Game {
  id: number;
  gameUUID: string;
  gameHumanReadableId?: string;
  gameName: string;
  description?: string;
  rules?: string;
  thumbnail?: string;
  marketingMaterialsZip?: string;
  isActive: boolean;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
  gameProvider?: { id?: number; name: string; prefix?: string; logo?: string };
  provider?: { name: string; logo?: string };
  metaData?: {
    reelsWidth?: number;
    reelsHeight?: number;
    lines?: number;
    supports_promo_freespins?: boolean;
    marketing_materials?: string;
  };
  categories?: { category: string }[];
}

export interface GameFilters {
  page?: number;
  limit?: number;
  search?: string;
  provider?: string;
  isActive?: boolean;
  category?: string;
}

export interface RewardValue {
  percentage?: number;
  fixedAmount?: number;
  maxAmount?: number;
  freeSpins?: number;
}

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  type: string;
  rewardType: string;
  rewardValue?: RewardValue;
  wageringMultiplier?: number;
  validityHours?: number;
  maxWithdrawal?: number;
  maxUsagePerUser?: number;
  freeSpinsGameIds?: string[];
  freeSpinsBetAmount?: number;
  userChoosesGame?: boolean;
  eligibleCategories?: string[];
  allowedGameUUIDs?: string[];
  startDate?: string;
  endDate?: string;
  status: string;
  createdAt?: string;
}

export interface PromotionBody {
  name: string;
  description?: string;
  type: string;
  rewardType: string;
  rewardValue?: RewardValue;
  wageringMultiplier?: number;
  validityHours?: number;
  maxWithdrawal?: number;
  maxUsagePerUser?: number;
  freeSpinsGameIds?: string[];
  freeSpinsBetAmount?: number;
  userChoosesGame?: boolean;
  eligibleCategories?: string[];
  allowedGameUUIDs?: string[];
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface AuditEntry {
  id: string;
  promotionId?: string;
  userId?: string;
  action: string;
  performedBy?: string;
  createdAt: string;
  details?: Record<string, unknown>;
}

export interface CategoryDef {
  id: number;
  key: string;
  label: string;
  color: string;
  sortOrder: number;
  createdAt: string;
}

export interface Provider {
  id: number;
  name: string;
  prefix: string;
  logo?: string;
}

export interface PlatformStats {
  users: { total: number; active: number; blocked: number; unverified: number };
  games: { total: number };
}

export interface TxFilters {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  userId?: string;
  provider?: string;
  gameId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: "createdAt" | "amount";
  sortDir?: "ASC" | "DESC";
}

export interface TopSpendEntry {
  gameId?: string;
  gameName?: string;
  providerName?: string;
  totalSpent: number;
  betCount: number;
}

export interface TopSpend {
  byGame: TopSpendEntry[];
  byProvider: TopSpendEntry[];
}

export interface WageringStats {
  id: string;
  userId: string;
  user?: { id: string; userName: string; email: string; firstName: string; lastName: string };
  totalDeposits: number;
  totalWithdrawals: number;
  totalWagered: number;
  totalDebit: number;
  totalCredit: number;
  netProfit: number;
  rtp: number;
  bonusBetsCount: number;
  bonusWinnings: number;
  todayWagered: number;
  weeklyWagered: number;
  monthlyWagered: number;
  lastActivityDate?: string;
  updatedAt?: string;
}

export interface WageringEntry {
  id: string;
  userId: string;
  status: string;
  bonusBalance: number;
  wageringRequired: number;
  wageringCompleted: number;
  activatedAt?: string;
  expiresAt?: string;
  createdAt: string;
  promotion?: { id: string; name: string; type: string; wageringMultiplier: number; allowedGameUUIDs?: string[] };
}

export interface TxPage {
  code?: number;
  data?: Transaction[];
  total?: number;
  page?: number;
  totalPages?: number;
}

export interface Level {
  id: number;
  name: string;
  minPoints: number;
  maxPoints: number;
  order: number;
  description?: string;
  badgeUrl?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── analytics ───────────────────────────────────────────────────────────────

export interface DailyFinancialPoint {
  date: string;
  deposits: number;
  withdrawals: number;
  wagered: number;
  ggr: number;
  activeUsers: number;
}

export interface DailySessionPoint {
  date: string;
  sessions: number;
  uniquePlayers: number;
}

export interface DailyActiveUsers {
  date: string;
  count: number;
}

export interface DailyRegistration {
  date: string;
  count: number;
}

export interface TxTypeBreakdown {
  type: string;
  count: number;
  totalAmount: number;
}

export interface TopGame {
  gameId: string;
  gameName: string;
  thumbnail: string | null;
  wagered: number;
  won: number;
  ggr: number;
  uniquePlayers: number;
}

export interface PlatformAnalyticsData {
  financial: {
    deposits:           { total: number; count: number; average: number };
    withdrawals:        { total: number; count: number };
    pendingWithdrawals: { total: number; count: number };
    bonusPayouts:       { total: number; count: number };
    ggr:                number;
    netRevenue:         number;
  };
  games: {
    totalSessions:  number;
    activeSessions: number;
    topGames:       TopGame[];
  };
  timeSeries: {
    dailyFinancial:   DailyFinancialPoint[];
    dailySessions:    DailySessionPoint[];
    dailyActiveUsers: DailyActiveUsers[];
  };
  typeBreakdown: TxTypeBreakdown[];
  userRegistrations: {
    newThisWeek:          number;
    newThisMonth:         number;
    dailyRegistrations:   DailyRegistration[];
  } | null;
}

// ─── user analytics ──────────────────────────────────────────────────────────

export interface UserTopGame {
  gameId:    string;
  gameName:  string;
  thumbnail: string | null;
  wagered:   number;
  won:       number;
  ggr:       number;
  txCount:   number;
}

export interface DailyUserActivity {
  date:      string;
  wagered:   number;
  won:       number;
  deposited: number;
}

export interface UserAnalyticsData {
  summary: {
    totalDeposits:     number;
    totalWithdrawals:  number;
    netDeposit:        number;
    totalWagered:      number;
    totalWon:          number;
    ggr:               number;
    netProfit:         number;
    rtp:               number;
    bonusBetsCount:    number;
    bonusWinnings:     number;
    depositCount:      number;
    activePromotions:  number;
    firstDepositAt:    string | null;
    lastActivityAt:    string | null;
  };
  activity: {
    todayWagered:    number;
    weeklyWagered:   number;
    monthlyWagered:  number;
    lastActivityDate: string | null;
  };
  games: {
    totalSessions:  number;
    activeSessions: number;
    totalGameTime:  number;
    topGames:       UserTopGame[];
  };
  timeSeries: {
    dailyActivity:     DailyUserActivity[];
    depositHistory:    { id: string; amount: number; status: string | undefined; createdAt: string }[];
    withdrawalHistory: { id: string; amount: number; status: string | undefined; createdAt: string }[];
  };
}

export interface GameReportItem {
  gameId: string;
  gameName: string;
  thumbnail: string | null;
  provider: string | null;
  wagered: number;
  won: number;
  ggr: number;
  rtp: number;
  uniquePlayers: number;
  txCount: number;
}

export interface ProviderReportItem {
  provider: string;
  wagered: number;
  won: number;
  ggr: number;
  rtp: number;
  gameCount: number;
}

export interface GameReportData {
  perGame: GameReportItem[];
  perProvider: ProviderReportItem[];
}

export const analyticsApi = {
  get: () =>
    get<{ statusCode: number; data: PlatformAnalyticsData }>(`${BASE}/admin/analytics`),
  getUser: (userId: string) =>
    get<{ code: number; data: UserAnalyticsData }>(`${BASE}/admin/analytics/users/${userId}`),
};

export interface LiveSession {
  id: number;
  playerId: string;
  gameId: string;
  createdAt: string;
  updatedAt: string;
  gameName: string;
  thumbnail: string | null;
  provider: string | null;
  userName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

export const liveApi = {
  sessions: () =>
    get<{ code: number; data: { sessions: LiveSession[]; total: number } }>(`${BASE}/admin/live/sessions`),
  forceClose: (id: number) =>
    put<ApiRes>(`${BASE}/admin/live/sessions/${id}/close`),
};

export const withdrawalsApi = {
  list: (p?: { page?: number; limit?: number; status?: string }) => {
    const q = new URLSearchParams();
    q.set('type', 'withdrawal');
    if (p?.page)   q.set('page',   String(p.page));
    if (p?.limit)  q.set('limit',  String(p.limit));
    if (p?.status) q.set('status', p.status);
    return get<TxPage>(`${BASE}/admin/transactions?${q}`);
  },
  approve: (id: string) =>
    put<ApiRes>(`${BASE}/admin/withdrawals/${id}/approve`),
  reject: (id: string, reason: string) =>
    put<ApiRes>(`${BASE}/admin/withdrawals/${id}/reject`, { reason }),
};

export const reportsApi = {
  games: (dateFrom?: string, dateTo?: string) => {
    const q = new URLSearchParams();
    if (dateFrom) q.set('dateFrom', dateFrom);
    if (dateTo)   q.set('dateTo',   dateTo);
    return get<{ code: number; data: GameReportData }>(`${BASE}/admin/reports/games?${q}`);
  },
};

export const levelsApi = {
  list: () => get<{ code: number; data: Level[] }>(`${BASE}/admin/levels`),
  create: (body: Omit<Level, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>) =>
    post<{ code: number; data: Level }>(`${BASE}/admin/levels`, body),
  update: (id: number, body: Partial<Level>) =>
    put<{ code: number; data: Level }>(`${BASE}/admin/levels/${id}`, body),
  remove: (id: number) =>
    del<{ code: number }>(`${BASE}/admin/levels/${id}`),
};


