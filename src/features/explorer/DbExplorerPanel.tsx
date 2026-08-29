import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
import { Play, Database, Table as TableIcon, HardDrive, Wifi, Code } from "lucide-react";
import { BackupPanel } from "../backup/BackupPanel";
import { ConnectPanel } from "../connect/ConnectPanel";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { runQuery, fetchSchema as fetchSchemaApi } from "./services/explorer.service";

export const DbExplorerPanel: React.FC<any> = ({
  selectedProject,
  tasks,
  sprints,
  projectMembers,
  activityLogs,
  masterData,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"explorer" | "backup" | "connect">("explorer");
  const [schema, setSchema] = useState<any>(null);
  const [tableStats, setTableStats] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  // #20 — state `dbMode`, `dbHost`, dan `switching` DIBUANG 16 Agu 2026 atas
  // keputusan pemilik proyek, bersama `fetchDbStatus` dan `handleToggleDbMode`.
  //
  // Sesi sebelumnya sudah menandainya KODE MATI dan meninggalkan daftar hapus
  // yang tepat; penghapusannya sengaja ditunda agar jadi keputusan sadar, bukan
  // efek samping refactor. Keputusan itu kini diambil.
  //
  // Sejalan dengan ketetapan "Postgres saja": tidak ada MySQL di LanPro, jadi
  // toggle antar mode database tidak punya alasan untuk ada.
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchSchema();
    // `fetchDbStatus()` dibuang di sini (#20): ia menembak API pada SETIAP
    // mount dan hasilnya tidak pernah ditampilkan di mana pun.
  }, []);

  const fetchSchema = async () => {
    try {
      const data = await fetchSchemaApi();
      if (data.status === "success") {
        setSchema(data.tables);
        if (data.stats) {
          setTableStats(data.stats);
        }
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0 || !bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleRunQuery = async (sqlToRun: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await runQuery(sqlToRun);

      if (data.status === "error") {
        setError(data.message || "Terjadi kesalahan kueri database.");
      } else {
        setResult(data.data);
        setCurrentPage(1);
      }
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan kueri database.");
    } finally {
      setLoading(false);
    }
  };

  const loadTable = (tableName: string) => {
    setActiveTable(tableName);
    const sql = `SELECT * FROM ${tableName} LIMIT 100;`;
    setQuery(sql);
    handleRunQuery(sql);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-muted p-4 md:p-5 gap-4 text-left animate-in fade-in duration-300">
      {/* Header & Tabs */}
      <div className="bg-surface p-4 md:p-5 rounded-lg border border-border-subtle/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] leading-none font-medium text-indigo-600 bg-indigo-500/10 px-2.5 py-[3px] rounded-md border border-indigo-500/30">
              {t("dbExplorer.systemTools")}
            </span>
            <span className="text-xs text-content-subtle font-medium">
              {t("common.enterpriseControlCentre")}
            </span>
          </div>
          <h1 className="text-base font-medium text-content-strong tracking-tight flex items-center gap-2">
            {t("dbExplorer.databaseTools")}
          </h1>
          <p className="text-xs text-content-muted font-medium mt-0.5">
            {t("dbExplorer.toolsSubtitle")}
          </p>
        </div>

        <div className="flex bg-surface-muted p-0.5 rounded-md border border-border-subtle/80 shrink-0">
          <button
            onClick={() => setActiveTab("backup")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-all rounded flex items-center gap-1.5 cursor-pointer",
              activeTab === "backup"
                ? "bg-surface text-indigo-700 font-medium shadow-2xs"
                : "text-content-muted hover:text-content-strong"
            )}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>{t("dbExplorer.backupRestore")}</span>
          </button>
          <button
            onClick={() => setActiveTab("connect")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-all rounded flex items-center gap-1.5 cursor-pointer",
              activeTab === "connect"
                ? "bg-surface text-indigo-700 font-medium shadow-2xs"
                : "text-content-muted hover:text-content-strong"
            )}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>{t("dbExplorer.connection")}</span>
          </button>
          <button
            onClick={() => setActiveTab("explorer")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-all rounded flex items-center gap-1.5 cursor-pointer",
              activeTab === "explorer"
                ? "bg-surface text-indigo-700 font-medium shadow-2xs"
                : "text-content-muted hover:text-content-strong"
            )}
          >
            <Code className="w-3.5 h-3.5" />
            <span>{t("dbExplorer.explorer")}</span>
          </button>
        </div>
      </div>

      {activeTab === "backup" && (
        <div className="flex-1 overflow-hidden relative z-10 w-full h-full flex flex-col">
          <BackupPanel
            selectedProject={selectedProject}
            tasks={tasks}
            sprints={sprints}
            projectMembers={projectMembers}
            activityLogs={activityLogs}
            masterData={masterData}
          />
        </div>
      )}

      {activeTab === "connect" && (
        <div className="flex-1 overflow-hidden relative z-10 w-full h-full flex flex-col">
          <ConnectPanel />
        </div>
      )}

      {activeTab === "explorer" && (
        <div className="flex-1 bg-surface rounded-lg border border-border-subtle/80 shadow-2xs overflow-hidden flex flex-col min-h-0 relative z-10">
          {/* Database Mode Banner */}
          <div className="px-4 py-2.5 border-b border-border-subtle/80 flex flex-wrap items-center justify-between gap-4 shrink-0 bg-emerald-500/10 text-emerald-800">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse bg-emerald-500" />
              <span className="text-xs font-medium flex items-center gap-1.5">
                {t("dbExplorer.databaseMode")}{" "}
                <span className="underline font-medium">PostgreSQL (Neon Cloud)</span>
              </span>
              <span className="text-xs sm:text-[11px] opacity-75 hidden sm:inline">
                {t("dbExplorer.primaryEngineActive")}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={fetchSchema}
                title={t("dbExplorer.refreshSchemaTip")}
                className="p-1 hover:bg-black/5 rounded transition-all text-content-secondary hover:text-content flex items-center gap-1 text-xs font-medium cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 4.75L18 8"
                  />
                </svg>
                {t("dbExplorer.refreshSchema")}
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar: Table List */}
            <div className="w-[240px] bg-surface-sunken/50 border-r border-border-subtle/80 flex flex-col overflow-y-auto shrink-0 custom-scrollbar">
              <div className="px-3.5 py-2.5 text-xs sm:text-[11px] font-normal text-content-muted uppercase tracking-wider sticky top-0 bg-surface-sunken border-b border-border-subtle/80 flex justify-between items-center z-10">
                {t("dbExplorer.tables")}
              </div>
              <div className="p-2 flex flex-col gap-1">
                {schema &&
                  Object.keys(schema).map((tableName) => {
                    const stats = tableStats.find((s) => s.tableName === tableName);
                    return (
                      <button
                        key={tableName}
                        onClick={() => loadTable(tableName)}
                        className={`flex items-center justify-between gap-2 px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${activeTable === tableName ? "bg-indigo-500/10 text-indigo-700 font-medium border border-indigo-500/30" : "text-content-secondary hover:bg-surface-muted font-medium"}`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <TableIcon className="w-3.5 h-3.5 shrink-0 text-content-subtle" />
                          <span className="truncate">{tableName}</span>
                        </div>
                        {stats && (
                          <span className="text-xs sm:text-[10px] text-content-subtle font-mono tracking-tighter shrink-0">
                            {formatSize(stats.sizeBytes)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                {!schema && (
                  <div className="text-xs text-content-subtle px-3 py-2 font-medium">
                    {t("dbExplorer.loadingTables")}
                  </div>
                )}
              </div>
            </div>

            {/* Main Content: Query Editor and Results */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Query Editor */}
              <div className="p-3.5 border-b border-border-subtle/80 bg-surface-sunken/50 shrink-0">
                <div className="relative">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("dbExplorer.queryPlaceholder")}
                    className="w-full text-content-strong bg-surface border border-border-subtle rounded-md p-3 font-mono text-xs min-h-[90px] focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none resize-y"
                  />
                  <button
                    onClick={() => handleRunQuery(query)}
                    disabled={loading || !query.trim()}
                    className="absolute bottom-3 right-3 bg-indigo-600 hover:bg-indigo-700 text-content-inverse h-8 px-3.5 rounded-md shadow-2xs font-medium text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{t("dbExplorer.runQuery")}</span>
                  </button>
                </div>
              </div>

              {/* Results Area */}
              <div className="flex-1 overflow-auto bg-surface p-4">
                {!loading && !result && !error && (
                  <div className="h-full flex flex-col items-center justify-center text-content-subtle">
                    <Database className="w-12 h-12 mb-4 opacity-20" />
                    <p>{t("dbExplorer.pickTable")}</p>
                  </div>
                )}

                {loading && (
                  <div className="flex items-center gap-3 text-content-muted mt-4 ml-4">
                    <div className="w-4 h-4 rounded-full border-2 border-indigo-600 top-border-transparent animate-spin" />
                    {t("dbExplorer.executing")}
                  </div>
                )}

                {!loading && error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-700 p-4 rounded-lg font-mono text-sm max-w-full overflow-x-auto whitespace-pre-wrap">
                    {error}
                  </div>
                )}

                {!loading && result && Array.isArray(result) && (
                  <div className="border border-border-subtle rounded-lg overflow-x-auto">
                    <ResponsiveTable className="w-full text-left border-collapse text-sm">
                      <thead className="bg-primary-surface/5 text-primary font-normal uppercase tracking-wider">
                        <tr>
                          {result.length > 0 ? (
                            Object.keys(result[0]).map((key) => (
                              <th
                                key={key}
                                className="p-3 border-b border-border-subtle font-medium truncate max-w-[200px]"
                              >
                                {key}
                              </th>
                            ))
                          ) : (
                            <th className="p-3 border-b border-border-subtle font-medium text-content-subtle">
                              {t("dbExplorer.result0Rows")}
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-faint">
                        {result.length > 0 ? (
                          result.map((row: any, i: number) => (
                            <tr key={i} className="hover:bg-surface-sunken">
                              {Object.keys(row).map((key: string, j: number) => (
                                <td key={j} className="p-3 max-w-[300px]">
                                  <div className="truncate w-full text-content-secondary font-mono text-xs">
                                    {row[key] === null ? (
                                      <span className="text-content-subtle italic">null</span>
                                    ) : typeof row[key] === "object" ? (
                                      JSON.stringify(row[key])
                                    ) : (
                                      String(row[key])
                                    )}
                                  </div>
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="p-8 text-center text-content-subtle">
                              {t("dbExplorer.noData")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </ResponsiveTable>
                  </div>
                )}

                {!loading && result && !Array.isArray(result) && (
                  <div className="bg-surface-sunken border border-border-subtle text-content-body p-4 rounded-lg font-mono text-sm break-words">
                    {t("dbExplorer.queryOk")} <br />
                    {JSON.stringify(result, null, 2)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
