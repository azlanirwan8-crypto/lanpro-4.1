import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { enUS, id as idLocale } from "date-fns/locale";
import { Task, Project } from "../../types";
import { ensureDate } from "../../lib/utils";
import i18n from "../../i18n";
import { toast } from "sonner";

export interface ExportTimelinePdfParams {
  timelineContainer: HTMLElement | null;
  selectedProject: Project | null;
  tasks: Task[];
  renderedRows: Array<{ task: Task; isChild?: boolean }>;
}

export async function exportTimelinePdf({
  timelineContainer,
  selectedProject,
  tasks,
  renderedRows,
}: ExportTimelinePdfParams): Promise<void> {
  const t = i18n.t.bind(i18n);
  const currentLang = i18n.language === "en" ? "en" : "id";
  const dateLocale = currentLang === "en" ? enUS : idLocale;
  const dateStrLocale = currentLang === "en" ? "en-US" : "id-ID";

  if (!timelineContainer) {
    toast.error(t("toast.ganttNotFound"));
    return;
  }

  const toastId = toast.loading(t("toast.generatingPdf"));

  try {
    // First, render the Gantt chart to canvas so we have it ready
    const canvas = await html2canvas(timelineContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/png");

    // Create PDF in Portrait by default
    const doc = new jsPDF("p", "mm", "a4");

    const colors = {
      primary: [15, 23, 42], // Slate-900 (Elegant Charcoal-slate)
      accent: [79, 70, 229], // Indigo-600
      secondary: [99, 102, 241], // Indigo-500
      done: [16, 185, 129], // Emerald-500
      progress: [59, 130, 246], // Blue-500
      todo: [100, 116, 139], // Slate-500
      priorityHigh: [239, 68, 68], // Rose-500
      neutralBg: [248, 250, 252], // Slate-50
      border: [226, 232, 240], // Slate-200
      text: [51, 65, 85], // Slate-700
      textHeading: [15, 23, 42], // Slate-900
      white: [255, 255, 255],
    };

    const drawHeaderBanner = (titleText: string, subtitleText: string) => {
      // Slate shadow or primary cover
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(0, 0, 210, 32, "F");

      // Accent color strip at bottom
      doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      doc.rect(0, 32, 210, 1.5, "F");

      // White elegant metadata text over banner
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(16);
      doc.text(titleText, 12, 16);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(200, 210, 230);
      doc.text(subtitleText, 12, 24);
    };

    // ==========================================
    // PAGE 1: PORTRAIT - EXECUTIVE DASHBOARD
    // ==========================================
    const projectNameDisplay = selectedProject?.name
      ? selectedProject.name.toUpperCase()
      : t("timelinePdf.allProjects");

    drawHeaderBanner(
      t("timelinePdf.page1Title"),
      t("timelinePdf.page1Subtitle", { projectName: projectNameDisplay })
    );

    // Report Header info
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(
      t("timelinePdf.createdAt", {
        date: new Date().toLocaleDateString(dateStrLocale, {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      }),
      12,
      43
    );
    doc.text(t("timelinePdf.projectCode", { code: selectedProject?.key || "N/A" }), 12, 48);

    const scheduledTasksCount = tasks.filter((t) => t.startDate && t.endDate).length;
    const coveragePercent =
      tasks.length > 0 ? Math.round((scheduledTasksCount / tasks.length) * 100) : 0;
    doc.text(
      t("timelinePdf.scheduleCoverage", {
        scheduled: scheduledTasksCount,
        total: tasks.length,
        percent: coveragePercent,
      }),
      120,
      43
    );

    // Divider
    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.setLineWidth(0.3);
    doc.line(10, 52, 200, 52);

    // 4 Tile Metrics Widgets
    const tileWidth = 43;
    const tileHeight = 24;
    const tileSpacing = 5;
    const startX = 11;
    const startY = 58;

    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === "Done").length;
    const progressTasks = tasks.filter((t) => t.status === "In Progress").length;
    const unscheduledTasks = tasks.filter((t) => !t.startDate || !t.endDate).length;

    const metrics = [
      {
        label: t("timelinePdf.metricTotalTasks"),
        value: `${totalTasks}`,
        desc: t("timelinePdf.metricTotalTasksDesc"),
        color: colors.primary,
      },
      {
        label: t("timelinePdf.metricDone"),
        value: `${doneTasks}`,
        desc: t("timelinePdf.metricDoneDesc"),
        color: colors.done,
      },
      {
        label: t("timelinePdf.metricInProgress"),
        value: `${progressTasks}`,
        desc: t("timelinePdf.metricInProgressDesc"),
        color: colors.progress,
      },
      {
        label: t("timelinePdf.metricUnscheduled"),
        value: `${unscheduledTasks}`,
        desc: t("timelinePdf.metricUnscheduledDesc"),
        color: colors.todo,
      },
    ];

    metrics.forEach((m, idx) => {
      const x = startX + idx * (tileWidth + tileSpacing);
      // Draw tile background
      doc.setFillColor(colors.neutralBg[0], colors.neutralBg[1], colors.neutralBg[2]);
      doc.roundedRect(x, startY, tileWidth, tileHeight, 2, 2, "F");
      // Border
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.roundedRect(x, startY, tileWidth, tileHeight, 2, 2, "S");

      // Draw top accent bar
      doc.setFillColor(m.color[0], m.color[1], m.color[2]);
      doc.rect(x + 1.5, startY + 1.5, tileWidth - 3, 1.5, "F");

      // Text labels inside tiles
      doc.setFontSize(7.5);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(120, 130, 140);
      doc.text(m.label, x + 4, startY + 7);

      doc.setFontSize(14);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(colors.textHeading[0], colors.textHeading[1], colors.textHeading[2]);
      doc.text(m.value, x + 4, startY + 15);

      doc.setFontSize(6.5);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(140, 150, 160);
      doc.text(m.desc, x + 4, startY + 20);
    });

    // Progress bar section
    const progressY = startY + tileHeight + 8;
    doc.setFontSize(9.5);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(colors.textHeading[0], colors.textHeading[1], colors.textHeading[2]);
    doc.text(t("timelinePdf.progressTitle"), 12, progressY);

    const completeRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    doc.setFontSize(9.5);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(colors.done[0], colors.done[1], colors.done[2]);
    doc.text(t("timelinePdf.progressComplete", { percent: completeRate }), 172, progressY);

    // Bar container
    doc.setFillColor(235, 240, 245);
    doc.roundedRect(12, progressY + 3, 186, 3.5, 1, 1, "F");
    // Completed bar
    if (completeRate > 0) {
      doc.setFillColor(colors.done[0], colors.done[1], colors.done[2]);
      doc.roundedRect(12, progressY + 3, (186 * completeRate) / 100, 3.5, 1, 1, "F");
    }

    // Executive Brief Narrative
    const narrativeY = progressY + 14;
    doc.setFontSize(9);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(colors.textHeading[0], colors.textHeading[1], colors.textHeading[2]);
    doc.text(t("timelinePdf.execSummaryTitle"), 12, narrativeY);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 110, 120);

    const notesLine1 = t("timelinePdf.execSummaryLine1", {
      projectName: selectedProject?.name || "N/A",
    });
    const notesLine2 = t("timelinePdf.execSummaryLine2", { total: totalTasks });
    const notesLine3 = t("timelinePdf.execSummaryLine3");

    doc.text(notesLine1, 12, narrativeY + 5);
    doc.text(notesLine2, 12, narrativeY + 9);
    doc.text(notesLine3, 12, narrativeY + 13);

    // Brief summary list of priorities on frontpage
    const summaryTableY = narrativeY + 22;
    doc.setFontSize(9);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(colors.textHeading[0], colors.textHeading[1], colors.textHeading[2]);
    doc.text(t("timelinePdf.epicOverviewTitle"), 12, summaryTableY);

    // Simple Table Headers
    doc.setFillColor(241, 245, 249);
    doc.rect(12, summaryTableY + 3, 186, 7.5, "F");
    doc.setDrawColor(218, 226, 233);
    doc.rect(12, summaryTableY + 3, 186, 7.5, "S");

    doc.setFontSize(7.5);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text(t("timelinePdf.colEpicKey"), 16, summaryTableY + 8);
    doc.text(t("timelinePdf.colTitle"), 38, summaryTableY + 8);
    doc.text(t("timelinePdf.colStatus"), 115, summaryTableY + 8);
    doc.text(t("timelinePdf.colTimelineFocus"), 145, summaryTableY + 8);

    // Render up to 8 Epics on the frontpage
    const epics = tasks.filter((t) => (t.type || "").toLowerCase() === "epic");
    const epicRowY = summaryTableY + 10.5;

    epics.slice(0, 8).forEach((epic, idx) => {
      const currentY = epicRowY + idx * 8.5;
      // Alternating background
      if (idx % 2 === 1) {
        doc.setFillColor(250, 252, 254);
        doc.rect(12, currentY, 186, 8.5, "F");
      }
      doc.setDrawColor(235, 241, 246);
      doc.line(12, currentY + 8.5, 198, currentY + 8.5);

      doc.setFontSize(8);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      doc.text(epic.key || "-", 16, currentY + 5.5);

      doc.setTextColor(colors.textHeading[0], colors.textHeading[1], colors.textHeading[2]);
      // Clip epic title if too long
      const epicTitle = epic.title.length > 42 ? epic.title.slice(0, 42) + "..." : epic.title;
      doc.text(epicTitle, 38, currentY + 5.5);

      // Status Badge text
      const stat = epic.status || "To Do";
      let displayStatus = stat;
      if (stat === "Done") {
        displayStatus = t("timelinePdf.statusDone");
        doc.setTextColor(colors.done[0], colors.done[1], colors.done[2]);
      } else if (stat === "In Progress") {
        displayStatus = t("timelinePdf.statusInProgress");
        doc.setTextColor(colors.progress[0], colors.progress[1], colors.progress[2]);
      } else {
        displayStatus = t("timelinePdf.statusBacklog");
        doc.setTextColor(colors.todo[0], colors.todo[1], colors.todo[2]);
      }

      doc.text(displayStatus.toUpperCase(), 115, currentY + 5.5);

      // Schedule dates text
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(110, 120, 130);
      const datesString =
        epic.startDate && epic.endDate
          ? `${format(ensureDate(epic.startDate), "dd MMM yyyy", { locale: dateLocale })} - ${format(ensureDate(epic.endDate), "dd MMM yyyy", { locale: dateLocale })}`
          : t("timelinePdf.tbdUnscheduled");
      doc.text(datesString, 145, currentY + 5.5);
    });

    if (epics.length === 0) {
      doc.setFontSize(8.5);
      doc.setFont("Helvetica", "italic");
      doc.setTextColor(140, 140, 140);
      doc.text(t("timelinePdf.noEpicsMapped"), 20, epicRowY + 10);
    }

    // Add Footer on Page 1
    doc.setFontSize(7.5);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(160, 170, 180);
    doc.text(t("timelinePdf.footerReport", { page: 1, total: 3 }), 12, 287);
    doc.text(t("timelinePdf.footerConfidential"), 105, 287, {
      align: "center",
    });

    // ==========================================
    // PAGE 2: LANDSCAPE - VISUAL GANTT CHART
    // ==========================================
    doc.addPage("a4", "l");

    // Draw landscape header strip
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, 297, 20, "F");

    doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
    doc.rect(0, 20, 297, 1.2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.text(t("timelinePdf.page2Title"), 12, 11.5);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(210, 220, 235);
    doc.text(t("timelinePdf.page2Subtitle"), 12, 16.5);

    // Add captured roadmap image onto Page 2
    // Canvas dimensions scaling to landscape page
    const landscapeWidth = 273; // 297 - 24 (margins)
    const landscapeHeight = 155; // 210 - 55 (header margins)

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const hScale = landscapeWidth / canvasWidth;
    const vScale = landscapeHeight / canvasHeight;
    const scale = Math.min(hScale, vScale);

    const drawWidth = canvasWidth * scale;
    const drawHeight = canvasHeight * scale;

    // Center Gantt chart on Page 2
    const drawX = 12 + (landscapeWidth - drawWidth) / 2;
    const drawY = 27 + (landscapeHeight - drawHeight) / 2;

    // Draw shadow border frame around chart container
    doc.setDrawColor(200, 210, 220);
    doc.setLineWidth(0.4);
    doc.rect(drawX - 1.5, drawY - 1.5, drawWidth + 3, drawHeight + 3, "S");

    // Draw the beautiful capture image
    doc.addImage(imgData, "PNG", drawX, drawY, drawWidth, drawHeight);

    // Legend or Instructions block
    const legendY = 190;
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(12, legendY, 273, 10, 1.5, 1.5, "F");
    // Border
    doc.setDrawColor(230, 235, 240);
    doc.roundedRect(12, legendY, 273, 10, 1.5, 1.5, "S");

    doc.setFontSize(7.5);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(80, 90, 100);
    doc.text(t("timelinePdf.legendTitle"), 16, legendY + 6.5);

    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(40, legendY + 5, 4, 2.5, "F");
    doc.setFont("Helvetica", "normal");
    doc.text(t("timelinePdf.legendBacklogFrame"), 46, legendY + 7);

    doc.setFillColor(colors.done[0], colors.done[1], colors.done[2]);
    doc.rect(73, legendY + 5, 4, 2.5, "F");
    doc.text(t("timelinePdf.legendDone"), 79, legendY + 7);

    doc.setFillColor(colors.progress[0], colors.progress[1], colors.progress[2]);
    doc.rect(106, legendY + 5, 4, 2.5, "F");
    doc.text(t("timelinePdf.legendInProgress"), 112, legendY + 7);

    doc.setFillColor(colors.todo[0], colors.todo[1], colors.todo[2]);
    doc.rect(160, legendY + 5, 4, 2.5, "F");
    doc.text(t("timelinePdf.legendUnscheduled"), 166, legendY + 7);

    doc.setFillColor(147, 51, 234); // Purple 600
    doc.rect(215, legendY + 5, 4, 2.5, "F");
    doc.text(t("timelinePdf.legendEpicBlock"), 221, legendY + 7);

    // Add Footer on Page 2
    doc.setTextColor(170, 180, 190);
    doc.setFontSize(7.5);
    doc.text(t("timelinePdf.footerReport", { page: 2, total: 3 }), 12, 204);
    doc.text(t("timelinePdf.footerConfidential"), 148, 204, {
      align: "center",
    });

    // ==========================================
    // PAGE 3: PORTRAIT - DETAILED TASK SCHEDULE
    // ==========================================
    doc.addPage("a4", "p");

    // Draw third page header strip
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, 210, 20, "F");

    doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
    doc.rect(0, 20, 210, 1.2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text(t("timelinePdf.page3Title"), 12, 11);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(200, 210, 230);
    doc.text(t("timelinePdf.page3Subtitle"), 12, 15.5);

    // Column Headers for Detailed tasks table
    let tableY = 28;
    doc.setFillColor(241, 245, 249);
    doc.rect(12, tableY, 186, 8, "F");
    doc.setDrawColor(218, 226, 233);
    doc.rect(12, tableY, 186, 8, "S");

    doc.setFontSize(7.5);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text(t("timelinePdf.colKey"), 15, tableY + 5.5);
    doc.text(t("timelinePdf.colTaskTitle"), 35, tableY + 5.5);
    doc.text(t("timelinePdf.colType"), 104, tableY + 5.5);
    doc.text(t("timelinePdf.colStatus"), 122, tableY + 5.5);
    doc.text(t("timelinePdf.colPriority"), 144, tableY + 5.5);
    doc.text(t("timelinePdf.colTimelineFocus"), 165, tableY + 5.5);

    // Loop over and draw ALL renderedRows
    let itemRowY = tableY + 8;
    let totalPagesInDoc = 3;

    renderedRows.forEach((row, idx) => {
      const task = row.task;

      // Dynamic multi-page breaking logic if lists exceed single page limits
      if (itemRowY > 268) {
        // Footers
        doc.setFontSize(7.5);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(170, 180, 190);
        doc.text(
          t("timelinePdf.footerReport", { page: totalPagesInDoc, total: totalPagesInDoc }),
          12,
          287
        );
        doc.text(t("timelinePdf.footerConfidential"), 105, 287, {
          align: "center",
        });

        doc.addPage("a4", "p");
        totalPagesInDoc += 1;

        // Header
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.rect(0, 0, 210, 15, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.text(t("timelinePdf.page3TitleContinued"), 12, 9.5);

        // Table header again
        tableY = 20;
        doc.setFillColor(241, 245, 249);
        doc.rect(12, tableY, 186, 8, "F");
        doc.setDrawColor(218, 226, 233);
        doc.rect(12, tableY, 186, 8, "S");

        doc.setFontSize(7.5);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text(t("timelinePdf.colKey"), 15, tableY + 5.5);
        doc.text(t("timelinePdf.colTaskTitle"), 35, tableY + 5.5);
        doc.text(t("timelinePdf.colType"), 104, tableY + 5.5);
        doc.text(t("timelinePdf.colStatus"), 122, tableY + 5.5);
        doc.text(t("timelinePdf.colPriority"), 144, tableY + 5.5);
        doc.text(t("timelinePdf.colTimelineFocus"), 165, tableY + 5.5);

        itemRowY = tableY + 8;
      }

      // Alternating background row stripes
      if (idx % 2 === 1) {
        doc.setFillColor(250, 252, 254);
        doc.rect(12, itemRowY, 186, 8.5, "F");
      }
      doc.setDrawColor(238, 242, 245);
      doc.line(12, itemRowY + 8.5, 198, itemRowY + 8.5);

      // Task Key
      doc.setFontSize(7.5);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      doc.text(task.key, 15, itemRowY + 5.5);

      // Task Title - indented slightly if row is a nested child
      doc.setTextColor(colors.textHeading[0], colors.textHeading[1], colors.textHeading[2]);
      const titleIndent = row.isChild ? 41 : 35;
      if (row.isChild) {
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(100, 110, 120);
        doc.text("└─", 35, itemRowY + 5.5);
      } else {
        doc.setFont("Helvetica", "bold");
      }

      // Shorten title to match printable width safely
      const allowedWidth = row.isChild ? 60 : 66;
      let shortTitle = task.title;
      if (shortTitle.length > allowedWidth) {
        shortTitle = shortTitle.slice(0, allowedWidth) + "...";
      }
      doc.text(shortTitle, titleIndent, itemRowY + 5.5);

      // Task Type
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(110, 120, 130);

      let typeLabel: string = task.type || "task";
      const typeLower = typeLabel.toLowerCase();
      if (typeLower === "epic") typeLabel = t("timelinePdf.typeEpic");
      else if (typeLower === "story") typeLabel = t("timelinePdf.typeStory");
      else if (typeLower === "bug") typeLabel = t("timelinePdf.typeBug");
      else if (typeLower === "task") typeLabel = t("timelinePdf.typeTask");
      else if (typeLower === "subtask") typeLabel = t("timelinePdf.typeSubtask");

      doc.text(typeLabel.toUpperCase(), 104, itemRowY + 5.5);

      // Task Status
      const stat = task.status || "To Do";
      let displayStatus = stat;
      if (stat === "Done") {
        displayStatus = t("timelinePdf.statusDoneShort");
        doc.setTextColor(colors.done[0], colors.done[1], colors.done[2]);
      } else if (stat === "In Progress") {
        displayStatus = t("timelinePdf.statusInProgressShort");
        doc.setTextColor(colors.progress[0], colors.progress[1], colors.progress[2]);
      } else {
        displayStatus = t("timelinePdf.statusTodoShort");
        doc.setTextColor(colors.todo[0], colors.todo[1], colors.todo[2]);
      }

      doc.setFont("Helvetica", "bold");
      doc.text(displayStatus.toUpperCase(), 122, itemRowY + 5.5);

      // Priority Badge
      const priorityText = task.priority || "Medium";
      let displayPriority = priorityText;
      if (priorityText === "Urgent") displayPriority = t("timelinePdf.priorityUrgent");
      else if (priorityText === "High") displayPriority = t("timelinePdf.priorityHigh");
      else if (priorityText === "Medium") displayPriority = t("timelinePdf.priorityMedium");
      else if (priorityText === "Low") displayPriority = t("timelinePdf.priorityLow");

      if (
        priorityText === "Urgent" ||
        priorityText === "P0" ||
        priorityText === "High" ||
        priorityText === "P1"
      ) {
        doc.setTextColor(colors.priorityHigh[0], colors.priorityHigh[1], colors.priorityHigh[2]);
      } else {
        doc.setTextColor(110, 120, 130);
      }
      doc.setFont("Helvetica", "normal");
      doc.text(displayPriority, 144, itemRowY + 5.5);

      // Scheduled range
      doc.setTextColor(110, 120, 130);
      const dateRangeText =
        task.startDate && task.endDate
          ? `${format(ensureDate(task.startDate), "dd MMM yy", { locale: dateLocale })} - ${format(ensureDate(task.endDate), "dd MMM yy", { locale: dateLocale })}`
          : t("timelinePdf.tbdUnscheduled");
      doc.text(dateRangeText, 165, itemRowY + 5.5);

      itemRowY += 8.5;
    });

    // Add Final Page Footer for the last iteration
    doc.setFontSize(7.5);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(170, 180, 190);
    doc.text(
      t("timelinePdf.footerReport", { page: totalPagesInDoc, total: totalPagesInDoc }),
      12,
      287
    );
    doc.text(t("timelinePdf.footerConfidential"), 105, 287, {
      align: "center",
    });

    // Save the generated document
    const filename = t("timelinePdf.filename", { key: selectedProject?.key || "Export" });
    doc.save(filename);
    toast.success(t("toast.pdfExported"), { id: toastId });
  } catch (err) {
    console.error(err);
    toast.error(t("toast.pdfExportFailed"), { id: toastId });
  }
}
