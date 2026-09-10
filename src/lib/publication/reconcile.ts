export type PublicationStatus =
  | "draft"
  | "awaiting_authorization"
  | "sending"
  | "verifying_deployment"
  | "published"
  | "failed"
  | "withdrawn";

export interface PublicationIdentity {
  publicId: string;
  revision: number;
  payloadHash: string;
}

export interface RepositoryPublication extends PublicationIdentity {
  commitSha: string;
}

export interface ReleasePublication extends PublicationIdentity {
  commitSha: string;
}

export interface PrivatePublicationRecord extends PublicationIdentity {
  status: PublicationStatus;
  commitSha?: string | null;
  publicUrl?: string | null;
}

export type ReconciliationDecision =
  | { action: "commit"; reason: "missing_from_repository" }
  | { action: "wait_for_deployment"; commitSha: string; reason: "release_missing" | "older_release" }
  | { action: "mark_published"; commitSha: string; repairPrivateRecord: boolean }
  | { action: "repair_private_record"; commitSha: string }
  | { action: "none"; commitSha: string; reason: "already_published" }
  | { action: "conflict"; reason: string };

export class PublicationConflictError extends Error {
  readonly code = "CONFLICT";
}

function equalIdentity(left: PublicationIdentity, right: PublicationIdentity): boolean {
  return left.publicId === right.publicId
    && left.revision === right.revision
    && left.payloadHash === right.payloadHash;
}

export function assertPublicationAuthorization(
  intended: PublicationIdentity,
  authorization: { publicId: string; payloadHash: string }
): void {
  if (intended.publicId !== authorization.publicId || intended.payloadHash !== authorization.payloadHash) {
    throw new PublicationConflictError("公開指示後に公開稿が変更されています");
  }
}

/**
 * Pure retry/recovery decision. Callers perform GitHub, deployment, and Notion
 * operations separately, then call this function again with newly observed state.
 */
export function reconcilePublication(input: {
  intended: PublicationIdentity;
  repository: RepositoryPublication | null;
  release: ReleasePublication | null;
  privateRecord: PrivatePublicationRecord | null;
}): ReconciliationDecision {
  const { intended, repository, release, privateRecord } = input;

  if (!repository) return { action: "commit", reason: "missing_from_repository" };
  if (repository.publicId !== intended.publicId) {
    return { action: "conflict", reason: "取得したリポジトリ項目のPublicIDが一致しません" };
  }
  if (!equalIdentity(repository, intended)) {
    return { action: "conflict", reason: "同じPublicIDに異なる版またはハッシュがあります" };
  }

  if (!release) {
    return { action: "wait_for_deployment", commitSha: repository.commitSha, reason: "release_missing" };
  }
  if (release.publicId !== intended.publicId) {
    return { action: "wait_for_deployment", commitSha: repository.commitSha, reason: "older_release" };
  }
  if (!equalIdentity(release, intended)) {
    return { action: "conflict", reason: "配信中の同じPublicIDに異なる版またはハッシュがあります" };
  }
  if (release.commitSha !== repository.commitSha) {
    return { action: "wait_for_deployment", commitSha: repository.commitSha, reason: "older_release" };
  }

  const privateRecordMatches = privateRecord !== null
    && equalIdentity(privateRecord, intended)
    && privateRecord.commitSha === repository.commitSha;
  if (!privateRecordMatches) {
    return { action: "repair_private_record", commitSha: repository.commitSha };
  }
  if (privateRecord.status === "published") {
    return { action: "none", commitSha: repository.commitSha, reason: "already_published" };
  }
  return { action: "mark_published", commitSha: repository.commitSha, repairPrivateRecord: false };
}

const allowedTransitions: Record<PublicationStatus, readonly PublicationStatus[]> = {
  draft: ["awaiting_authorization", "failed"],
  awaiting_authorization: ["sending", "failed"],
  sending: ["verifying_deployment", "failed"],
  verifying_deployment: ["published", "failed"],
  published: ["awaiting_authorization", "withdrawn", "failed"],
  failed: ["awaiting_authorization", "sending", "verifying_deployment", "withdrawn"],
  withdrawn: ["awaiting_authorization"]
};

export function assertStatusTransition(from: PublicationStatus, to: PublicationStatus): void {
  if (from === to) return;
  if (!allowedTransitions[from].includes(to)) {
    throw new PublicationConflictError(`不正な公開状態の遷移です: ${from} -> ${to}`);
  }
}

