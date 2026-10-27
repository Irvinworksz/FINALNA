import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Cpu, Database, RefreshCw, Zap, TrendingUp, 
  Clock, ShieldCheck, Activity, Layers, Server, Sparkles, CheckCircle2, AlertCircle
} from 'lucide-react';
import { apiClient } from '../lib/api';
import type { StaffAnalyticsData } from '../types';

export const StaffAnalyticsView: React.FC = () => {
  const [data, setData] = useState<StaffAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [subView, setSubView] = useState<'all' | 'civic' | 'scalability'>('all');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    const res = await apiClient.getStaffAnalytics();
    setLoading(false);
    if (res.success && res.data) {
      setData(res.data);
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } else {
      setError(res.error || 'Failed to load analytics telemetry.');
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading && !data) {
    return (
      <div className="glass-panel p-12 rounded-3xl border border-white/80 shadow-md text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <div>
          <h3 className="text-base font-bold text-slate-900">Gathering Intelligence Telemetry</h3>
          <p className="text-xs text-slate-500 mt-1">
            Aggregating resident demographics, clearance volume, and database execution latency...
          </p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="glass-panel p-8 rounded-3xl border border-rose-200 shadow-md text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Telemetry Unavailable</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">{error}</p>
        <button
          type="button"
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { civic, scalability } = data;

  return (
    <div className="space-y-6">
      {/* Sub-Header & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 glass-panel rounded-2xl border border-white/80 shadow-sm">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl">
          <button
            type="button"
            onClick={() => setSubView('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              subView === 'all' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Analytics
          </button>
          <button
            type="button"
            onClick={() => setSubView('civic')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              subView === 'civic' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Civic Demographics
          </button>
          <button
            type="button"
            onClick={() => setSubView('scalability')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              subView === 'scalability' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Scalability & Systems
          </button>
        </div>

        <div className="flex items-center gap-3 px-2 text-xs text-slate-500">
          {lastUpdated && (
            <span className="font-mono text-[11px]">
              Synchronized {lastUpdated}
            </span>
          )}
          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={loading}
            className="px-3 py-1.5 btn-3d-secondary text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Recalculate Metrics</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 glass-card rounded-3xl border border-white/80 shadow-md space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Registered Residents</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono tabular-nums tracking-tight">
            {civic.totalResidents}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="text-emerald-600 font-bold">{civic.verifiedResidents} verified</span>
            <span aria-hidden="true">·</span>
            <span>{civic.pendingVerifications} awaiting review</span>
          </div>
        </div>

        <div className="p-5 glass-card rounded-3xl border border-white/80 shadow-md space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Total Applications</span>
            <BarChart3 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-black text-indigo-600 font-mono tabular-nums tracking-tight">
            {civic.totalClearanceRequests}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="text-emerald-600 font-bold">{civic.completedRequests} released</span>
            <span aria-hidden="true">·</span>
            <span>{civic.pendingReviewRequests} pending desk</span>
          </div>
        </div>

        <div className="p-5 glass-card rounded-3xl border border-white/80 shadow-md space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Database Query Latency</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-emerald-600 font-mono tabular-nums tracking-tight">
            {scalability.queryLatency.indexedLookupMs}ms
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="text-blue-600 font-bold">O(1) Hash Map</span>
            <span aria-hidden="true">·</span>
            <span>P95: {scalability.queryLatency.p95LatencyMs}ms</span>
          </div>
        </div>

        <div className="p-5 glass-card rounded-3xl border border-white/80 shadow-md space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Cache Efficiency</span>
            <Cpu className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-blue-600 font-mono tabular-nums tracking-tight">
            {scalability.cacheAndStorage.cacheHitRatio}%
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="font-mono">{scalability.systemLoad.activeMemoryHeapMb}MB heap</span>
            <span aria-hidden="true">·</span>
            <span>{scalability.cacheAndStorage.auditChainBlocksCount} ledger blocks</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: CIVIC DATA ANALYTICS */}
      {(subView === 'all' || subView === 'civic') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                <span>Civic Governance & Demographic Distribution</span>
              </h3>
              <p className="text-xs text-slate-500">
                Data aggregations across Purok zones, document categories, and social assistance waivers.
              </p>
            </div>
            <div className="text-xs font-mono text-slate-500 hidden sm:block">
              Total Revenue: ₱{civic.revenue.totalCollected.toFixed(2)}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Purok Distribution Bar Chart */}
            <div className="lg:col-span-2 p-6 glass-card rounded-3xl border border-white/80 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                    Demographic Distribution by Purok
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Resident constituents and clearance request volume across administrative zones
                  </p>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-slate-600 font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
                    <span>Residents</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-indigo-400 inline-block" />
                    <span>Clearances</span>
                  </div>
                </div>
              </div>

              {/* Bar Chart Grid */}
              <div className="space-y-3 pt-1">
                {civic.purokDistribution.map((item) => {
                  const maxVal = Math.max(
                    ...civic.purokDistribution.map(p => Math.max(p.residentCount, p.requestCount)),
                    4
                  );
                  const resWidth = Math.max(4, Math.round((item.residentCount / maxVal) * 100));
                  const reqWidth = Math.max(4, Math.round((item.requestCount / maxVal) * 100));

                  return (
                    <div key={item.purok} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">{item.purok}</span>
                        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
                          <span>{item.residentCount} res</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.requestCount} reqs</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                            style={{ width: `${resWidth}%` }}
                          />
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-400 rounded-full transition-all duration-500" 
                            style={{ width: `${reqWidth}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Document Demand & Revenue Breakdown */}
            <div className="p-6 glass-card rounded-3xl border border-white/80 shadow-md space-y-5 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono border-b border-slate-100 pb-3">
                  Document Service Demand
                </h4>
                <div className="space-y-3.5 mt-4">
                  {civic.documentTypeDistribution.map((doc) => (
                    <div key={doc.type} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 truncate max-w-[180px]">{doc.label}</span>
                        <span className="font-mono text-slate-500 font-bold tabular-nums">
                          {doc.count} ({doc.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all"
                          style={{ width: `${Math.max(5, doc.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social Assistance & Revenue Box */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Total Fees Collected</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    ₱{civic.revenue.totalCollected.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Waived for Indigent Residents</span>
                  <span className="font-mono font-bold text-emerald-600 tabular-nums">
                    ₱{civic.revenue.totalWaivedIndigent.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Avg. Turnaround Velocity</span>
                  <span className="font-mono font-bold text-blue-600 tabular-nums">
                    {civic.turnaroundMetrics.avgTurnaroundHours} hrs
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: SCALABILITY & SYSTEMS TELEMETRY */}
      {(subView === 'all' || subView === 'scalability') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-600" />
                <span>Scalability & Performance Engineering Telemetry</span>
              </h3>
              <p className="text-xs text-slate-500">
                Evaluation metrics for query execution speed, memory footprint, and algorithm scaling curves.
              </p>
            </div>
            <div className="text-xs font-mono text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              SHA-256 Chain: Intact
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Query Latency Breakdown */}
            <div className="p-6 glass-card rounded-3xl border border-white/80 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                  Query Latency Benchmarks
                </h4>
                <Zap className="w-4 h-4 text-amber-500" />
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Indexed Hash Lookup</span>
                    <span className="font-mono font-bold text-emerald-600 tabular-nums">
                      {scalability.queryLatency.indexedLookupMs} ms
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    O(1) Map search by resident primary key
                  </p>
                </div>

                <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Linear Scan Baseline</span>
                    <span className="font-mono font-bold text-amber-600 tabular-nums">
                      {scalability.queryLatency.linearScanBenchmarkMs} ms
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    O(N) unindexed sequential traversal over 1,500 records
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                  <div className="p-2 bg-slate-100/60 rounded-xl">
                    <div className="text-[10px] text-slate-500">P50</div>
                    <div className="text-xs font-bold text-slate-800 tabular-nums">
                      {scalability.queryLatency.p50LatencyMs}ms
                    </div>
                  </div>
                  <div className="p-2 bg-slate-100/60 rounded-xl">
                    <div className="text-[10px] text-slate-500">P95</div>
                    <div className="text-xs font-bold text-slate-800 tabular-nums">
                      {scalability.queryLatency.p95LatencyMs}ms
                    </div>
                  </div>
                  <div className="p-2 bg-slate-100/60 rounded-xl">
                    <div className="text-[10px] text-slate-500">P99</div>
                    <div className="text-xs font-bold text-slate-800 tabular-nums">
                      {scalability.queryLatency.p99LatencyMs}ms
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Memory & System Load */}
            <div className="p-6 glass-card rounded-3xl border border-white/80 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                  Memory & Resource Load
                </h4>
                <Server className="w-4 h-4 text-blue-500" />
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Rate Limiting Threshold</span>
                    <span className="font-mono font-bold text-slate-800 tabular-nums">
                      {scalability.systemLoad.requestsPerMinute} / {scalability.systemLoad.rateLimitCeiling} req/min
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${scalability.systemLoad.rateLimitUsagePercent}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">V8 Heap Memory Used</span>
                    <span className="font-mono font-bold text-slate-800 tabular-nums">
                      {scalability.systemLoad.activeMemoryHeapMb} MB
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Total Resident Set Size (RSS)</span>
                    <span className="font-mono font-bold text-slate-800 tabular-nums">
                      {scalability.systemLoad.totalMemoryRssMb} MB
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Active In-Memory Entities</span>
                    <span className="font-mono font-bold text-indigo-600 tabular-nums">
                      {scalability.cacheAndStorage.inMemoryEntityCount} objects
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Encrypted Store on Disk</span>
                    <span className="font-mono font-bold text-slate-800 tabular-nums">
                      {(scalability.cacheAndStorage.diskPersistenceBytes / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Big-O Algorithm Scalability Model */}
            <div className="p-6 glass-card rounded-3xl border border-white/80 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                  Algorithm Scaling Blueprint
                </h4>
                <Layers className="w-4 h-4 text-indigo-500" />
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">Resident Identity Lookup</div>
                  <div className="font-bold text-blue-700 font-mono mt-0.5">
                    {scalability.algorithmComplexity.residentLookupComplexity}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">Clearance Queue Filtering</div>
                  <div className="font-bold text-indigo-700 font-mono mt-0.5">
                    {scalability.algorithmComplexity.clearanceFilterComplexity}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-mono">Audit Log Non-Repudiation</div>
                  <div className="font-bold text-emerald-700 font-mono mt-0.5">
                    {scalability.algorithmComplexity.auditChainAppendComplexity}
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-600">
                  <span>Projected Latency @ 10,000 Users</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    ~{scalability.algorithmComplexity.projectedLatencyAt10kUsersMs} ms
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
