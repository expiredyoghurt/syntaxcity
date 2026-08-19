// This middleware runs before all requests.
// We intentionally pass everything through — do NOT block requests here.
// The previous 403 "Forbidden" on all paths was likely caused by a
// middleware that was rejecting requests. Keep this simple.

export async function onRequest(context) {
  return context.next();
}
