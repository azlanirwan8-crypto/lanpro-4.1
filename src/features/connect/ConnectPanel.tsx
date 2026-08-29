import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
import { CheckCircle2, Wifi, Loader2, Database, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { fetchDbConfig, testDbConfig, saveDbConfig } from "./services/connect.service";

export const ConnectPanel = () => {
  const { t } = useTranslation();
  const [config, setConfig] = useState({
    host: "localhost",
    port: "3306",
    user: "app_user",
    password: "app_password",
    database: "app_database",
  });
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: "idle" | "success" | "error";
    message: string;
  }>({ status: "idle", message: "" });

  useEffect(() => {
    const fetchActiveConfig = async () => {
      try {
        const json = await fetchDbConfig();
        if (json.status === "success" && json.data) {
          setConfig({
            host: json.data.host || "localhost",
            port: String(json.data.port || "3306"),
            user: json.data.user || "app_user",
            password: json.data.password || "app_password",
            database: json.data.database || "app_database",
          });
        }
      } catch (err) {
        console.error("Failed to load active database config:", err);
      }
    };
    fetchActiveConfig();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTestResult({ status: "idle", message: "" });

    try {
      const data = await testDbConfig(config);

      if (data.status === "success") {
        setTestResult({ status: "success", message: "Koneksi Berhasil tersambung ke MySQL!" });
        toast.success(t("toast.dbCredsValid"));
      } else {
        throw new Error(data.message || "Koneksi gagal.");
      }
    } catch (err: any) {
      setTestResult({ status: "error", message: err.message });
      toast.error(t("toast.dbConnectFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConnection = async () => {
    setSaveLoading(true);
    setTestResult({ status: "idle", message: "" });

    try {
      const data = await saveDbConfig(config);

      if (data.status === "success") {
        setTestResult({
          status: "success",
          message: "Konfigurasi database berhasil disimpan & diubah secara Live!",
        });
        toast.success(t("toast.dbCredsSaved"));
      } else {
        throw new Error(data.message || "Gagal menyimpan konfigurasi.");
      }
    } catch (err: any) {
      setTestResult({ status: "error", message: err.message });
      toast.error(t("toast.configSaveFailed") + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-sunken/60 relative overflow-hidden">
      <div className="flex-1 overflow-auto p-4 md:p-5 relative z-10 w-full space-y-4">
        {/* Help Banner - Velzon Style */}
        <div className="bg-surface p-4 rounded-lg border border-emerald-500/30 shadow-2xs flex items-start gap-3">
          <div className="bg-emerald-500/15 text-emerald-700 p-2 rounded-md mt-0.5 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-normal text-content-strong uppercase tracking-wide">
              {t("connect.mysqlHelp")}
            </h3>
            <p className="text-content-secondary mt-1 text-xs leading-relaxed">
              {t("connect.theAppIsConnectedTo")}
            </p>
          </div>
        </div>

        {/* Config Form Card */}
        <div className="bg-surface shadow-2xs rounded-lg border border-border-subtle/80 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle/80 bg-surface-sunken/80 flex justify-between items-center">
            <h2 className="text-xs font-normal text-content-strong uppercase tracking-wide flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              {t("connect.mysqlConfig")}
            </h2>
          </div>

          <form onSubmit={handleTestConnection} className="p-4 md:p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-content-body">
                  {t("connect.databaseHostDb_host")}
                </label>
                <input
                  name="host"
                  value={config.host}
                  onChange={handleChange}
                  className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-xs text-content-body font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-content-body">
                  {t("connect.databasePortDb_port")}
                </label>
                <input
                  name="port"
                  value={config.port}
                  onChange={handleChange}
                  className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-xs text-content-body font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-content-body">
                {t("connect.databaseNameDb_name")}
              </label>
              <input
                name="database"
                value={config.database}
                onChange={handleChange}
                className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-xs text-content-body font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div className="bg-amber-500/10 rounded-md p-3 border border-amber-500/30 mt-2 flex gap-2.5 text-amber-800 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-900">
                    {t("connect.importantFixResolvingUnknownDatabase")}
                  </p>
                  <p className="leading-relaxed">
                    {t("connect.thisErrorHappensWhenThe")}{" "}
                    <strong className="font-medium underline text-amber-900 bg-amber-500/15 px-1 py-[3px] rounded">
                      defaultdb
                    </strong>
                    .
                  </p>
                  <p className="text-content-secondary">
                    {t("rakit.ensureYou")}{" "}
                    <span className="text-red-600 font-medium line-through">
                      {t("rakit.doNotType")}
                    </span>{" "}
                    {t("rakit.changeItBackTo")}{" "}
                    <strong className="font-medium text-emerald-700">defaultdb</strong>{" "}
                    {t("rakit.thenClick")} <strong>{t("connect.saveApply")}</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-content-body">
                  {t("connect.usernameDb_user")}
                </label>
                <input
                  name="user"
                  value={config.user}
                  onChange={handleChange}
                  className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-xs text-content-body font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-content-body">
                  {t("connect.passwordDb_password")}
                </label>
                <input
                  type="password"
                  name="password"
                  value={config.password}
                  onChange={handleChange}
                  className="w-full bg-surface border border-border-subtle rounded-md px-3 py-2 text-xs text-content-body font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {testResult.status !== "idle" && (
              <div
                className={`p-3 rounded-md text-xs font-medium border ${testResult.status === "success" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "bg-red-500/10 text-red-700 border-red-500/30"}`}
              >
                {testResult.message}
              </div>
            )}

            <div className="pt-3 border-t border-border-faint flex flex-wrap gap-3 justify-end">
              <button
                type="submit"
                disabled={loading || saveLoading}
                className="bg-surface-muted hover:bg-surface-strong text-content-body border border-border-subtle font-medium py-2 px-4 rounded-md transition-all flex items-center justify-center text-xs cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Wifi className="w-3.5 h-3.5 mr-1.5 text-content-muted" />
                    {t("connect.testConnection")}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSaveConnection}
                disabled={loading || saveLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-content-inverse font-medium py-2 px-5 rounded-md shadow-2xs active:scale-95 transition-all flex items-center justify-center text-xs cursor-pointer disabled:opacity-50"
              >
                {saveLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {t("connect.saveApply")}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
