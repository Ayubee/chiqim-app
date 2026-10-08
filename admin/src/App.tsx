import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
  CircleHelp,
  ReceiptText,
} from "lucide-react";
import {
  audit,
  command,
  createSeller,
  dashboard,
  demoMode,
  report,
  supabase,
} from "./api";
import type {
  Audit,
  Dashboard,
  Expense,
  Profile,
  Report,
  Store,
} from "./types";
import {
  dateLabel,
  message,
  money,
  syncLabel,
  tashkentDate,
  time,
} from "./format";

function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <ArrowDownLeft size={23} />
      </span>
      <span>
        chiqim<span className="brand-dot">.</span>
      </span>
    </div>
  );
}
function Spinner() {
  return <LoaderCircle size={18} className="spin" aria-label="Yuklanmoqda" />;
}
function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <ReceiptText size={30} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function ErrorBox({ text, retry }: { text: string; retry?: () => void }) {
  return (
    <div className="error" role="alert">
      <span>{text}</span>
      {retry && (
        <button className="text-button" onClick={retry}>
          Qayta urinish <RefreshCw size={14} />
        </button>
      )}
    </div>
  );
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const modalRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        modalRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]",
        ) ?? [],
      );
    focusable()[0]?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previousFocus?.focus();
    };
  }, [close]);
  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon-button" onClick={close} aria-label="Yopish">
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function Login() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await supabase!.auth.signInWithPassword({
        email: String(data.get("email")).trim(),
        password: String(data.get("password")),
      });
      if (result.error)
        setError("Email yoki parol noto‘g‘ri. Qayta urinib ko‘ring.");
    } catch {
      setError("Ulanishda xatolik. Qayta urinib ko‘ring.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <div className="login-top">
        <Brand />
        <span className="muted">Boshqaruv paneli</span>
      </div>
      <div className="login-card">
        <div className="login-symbol">
          <ShieldCheck size={28} />
        </div>
        <h1>Xush kelibsiz</h1>
        <p>Chiqimlarni boshqarish uchun hisobingizga kiring.</p>
        <form onSubmit={login}>
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="username"
              placeholder="admin@magazin.uz"
              required
              autoFocus
            />
          </label>
          <label>
            Parol
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Parolingizni kiriting"
              required
            />
          </label>
          {error && <ErrorBox text={error} />}
          <button className="button primary full" disabled={busy}>
            {busy ? (
              <Spinner />
            ) : (
              <>
                Kirish <ArrowUpRight size={17} />
              </>
            )}
          </button>
        </form>
        <div className="login-note">
          <ShieldCheck size={14} /> Faqat vakolatli administratorlar uchun
        </div>
      </div>
      <footer className="login-footer">Har bir chiqim — o‘z nazoratida.</footer>
    </div>
  );
}
export default function App() {
  const [session, setSession] = useState<Session | null>(null),
    [profile, setProfile] = useState<Profile | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!supabase || demoMode) {
      setBusy(false);
      return;
    }
    let live = true;
    const { data } = supabase.auth.onAuthStateChange((_event, current) => {
      if (live) setSession(current);
    });
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (live) {
          setSession(data.session);
          if (error) setError("Sessiyani yuklab bo‘lmadi.");
          setBusy(false);
        }
      })
      .catch(() => {
        if (live) {
          setError("Ulanishda xatolik.");
          setBusy(false);
        }
      });
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!session || !supabase) return;
    let live = true;
    setProfile(null);
    setBusy(true);
    setError("");
    supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (live) {
          setProfile(data);
          if (error) setError("Profilni yuklab bo‘lmadi.");
          setBusy(false);
        }
      });
    return () => {
      live = false;
    };
  }, [session?.user.id, retry]);
  if (demoMode)
    return (
      <Admin
        profile={{
          id: "demo-admin",
          full_name: "Administrator",
          role: "admin",
          store_id: null,
          is_active: true,
          assignment_version: 1,
        }}
      />
    );
  if (!supabase)
    return (
      <div className="setup-page">
        <Brand />
        <div className="setup-card">
          <Building2 size={34} />
          <h1>Ulanishni sozlash kerak</h1>
          <p>
            Backend hali ulanmagan. Administrator uchun Supabase URL va ochiq
            API kalitini <code>admin/.env</code> faylida sozlang.
          </p>
          <p>
            To‘liq yo‘riqnoma: <code>docs/backend/README.md</code>
          </p>
          <span className="tag">Haqiqiy ma’lumotlar hali yuklanmagan</span>
        </div>
      </div>
    );
  if (busy)
    return (
      <div className="loading-page">
        <Spinner /> Yuklanmoqda…
      </div>
    );
  if (!session) return <Login />;
  if (error || !profile || profile.role !== "admin" || !profile.is_active)
    return (
      <div className="setup-page">
        <Brand />
        <div className="setup-card">
          <ShieldCheck size={32} />
          <h1>Kirish cheklangan</h1>
          <p>
            {error ||
              "Faol administrator profili kerak. Hisobingiz vakolatini loyiha administratori bilan tekshiring."}
          </p>
          <div className="actions">
            <button className="button" onClick={() => setRetry((n) => n + 1)}>
              Qayta urinish
            </button>
            <button className="button" onClick={() => supabase!.auth.signOut()}>
              Chiqish
            </button>
          </div>
        </div>
      </div>
    );
  return <Admin profile={profile} />;
}
type Dialog =
  | { type: "store"; store?: Store }
  | { type: "seller"; seller?: Profile }
  | { type: "edit" | "cancel" | "audit"; expense: Expense }
  | { type: "record" }
  | { type: "help" };
function Admin({ profile }: { profile: Profile }) {
  const [view, setView] = useState<"stores" | "sellers">("stores"),
    [selected, setSelected] = useState<Store | null>(null);
  const [data, setData] = useState<Dashboard | null>(null),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState(""),
    [dialog, setDialog] = useState<Dialog | null>(null),
    [formError, setFormError] = useState(""),
    [saving, setSaving] = useState(false),
    [notice, setNotice] = useState("");
  const [from, setFrom] = useState(tashkentDate()),
    [to, setTo] = useState(tashkentDate()),
    [sellerFilter, setSellerFilter] = useState(""),
    [page, setPage] = useState(0),
    [revision, setRevision] = useState(0);
  const [rows, setRows] = useState<Report | null>(null),
    [reportLoading, setReportLoading] = useState(false),
    [reportError, setReportError] = useState(""),
    [exporting, setExporting] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const next = await dashboard();
      setData(next);
      setSelected((current) =>
        current ? (next.stores.find((s) => s.id === current.id) ?? null) : null,
      );
    } catch (e) {
      setLoadError(message(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!selected) return;
    let live = true;
    setReportLoading(true);
    setReportError("");
    if (!from || !to || from > to) {
      setReportError(
        !from || !to
          ? "Boshlanish va tugash sanasini tanlang."
          : "Boshlanish sanasi tugash sanasidan keyin bo‘lmasin.",
      );
      setReportLoading(false);
      setRows(null);
      return;
    }
    report({
      store_id: selected.id,
      from,
      to,
      seller_id: sellerFilter || null,
      offset: page * 50,
      limit: 50,
    })
      .then((value) => {
        if (live) setRows(value);
      })
      .catch((e) => {
        if (live) {
          setReportError(message(e));
          setRows(null);
        }
      })
      .finally(() => {
        if (live) setReportLoading(false);
      });
    return () => {
      live = false;
    };
  }, [selected?.id, from, to, sellerFilter, page, revision]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const open = (next: Dialog) => {
    setFormError("");
    setDialog(next);
  };
  const close = useCallback(() => {
    if (!saving) setDialog(null);
  }, [saving]);
  const navigate = (next: "stores" | "sellers") => {
    setView(next);
    setSelected(null);
    setSearch("");
  };
  const chooseStore = (store: Store) => {
    setSelected(store);
    setSellerFilter("");
    setFrom(tashkentDate());
    setTo(tashkentDate());
    setPage(0);
    setRows(null);
    setSearch("");
  };
  const sellers = data?.profiles ?? [],
    stores = data?.stores ?? [];
  const sellerName = (id: string) =>
    sellers.find((p) => p.id === id)?.full_name ?? "Noma’lum sotuvchi";
  const totalToday = stores.reduce((sum, s) => sum + BigInt(s.today_total), 0n);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog || demoMode) return;
    const fd = new FormData(event.currentTarget);
    const field = (key: string) => String(fd.get(key) ?? "");
    setSaving(true);
    setFormError("");
    try {
      if (dialog.type === "store")
        await command("save_store", {
          id: dialog.store?.id,
          name: field("name"),
          is_active: fd.has("is_active"),
        });
      if (dialog.type === "seller") {
        const payload = {
          full_name: field("full_name"),
          store_id: field("store_id"),
          is_active: fd.has("is_active"),
        };
        if (dialog.seller)
          await command("save_seller", {
            ...payload,
            id: dialog.seller.id,
            expected_assignment_version: dialog.seller.assignment_version,
          });
        else
          await createSeller({
            ...payload,
            email: field("email"),
            password: field("password"),
          });
      }
      if (dialog.type === "cancel")
        await command("cancel_expense", {
          id: dialog.expense.id,
          expected_version: dialog.expense.version,
        });
      if (dialog.type === "edit" || dialog.type === "record") {
        const amount = Number(field("amount_uzs"));
        if (!Number.isSafeInteger(amount) || amount < 1)
          throw new Error("INVALID_AMOUNT");
        const payload = {
          amount_uzs: amount,
          note: field("note").trim(),
          expense_date: field("expense_date"),
        };
        if (dialog.type === "edit")
          await command("edit_expense", {
            ...payload,
            id: dialog.expense.id,
            expected_version: dialog.expense.version,
          });
        else
          await command("admin_record_expense", {
            ...payload,
            id: field("id"),
            seller_id: field("seller_id"),
            store_id: selected!.id,
            occurred_at: new Date().toISOString(),
          });
      }
      setDialog(null);
      setNotice("O‘zgarishlar saqlandi");
      setRevision((n) => n + 1);
      await refresh();
    } catch (e) {
      setFormError(message(e));
    } finally {
      setSaving(false);
    }
  }
  async function exportRows() {
    if (!selected) return;
    setExporting(true);
    try {
      const snapshot = await report(
        { store_id: selected.id, from, to, seller_id: sellerFilter || null },
        true,
      );
      const { downloadWorkbook } = await import("./export.mjs");
      await downloadWorkbook(snapshot.rows, {
        storeName: selected.name,
        from,
        to,
        sellerNames: Object.fromEntries(
          sellers.map((s) => [s.id, s.full_name]),
        ),
      });
      setNotice("XLSX fayli tayyor");
    } catch (e) {
      setReportError(
        e instanceof Error && e.message === "XLSX_SAFE_INTEGER_LIMIT"
          ? "Jami Excel uchun aniq raqam chegarasidan oshdi. Sana oralig‘ini qisqartiring."
          : message(e),
      );
    } finally {
      setExporting(false);
    }
  }
  const filteredStores = stores.filter((s) =>
    (
      s.name +
      " " +
      sellers
        .filter((p) => p.store_id === s.id)
        .map((p) => p.full_name)
        .join(" ")
    )
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  const filteredSellers = sellers.filter((s) =>
    (
      s.full_name +
      " " +
      (stores.find((st) => st.id === s.store_id)?.name ?? "")
    )
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  const storeSellers = sellers.filter((s) => s.store_id === selected?.id);
  const pageTitle = selected
    ? selected.name
    : view === "stores"
      ? "Magazinlar"
      : "Sotuvchilar";
  return (
    <div className="app">
      <aside className="sidebar">
        <Brand />
        <div className="workspace">
          <span className="workspace-mark">
            <Building2 size={17} />
          </span>
          <div>
            <strong>Magazin boshqaruvi</strong>
            <small>Administrator paneli</small>
          </div>
          <ShieldCheck size={14} />
        </div>
        <div className="nav-caption">BOSHQARUV</div>
        <nav>
          <button
            className={view === "stores" ? "nav-item active" : "nav-item"}
            onClick={() => navigate("stores")}
          >
            <LayoutGrid size={19} />
            Magazinlar<span className="nav-count">{stores.length}</span>
          </button>
          <button
            className={view === "sellers" ? "nav-item active" : "nav-item"}
            onClick={() => navigate("sellers")}
          >
            <Users size={19} />
            Sotuvchilar<span className="nav-count">{sellers.length}</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button
            className="nav-item help-button"
            onClick={() => open({ type: "help" })}
          >
            <CircleHelp size={18} />
            Foydalanish qo‘llanmasi
          </button>
          <div className="account">
            <div className="avatar admin-avatar">{profile.full_name[0]}</div>
            <div>
              <strong>{profile.full_name}</strong>
              <small>Administrator</small>
            </div>
            <button
              title="Hisobdan chiqish"
              className="icon-button"
              onClick={() =>
                demoMode
                  ? location.assign(location.pathname)
                  : supabase!.auth.signOut()
              }
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="breadcrumb">
            Boshqaruv <ChevronRight size={13} />
            {selected ? (
              <>
                <button onClick={() => setSelected(null)}>Magazinlar</button>
                <ChevronRight size={13} />
                <span>{selected.name}</span>
              </>
            ) : (
              <span>{pageTitle}</span>
            )}
          </div>
          <span className="today">
            <span className="tiny-dot" />
            {dateLabel(tashkentDate())}
          </span>
        </header>
        <main className="content">
          {demoMode && (
            <div className="demo-banner">
              Ko‘rgazma rejimi · Namunaviy ma’lumotlar · O‘zgarishlar
              saqlanmaydi
            </div>
          )}
          <div className="page-heading">
            <div>
              {selected && (
                <button
                  className="back-button"
                  onClick={() => setSelected(null)}
                >
                  <ArrowLeft size={15} />
                  Magazinlarga qaytish
                </button>
              )}
              <h1>
                {pageTitle}
                {selected && (
                  <span
                    className={`status ${selected.is_active ? "" : "inactive"}`}
                  >
                    {selected.is_active ? "Faol" : "Faol emas"}
                  </span>
                )}
              </h1>
              <p>
                {selected
                  ? "Sotuvchilar va barcha chiqimlar bir joyda."
                  : view === "stores"
                    ? "Magazinlaringiz chiqimlarini bir joyda kuzating."
                    : "Sotuvchilar hisoblari va magazinlarga biriktirish."}
              </p>
            </div>
            <div className="actions">
              <button
                className="button icon-only"
                title="Yangilash"
                disabled={loading}
                onClick={() => {
                  void refresh();
                  setRevision((n) => n + 1);
                }}
              >
                <RefreshCw size={17} className={loading ? "spin" : ""} />
              </button>
              {selected ? (
                <button
                  className="button"
                  disabled={demoMode}
                  onClick={() => open({ type: "store", store: selected })}
                >
                  <Pencil size={15} />
                  Magazinni tahrirlash
                </button>
              ) : (
                <button
                  className="button primary"
                  disabled={demoMode}
                  onClick={() =>
                    open({ type: view === "stores" ? "store" : "seller" })
                  }
                >
                  <Plus size={17} />
                  {view === "stores" ? "Magazin qo‘shish" : "Sotuvchi qo‘shish"}
                </button>
              )}
            </div>
          </div>
          {loadError && (
            <ErrorBox text={loadError} retry={() => void refresh()} />
          )}
          {!selected && view === "stores" && (
            <div className="stats">
              <Stat
                label="Bugungi jami chiqim"
                value={money(totalToday)}
                unit="so‘m"
                icon={<ArrowDownLeft size={20} />}
                red
                foot="Barcha magazinlar bo‘yicha"
              />
              <Stat
                label="Magazinlar"
                value={String(stores.length)}
                icon={<Building2 size={20} />}
                foot={`${stores.filter((s) => s.is_active).length} ta faol magazin`}
              />
              <Stat
                label="Faol sotuvchilar"
                value={String(sellers.filter((s) => s.is_active).length)}
                icon={<Users size={20} />}
                foot="Magazinlarga biriktirilgan"
              />
            </div>
          )}
          {selected ? (
            <>
              <div className="store-team">
                <span className="team-label">
                  <Users size={17} />
                  Magazin sotuvchilari
                </span>
                <div className="team-members">
                  {storeSellers.length ? (
                    storeSellers.map((p) => (
                      <button
                        key={p.id}
                        className="team-member"
                        disabled={demoMode}
                        onClick={() => open({ type: "seller", seller: p })}
                      >
                        <span className="avatar small">
                          {initials(p.full_name)}
                        </span>
                        {p.full_name}
                        {!p.is_active && (
                          <span className="muted">(faol emas)</span>
                        )}
                      </button>
                    ))
                  ) : (
                    <span className="muted">Sotuvchi biriktirilmagan</span>
                  )}
                </div>
                <button
                  className="text-button"
                  disabled={demoMode}
                  onClick={() => open({ type: "seller" })}
                >
                  <Plus size={15} />
                  Sotuvchi
                </button>
              </div>
              <section className="panel">
                <div className="panel-title">
                  <div>
                    <h2>
                      Chiqim yozuvlari{" "}
                      <span className="count-badge">{rows?.count ?? 0}</span>
                    </h2>
                    <p>Summa xarajat sanasi bo‘yicha hisoblanadi.</p>
                  </div>
                  <div className="actions">
                    <button
                      className="button"
                      disabled={demoMode || !sellers.length}
                      onClick={() => open({ type: "record" })}
                    >
                      <Plus size={16} />
                      Qo‘lda yozuv
                    </button>
                    <button
                      className="button"
                      disabled={
                        exporting || reportLoading || !rows?.count || from > to
                      }
                      onClick={() => void exportRows()}
                    >
                      {exporting ? <Spinner /> : <Download size={16} />}XLSX
                      eksport
                    </button>
                  </div>
                </div>
                <div className="filters">
                  <label>
                    Sanadan
                    <input
                      type="date"
                      value={from}
                      max={tashkentDate()}
                      onInput={(e) => {
                        setFrom(e.currentTarget.value);
                        setPage(0);
                      }}
                      required
                    />
                  </label>
                  <span className="date-separator">—</span>
                  <label>
                    Sanagacha
                    <input
                      type="date"
                      value={to}
                      max={tashkentDate()}
                      onInput={(e) => {
                        setTo(e.currentTarget.value);
                        setPage(0);
                      }}
                      required
                    />
                  </label>
                  <label className="seller-filter">
                    Sotuvchi
                    <select
                      value={sellerFilter}
                      onChange={(e) => {
                        setSellerFilter(e.target.value);
                        setPage(0);
                      }}
                    >
                      <option value="">Barcha sotuvchilar</option>
                      {sellers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name}
                          {p.store_id !== selected.id
                            ? " (avvalgi/boshqa magazin)"
                            : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="filter-total">
                    <span>Davr uchun jami</span>
                    <strong>
                      {reportLoading ? "…" : money(rows?.total ?? 0)}{" "}
                      <small>so‘m</small>
                    </strong>
                  </div>
                </div>
                {reportError && (
                  <ErrorBox
                    text={reportError}
                    retry={() => setRevision((n) => n + 1)}
                  />
                )}
                {reportLoading ? (
                  <div className="table-loading">
                    <Spinner /> Yozuvlar yuklanmoqda…
                  </div>
                ) : rows?.rows.length ? (
                  <div className="table-scroll">
                    <table className="expenses-table">
                      <thead>
                        <tr>
                          <th>Sana / vaqt</th>
                          <th>Sotuvchi</th>
                          <th>Izoh</th>
                          <th className="right">Summa</th>
                          <th className="right">Amallar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.rows.map((e) => (
                          <tr
                            key={e.id}
                            className={e.deleted_at ? "cancelled" : ""}
                          >
                            <td>
                              <strong>{dateLabel(e.expense_date)}</strong>
                              <small>{time(e.occurred_at)}</small>
                            </td>
                            <td>{sellerName(e.seller_id)}</td>
                            <td className="note-cell">
                              {e.note}
                              {e.deleted_at && (
                                <span className="cancel-label">
                                  Bekor qilingan
                                </span>
                              )}
                            </td>
                            <td className="right amount">
                              {money(e.amount_uzs)} <small>so‘m</small>
                            </td>
                            <td>
                              <div className="row-actions">
                                <button
                                  className="icon-button"
                                  title="Audit tarixi"
                                  onClick={() =>
                                    open({ type: "audit", expense: e })
                                  }
                                >
                                  <History size={16} />
                                </button>
                                <button
                                  className="icon-button"
                                  disabled={demoMode || !!e.deleted_at}
                                  title="Tahrirlash"
                                  onClick={() =>
                                    open({ type: "edit", expense: e })
                                  }
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  className="icon-button danger-text"
                                  disabled={demoMode || !!e.deleted_at}
                                  title="Bekor qilish"
                                  onClick={() =>
                                    open({ type: "cancel", expense: e })
                                  }
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  !reportError && (
                    <Empty title="Bu davrda chiqimlar yo‘q">
                      Sana oralig‘ini o‘zgartiring yoki sotuvchining
                      sinxronlashini kuting.
                    </Empty>
                  )
                )}
                <div className="table-footer">
                  <span>
                    {rows?.count ?? 0} ta yozuv · Bekor qilinganlar jamiga
                    kirmaydi
                  </span>
                  <div className="pagination">
                    <button
                      className="icon-button"
                      aria-label="Oldingi sahifa"
                      disabled={page === 0 || reportLoading}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <span>
                      {page + 1} /{" "}
                      {Math.max(1, Math.ceil((rows?.count ?? 0) / 50))}
                    </span>
                    <button
                      className="icon-button"
                      aria-label="Keyingi sahifa"
                      disabled={
                        (page + 1) * 50 >= (rows?.count ?? 0) || reportLoading
                      }
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <section className="panel">
              <div className="panel-title">
                <div>
                  <h2>
                    {view === "stores"
                      ? "Barcha magazinlar"
                      : "Barcha sotuvchilar"}{" "}
                    <span className="count-badge">
                      {view === "stores" ? stores.length : sellers.length}
                    </span>
                  </h2>
                  <p>
                    {view === "stores"
                      ? "Kunlik chiqimlar va oxirgi sinxronlash ma’lumotlari."
                      : "Har bir magazinda bir nechta sotuvchi ishlashi mumkin."}
                  </p>
                </div>
                <div className="search">
                  <Search size={17} />
                  <input
                    aria-label="Qidirish"
                    placeholder={
                      view === "stores"
                        ? "Magazin yoki sotuvchi qidirish…"
                        : "Sotuvchi qidirish…"
                    }
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              {loading && !data ? (
                <div className="table-loading">
                  <Spinner /> Ma’lumotlar yuklanmoqda…
                </div>
              ) : view === "stores" ? (
                filteredStores.length ? (
                  <div className="table-scroll">
                    <table className="stores-table">
                      <thead>
                        <tr>
                          <th>Magazin</th>
                          <th>Sotuvchilar</th>
                          <th className="right">Bugungi chiqim</th>
                          <th>Oxirgi sinxronlash</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStores.map((s, i) => {
                          const team = sellers.filter(
                            (p) => p.store_id === s.id,
                          );
                          return (
                            <tr key={s.id}>
                              <td>
                                <button
                                  className="store-link"
                                  onClick={() => chooseStore(s)}
                                >
                                  <span
                                    className={`store-icon store-color-${i % 4}`}
                                  >
                                    <Building2 size={21} />
                                  </span>
                                  <span>
                                    <strong>{s.name}</strong>
                                    <small>
                                      {s.is_active
                                        ? "Faol magazin"
                                        : "Faol emas"}
                                    </small>
                                  </span>
                                </button>
                              </td>
                              <td>
                                <div className="seller-stack">
                                  {team.slice(0, 2).map((p) => (
                                    <span
                                      className="avatar small"
                                      key={p.id}
                                      title={p.full_name}
                                    >
                                      {initials(p.full_name)}
                                    </span>
                                  ))}
                                  <span>
                                    {team.length === 1
                                      ? team[0].full_name
                                      : team.length
                                        ? `${team.length} ta sotuvchi`
                                        : "Biriktirilmagan"}
                                  </span>
                                </div>
                              </td>
                              <td className="right amount">
                                {money(s.today_total)} <small>so‘m</small>
                              </td>
                              <td className="sync-cell">
                                <span className="sync-dot" />
                                {syncLabel(s.last_synced_at)}
                              </td>
                              <td>
                                <button
                                  className="icon-button"
                                  aria-label={`${s.name} yozuvlarini ochish`}
                                  onClick={() => chooseStore(s)}
                                >
                                  <ChevronRight size={19} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    title={
                      search
                        ? "Magazin topilmadi"
                        : "Birinchi magaziningizni qo‘shing"
                    }
                  >
                    {search
                      ? "Boshqa nom bilan qidirib ko‘ring."
                      : "Magazin yaratib, unga sotuvchilarni biriktiring."}
                  </Empty>
                )
              ) : filteredSellers.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Sotuvchi</th>
                        <th>Magazin</th>
                        <th>Hisob holati</th>
                        <th className="right">Amallar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSellers.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <div className="seller-stack">
                              <span className="avatar">
                                {initials(p.full_name)}
                              </span>
                              <strong>{p.full_name}</strong>
                            </div>
                          </td>
                          <td>
                            {stores.find((s) => s.id === p.store_id)?.name ??
                              "—"}
                          </td>
                          <td>
                            <span
                              className={`status ${p.is_active ? "" : "inactive"}`}
                            >
                              {p.is_active ? "Faol" : "Faol emas"}
                            </span>
                          </td>
                          <td className="right">
                            <button
                              className="icon-button"
                              disabled={demoMode}
                              title="Sotuvchini tahrirlash"
                              onClick={() =>
                                open({ type: "seller", seller: p })
                              }
                            >
                              <MoreHorizontal size={20} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty title="Sotuvchilar topilmadi">
                  Magazin yaratib, sotuvchi hisobini qo‘shing.
                </Empty>
              )}
              <div className="table-footer">
                <span>
                  {view === "stores"
                    ? filteredStores.length
                    : filteredSellers.length}{" "}
                  ta {view === "stores" ? "magazin" : "sotuvchi"}
                </span>
                <span>
                  <ShieldCheck size={13} /> Ma’lumotlar vakolat bilan
                  himoyalangan
                </span>
              </div>
            </section>
          )}
          <div className="page-note">
            <span>Chiqimlarni aniq kuzating.</span>
            <span>Vaqt mintaqasi: Toshkent (UTC+5)</span>
          </div>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
      {dialog && (
        <Modal
          title={
            dialog.type === "store"
              ? dialog.store
                ? "Magazinni tahrirlash"
                : "Yangi magazin"
              : dialog.type === "seller"
                ? dialog.seller
                  ? "Sotuvchini tahrirlash"
                  : "Yangi sotuvchi"
                : dialog.type === "edit"
                  ? "Chiqimni tuzatish"
                  : dialog.type === "cancel"
                    ? "Chiqimni bekor qilish"
                    : dialog.type === "record"
                      ? "Chiqimni qo‘lda kiritish"
                      : dialog.type === "audit"
                        ? "O‘zgarishlar tarixi"
                        : "Foydalanish qo‘llanmasi"
          }
          close={close}
        >
          {dialog.type === "help" ? (
            <div className="help-content">
              <p>
                Magazinni ochib, chiqimlarni sana va sotuvchi bo‘yicha ko‘ring.
                XLSX eksport tanlangan davrdagi faol yozuvlarni oladi.
              </p>
              <p>
                “Sotuvchilar” bo‘limida hisob yarating, magazinga biriktiring
                yoki hisobni faolsizlantiring. Har bir magazinda bir nechta
                sotuvchi ishlashi mumkin.
              </p>
              <p>
                “Oxirgi sinxronlash” yozuvlar serverga oxirgi muvaffaqiyatli
                yuborilgan vaqtni bildiradi.
              </p>
              <p>
                Magazin almashtirilganda eski lokal yozuvlar rad qilinadi. Eski
                magazinni ochib, “Qo‘lda yozuv” orqali mobildagi asl UUID bilan
                kiriting. So‘ng sotuvchining lokal navbatini tasdiq bilan
                arxivlang.
              </p>
              <p>
                Tuzatishlar va bekor qilish audit tarixida saqlanadi. Bekor
                qilingan yozuvlar jamiga kirmaydi.
              </p>
            </div>
          ) : dialog.type === "audit" ? (
            <AuditHistory expense={dialog.expense} />
          ) : (
            <form className="modal-form" onSubmit={save}>
              {dialog.type === "store" && (
                <>
                  <label>
                    Magazin nomi
                    <input
                      name="name"
                      required
                      maxLength={120}
                      defaultValue={dialog.store?.name}
                      placeholder="Masalan, Chilonzor filiali"
                      autoFocus
                    />
                  </label>
                  {dialog.store && (
                    <label className="checkbox">
                      <input
                        name="is_active"
                        type="checkbox"
                        defaultChecked={dialog.store.is_active}
                      />
                      Magazin faol
                    </label>
                  )}
                </>
              )}
              {dialog.type === "seller" && (
                <>
                  <label>
                    Ism va familiya
                    <input
                      name="full_name"
                      required
                      maxLength={120}
                      defaultValue={dialog.seller?.full_name}
                      placeholder="Sotuvchining to‘liq ismi"
                      autoFocus
                    />
                  </label>
                  <label>
                    Magazin
                    <select
                      name="store_id"
                      required
                      defaultValue={
                        dialog.seller?.store_id ?? selected?.id ?? ""
                      }
                    >
                      <option value="" disabled>
                        Magazinni tanlang
                      </option>
                      {stores
                        .filter(
                          (s) =>
                            s.is_active || s.id === dialog.seller?.store_id,
                        )
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                            {!s.is_active ? " (faol emas)" : ""}
                          </option>
                        ))}
                    </select>
                  </label>
                  {dialog.seller ? (
                    <>
                      <label className="checkbox">
                        <input
                          name="is_active"
                          type="checkbox"
                          defaultChecked={dialog.seller.is_active}
                        />
                        Hisob faol
                      </label>
                      <p className="form-note">
                        Magazin o‘zgarsa, eski magazin uchun yuborilmagan
                        yozuvlar admin orqali hal qilinadi.
                      </p>
                    </>
                  ) : (
                    <>
                      <label>
                        Email
                        <input
                          type="email"
                          name="email"
                          required
                          maxLength={254}
                          autoComplete="off"
                          placeholder="sotuvchi@magazin.uz"
                        />
                      </label>
                      <label>
                        Boshlang‘ich parol
                        <input
                          type="password"
                          name="password"
                          required
                          minLength={12}
                          maxLength={128}
                          autoComplete="new-password"
                          placeholder="Kamida 12 ta belgi"
                        />
                      </label>
                      <p className="form-note">
                        Kirish ma’lumotlarini sotuvchiga xavfsiz usulda bering.
                      </p>
                    </>
                  )}
                </>
              )}
              {(dialog.type === "edit" || dialog.type === "record") && (
                <>
                  {dialog.type === "record" && (
                    <>
                      <p className="form-note">
                        Magazin: <strong>{selected?.name}</strong>. Eski
                        navbatni hal qilishda mobildagi asl yozuv ID sini
                        kiriting.
                      </p>
                      <label>
                        Yozuv ID (UUID)
                        <input
                          name="id"
                          defaultValue={crypto.randomUUID()}
                          required
                          pattern="[0-9a-fA-F-]{36}"
                        />
                      </label>
                      <label>
                        Sotuvchi
                        <select name="seller_id" required>
                          <option value="">Sotuvchini tanlang</option>
                          {sellers.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.full_name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                  <div className="form-grid">
                    <label>
                      Xarajat sanasi
                      <input
                        name="expense_date"
                        type="date"
                        min="2000-01-01"
                        max={tashkentDate()}
                        defaultValue={
                          dialog.type === "edit"
                            ? dialog.expense.expense_date
                            : tashkentDate()
                        }
                        required
                      />
                    </label>
                    <label>
                      Summa (so‘m)
                      <input
                        name="amount_uzs"
                        type="number"
                        min="1"
                        max="9007199254740991"
                        step="1"
                        defaultValue={
                          dialog.type === "edit"
                            ? dialog.expense.amount_uzs
                            : ""
                        }
                        required
                      />
                    </label>
                  </div>
                  <label>
                    Izoh
                    <textarea
                      name="note"
                      rows={4}
                      required
                      maxLength={1000}
                      defaultValue={
                        dialog.type === "edit" ? dialog.expense.note : ""
                      }
                      placeholder="Xarajat sababini kiriting"
                    />
                  </label>
                  <p className="form-note">
                    O‘zgarish server vaqti va administrator bilan auditda
                    saqlanadi.
                  </p>
                </>
              )}
              {dialog.type === "cancel" && (
                <div className="cancel-confirm">
                  <div className="cancel-symbol">
                    <X size={25} />
                  </div>
                  <p>
                    <strong>{money(dialog.expense.amount_uzs)} so‘m</strong>{" "}
                    miqdoridagi chiqim bekor qilinsinmi?
                  </p>
                  <p className="muted">
                    Yozuv jamidan chiqariladi. Asl ma’lumot va audit tarixi
                    saqlanadi.
                  </p>
                  <blockquote>{dialog.expense.note}</blockquote>
                </div>
              )}
              {formError && <ErrorBox text={formError} />}
              <div className="modal-actions">
                <button
                  type="button"
                  className="button"
                  disabled={saving}
                  onClick={close}
                >
                  Yopish
                </button>
                <button
                  className={`button ${dialog.type === "cancel" ? "danger" : "primary"}`}
                  disabled={saving || demoMode}
                >
                  {saving ? (
                    <Spinner />
                  ) : dialog.type === "cancel" ? (
                    "Bekor qilish"
                  ) : (
                    "Saqlash"
                  )}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}
function Stat({
  label,
  value,
  unit,
  icon,
  red,
  foot,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: ReactNode;
  red?: boolean;
  foot: string;
}) {
  return (
    <div className={`stat ${red ? "stat-red" : ""}`}>
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value">
        {value}
        <small>{unit}</small>
      </div>
      <div className="stat-foot">
        {red && <span className="tiny-dot" />}
        {foot}
      </div>
    </div>
  );
}
function AuditHistory({ expense }: { expense: Expense }) {
  const [rows, setRows] = useState<Audit[] | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    audit(expense.id)
      .then((data) => {
        if (live) setRows(data);
      })
      .catch((e) => {
        if (live) setError(message(e));
      });
    return () => {
      live = false;
    };
  }, [expense.id, retry]);
  return (
    <div className="audit-content">
      {error ? (
        <ErrorBox
          text={error}
          retry={() => {
            setError("");
            setRetry((n) => n + 1);
          }}
        />
      ) : !rows ? (
        <div className="table-loading">
          <Spinner />
        </div>
      ) : rows.length ? (
        rows.map((row) => (
          <article className="audit-item" key={row.id}>
            <span className="audit-dot" />
            <strong>
              {!row.old_values
                ? "Yozuv yaratildi"
                : row.new_values.deleted_at
                  ? "Yozuv bekor qilindi"
                  : "Yozuv tuzatildi"}
            </strong>
            <small>{syncLabel(row.server_time)}</small>
            <p>
              {row.old_values && `${money(row.old_values.amount_uzs)} → `}
              {money(row.new_values.amount_uzs)} so‘m ·{" "}
              {row.new_values.expense_date}
            </p>
            <p>{row.new_values.note}</p>
            <code>Admin/actor: {row.actor_id}</code>
          </article>
        ))
      ) : (
        <Empty title="Audit yozuvlari yo‘q">
          {demoMode
            ? "Ko‘rgazma rejimida audit yuklanmaydi."
            : "Bu yozuv uchun tarix topilmadi."}
        </Empty>
      )}
    </div>
  );
}
