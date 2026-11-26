/**
 * Validation limits shared by the tRPC router (source of truth) and the form (early feedback).
 * Kept in a dependency-free module so the client bundle never pulls in server code.
 */
export const TITLE_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 1000;

/** Number of tasks fetched per page by the list (SSR first page + infinite scroll). */
export const TASKS_PAGE_SIZE = 10;
