/**
 * What a fetch of a file answers with, as far as the page looks at it: whether
 * it was had, and its bytes. A real `Response` cannot be made from jsdom's
 * `Blob`, so tests hand back this much of one.
 */
export function answer(had = true): Response {
  return { ok: had, status: had ? 200 : 404, blob: async () => new Blob(["GIF89a"]) } as unknown as Response;
}
