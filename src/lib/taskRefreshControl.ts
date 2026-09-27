/**
 * Menahan refetch penuh lewat socket setelah mutasi lokal (#317).
 * Tanpa ini, create optimistik langsung ditimpa fetch berat dari AppContainer.
 */

let suppressTaskUntil = 0;
let suppressSprintUntil = 0;
let suppressUsersUntil = 0;
let suppressDiscussionPointsUntil = 0;

export function suppressTaskDataRefresh(durationMs = 5000) {
  suppressTaskUntil = Date.now() + durationMs;
}

export function shouldSuppressTaskDataRefresh(): boolean {
  return Date.now() < suppressTaskUntil;
}

export function suppressSprintDataRefresh(durationMs = 5000) {
  suppressSprintUntil = Date.now() + durationMs;
}

export function shouldSuppressSprintDataRefresh(): boolean {
  return Date.now() < suppressSprintUntil;
}

export function suppressUsersRefresh(durationMs = 5000) {
  suppressUsersUntil = Date.now() + durationMs;
}

export function shouldSuppressUsersRefresh(): boolean {
  return Date.now() < suppressUsersUntil;
}

export function suppressDiscussionPointsRefresh(durationMs = 5000) {
  suppressDiscussionPointsUntil = Date.now() + durationMs;
}

export function shouldSuppressDiscussionPointsRefresh(): boolean {
  return Date.now() < suppressDiscussionPointsUntil;
}
