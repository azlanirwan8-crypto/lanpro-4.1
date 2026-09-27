import { useTranslation } from "react-i18next";
import React from "react";
import { PageHeader } from "../../../components/ui/PageHeader";

/**
 * #426 — Lock indicator dipindah ke QATestCaseTable.
 * QATopBar kini hanya menampilkan PageHeader (judul + breadcrumb).
 */
export const QATopBar: React.FC = () => {
  const { t } = useTranslation();

  return (
    <PageHeader
      breadcrumbs={[{ label: t("nav.qa", "QA") }, { label: t("qaTop.title"), current: true }]}
      title={t("qaTop.title")}
    />
  );
};
