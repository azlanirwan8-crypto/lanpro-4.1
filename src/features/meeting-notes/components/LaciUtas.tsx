import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquare, Send, X } from "lucide-react";
import { UserAvatar } from "../../../components/ui/UserAvatar";
import { cn } from "../../../lib/utils";
import type { DiscussionPoint, DiscussionPointComment, UserProfile } from "../../../types";

/**
 * #703 — laci utas komentar, dikeluarkan dari `DiscussionPointsTable.tsx`.
 *
 * Yang ikut pindah hanya TAMPILANNYA. Kotak ketik kini menyimpan teksnya SENDIRI
 * (`teks` lokal), sebab di induk ia pernah menjadi state yang dibagikan ke seluruh
 * tabel — setiap ketikan di kotak balas meredupkan ulang semua baris.
 *
 * Perilaku lama dipertahankan apa adanya, termasuk `truncate` pada judul utas
 * (satu baris di kepala laci, keputusan #647 yang tidak diubah item ini) dan
 * penanda "milik saya" yang masih membandingkan NAMA bila id tidak cocok — itu
 * warisan yang tercatat, bukan yang baru.
 */
interface LaciUtasProps {
  titik: DiscussionPoint;
  komentar: DiscussionPointComment[];
  anggota: UserProfile[];
  pengguna: UserProfile | null;
  mengirim: boolean;
  onKirim: (teks: string) => void;
  onTutup: () => void;
}

export const LaciUtas: React.FC<LaciUtasProps> = ({
  titik,
  komentar,
  anggota,
  pengguna,
  mengirim,
  onKirim,
  onTutup,
}) => {
  const { t } = useTranslation();
  const [teks, setTeks] = useState("");

  const kirim = () => {
    const isi = teks.trim();
    if (!isi || mengirim) return;
    onKirim(isi);
    setTeks("");
  };

  return (
    <div className="fixed inset-0 bg-overlay/60 backdrop-blur-xs z-[9999] flex justify-end">
      <div className="absolute inset-0" onClick={onTutup} />
      <div className="relative bg-surface w-full max-w-lg h-full shadow-2xl border-l border-border-subtle flex flex-col text-left">
        <div className="p-5 border-b border-border-faint flex items-center justify-between bg-surface-sunken/80 shrink-0">
          <div className="flex items-center gap-3 pr-4 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-[10px] font-normal uppercase tracking-normal text-primary block">
                {t("discussion.threadDiscussions")}
              </span>
              <h3 className="text-sm font-medium text-content truncate">{titik.concern}</h3>
            </div>
          </div>
          <button
            onClick={onTutup}
            className="p-2 text-content-subtle hover:text-content-body hover:bg-surface-strong/60 rounded-xl transition-colors cursor-pointer shrink-0"
            title={t("discussion.closeThread")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 bg-surface-sunken/30">
          {komentar.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 text-primary">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="text-xs text-content-body">{t("discussion.noReplies")}</h4>
              <p className="text-xs sm:text-[11px] text-content-subtle mt-1 leading-normal">
                {t("discussion.noRepliesHint")}
              </p>
            </div>
          ) : (
            komentar.map((comment) => {
              const authorName =
                comment.userName ||
                comment.user_name ||
                (comment as any).authorName ||
                (comment as any).name ||
                "Member";
              const commentBody =
                comment.commentText || comment.comment_text || (comment as any).content || "";
              const commentDate = comment.createdAt || comment.created_at || new Date();
              const c = comment as any;
              const commentUserId = c.userId || c.user_id || c.authorId || c.author_id;
              const isMine =
                (commentUserId &&
                  pengguna &&
                  (commentUserId === pengguna.uid || commentUserId === pengguna.id)) ||
                (authorName &&
                  pengguna &&
                  (authorName === pengguna.displayName || authorName === pengguna.username));

              return (
                <div
                  key={comment.id || Math.random()}
                  className={cn("flex w-full mb-2", isMine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "flex flex-col max-w-[85%] md:max-w-xl",
                      isMine ? "items-end" : "items-start"
                    )}
                  >
                    {!isMine && (
                      <div className="flex items-center gap-1.5 mb-1 ml-1">
                        <UserAvatar
                          uid={commentUserId}
                          members={anggota}
                          name={authorName}
                          className="w-4 h-4"
                        />
                        <span className="text-xs sm:text-[10px] text-content-muted font-medium">
                          {authorName}
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        "px-3.5 py-2 rounded-2xl relative shadow-soft group",
                        isMine
                          ? "bg-primary-surface text-content-inverse rounded-br-sm"
                          : "bg-surface text-content-strong border border-border-subtle rounded-bl-sm"
                      )}
                    >
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words min-w-[50px] pb-3.5">
                        {commentBody}
                      </p>
                      <span
                        className={cn(
                          "absolute bottom-1 right-3 text-xs sm:text-[11px] sm:text-[9px] tracking-tight",
                          isMine ? "text-content-inverse/80" : "text-content-subtle"
                        )}
                      >
                        {new Date(commentDate).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-border-subtle bg-surface shrink-0">
          <div className="flex items-center gap-2 bg-surface-muted rounded-full px-4 py-2">
            <input
              type="text"
              placeholder={t("discussion.replyPlaceholder")}
              value={teks}
              onChange={(e) => setTeks(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") kirim();
              }}
              className="w-full bg-transparent border-0 focus:ring-0 outline-none text-xs font-normal text-content-strong placeholder:text-content-subtle py-1"
            />
            <button
              onClick={kirim}
              disabled={mengirim || !teks.trim()}
              className="p-2 text-primary hover:text-primary-hover disabled:opacity-40 cursor-pointer rounded-full transition-colors shrink-0"
              title={t("discussion.sendReply")}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
