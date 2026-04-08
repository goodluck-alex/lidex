import Link from "next/link";
import { AmbassadorLeaderboard, type LeaderRow } from "../../../../components/ambassador/AmbassadorLeaderboard";
import { Card, PageShell } from "../../../../components/ui";
import { adminApi } from "../../../../lib/adminServer";
import {
  grantAmbassadorReward,
  patchAmbassadorProfile,
  reviewAmbassadorApplication
} from "../../actions";

export const dynamic = "force-dynamic";

type ApplicationRow = {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  telegram: string;
  twitter: string;
  country: string;
  promoExperience: string;
  promotePlan: string;
  youtube: string | null;
  discord: string | null;
  website: string | null;
  status: string;
  reviewNote: string | null;
  createdAt: string;
  user: { address: string };
};

type ProfileRow = {
  userId: string;
  publicUsername: string;
  status: string;
  signups: number;
  activeUsers: number;
  traders: number;
  deposits: number;
  totalPoints: number;
  ldxRewarded: string;
  user: { address: string };
};

export default async function InternalAdminAmbassadorPage() {
  let applications: ApplicationRow[] = [];
  let profiles: ProfileRow[] = [];
  let monthKey = "";
  let leaderboardRows: LeaderRow[] = [];
  let err: string | null = null;

  try {
    const [appsRes, profRes, lbRes] = await Promise.all([
      adminApi<{ applications: ApplicationRow[] }>("/v1/admin/ambassador/applications"),
      adminApi<{ profiles: ProfileRow[] }>("/v1/admin/ambassador/profiles"),
      adminApi<{ monthKey: string; rows: LeaderRow[] }>("/v1/admin/ambassador/leaderboard")
    ]);
    applications = appsRes.applications || [];
    profiles = profRes.profiles || [];
    monthKey = lbRes.monthKey || "";
    leaderboardRows = lbRes.rows || [];
  } catch (e: unknown) {
    err = e instanceof Error ? e.message : "Failed to load";
  }

  if (err) {
    return (
      <PageShell title="Ambassadors" subtitle="Applications, profiles, rewards, leaderboard">
        <Card tone="danger" title="Error">
          {err}
        </Card>
      </PageShell>
    );
  }

  const pending = applications.filter((a) => a.status === "pending");

  return (
    <PageShell
      title="Ambassadors"
      subtitle="Review applications, manage status (approved / elite / banned), grant LDX rewards, and view the monthly points leaderboard. Public routes: /ambassador, /admin/ambassador (alias)."
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <Link
          href="/ambassador"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-[#7aa7ff] underline"
        >
          Public program →
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`Pending applications (${pending.length})`}>
          {pending.length === 0 ? (
            <p className="text-sm text-white/55">No pending applications.</p>
          ) : (
            <ul className="space-y-6">
              {pending.map((a) => (
                <li key={a.id} className="rounded-xl border border-white/[0.08] bg-black/20 p-3 text-sm">
                  <p className="font-semibold text-white">
                    {a.fullName} <span className="font-mono text-xs text-white/50">@{a.username}</span>
                  </p>
                  <p className="mt-1 text-xs text-white/45">User: {a.userId}</p>
                  <p className="mt-1 text-xs text-white/55">
                    {a.country} · TG {a.telegram} · X {a.twitter}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-white/65">{a.promoExperience}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/65">{a.promotePlan}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={reviewAmbassadorApplication}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <button
                        type="submit"
                        className="rounded-lg border border-[#00c896]/40 bg-[#00c896]/15 px-3 py-1.5 text-xs font-bold text-white hover:bg-[#00c896]/25"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={reviewAmbassadorApplication} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <input
                        name="note"
                        placeholder="Optional note"
                        className="min-w-[8rem] rounded border border-white/15 bg-black/40 px-2 py-1 text-xs text-white"
                      />
                      <button
                        type="submit"
                        className="rounded-lg border border-red-400/35 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-100 hover:bg-red-500/15"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Grant LDX reward">
          <form action={grantAmbassadorReward} className="space-y-3 text-sm">
            <label className="block text-white/80">
              Ambassador user ID
              <input
                name="userId"
                required
                list="ambassador-user-ids"
                className="mt-1 w-full rounded-lg border border-white/12 bg-black/35 px-3 py-2 font-mono text-xs text-white"
              />
            </label>
            <datalist id="ambassador-user-ids">
              {profiles.map((p) => (
                <option key={p.userId} value={p.userId}>
                  @{p.publicUsername}
                </option>
              ))}
            </datalist>
            <label className="block text-white/80">
              Amount (LDX)
              <input name="amountLdx" required className="mt-1 w-full rounded-lg border border-white/12 bg-black/35 px-3 py-2 text-white" />
            </label>
            <label className="block text-white/80">
              Kind
              <input
                name="kind"
                defaultValue="manual"
                className="mt-1 w-full rounded-lg border border-white/12 bg-black/35 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-white/80">
              Month key (optional, YYYY-MM)
              <input
                name="monthKey"
                placeholder="2026-04"
                className="mt-1 w-full rounded-lg border border-white/12 bg-black/35 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-white/80">
              Note
              <textarea name="note" rows={2} className="mt-1 w-full rounded-lg border border-white/12 bg-black/35 px-3 py-2 text-white" />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-[#2979ff] px-4 py-2 text-sm font-bold text-white hover:bg-[#3d87ff]"
            >
              Grant reward
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <Card title={`Ambassador profiles (${profiles.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-xs text-white/85">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-wide text-white/45">
                  <th className="py-2 pr-2">User</th>
                  <th className="py-2 pr-2">@</th>
                  <th className="py-2 pr-2">Pts</th>
                  <th className="py-2 pr-2">LDX</th>
                  <th className="py-2 pr-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.userId} className="border-b border-white/[0.06]">
                    <td className="py-2 pr-2 font-mono text-[10px] text-white/55">{p.userId.slice(0, 12)}…</td>
                    <td className="py-2 pr-2 font-semibold">{p.publicUsername}</td>
                    <td className="py-2 pr-2 tabular-nums">{p.totalPoints}</td>
                    <td className="py-2 pr-2 tabular-nums text-[#00c896]">{p.ldxRewarded}</td>
                    <td className="py-2 pr-2">
                      <form action={patchAmbassadorProfile} className="flex flex-wrap items-center gap-1">
                        <input type="hidden" name="userId" value={p.userId} />
                        <select
                          name="status"
                          defaultValue={p.status}
                          className="rounded border border-white/15 bg-black/40 px-1.5 py-1 text-[11px] text-white"
                        >
                          <option value="approved">approved</option>
                          <option value="elite">elite</option>
                          <option value="banned">banned</option>
                        </select>
                        <button type="submit" className="rounded bg-white/10 px-2 py-1 text-[10px] font-bold hover:bg-white/15">
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <AmbassadorLeaderboard monthKey={monthKey} rows={leaderboardRows} />
      </div>
    </PageShell>
  );
}
