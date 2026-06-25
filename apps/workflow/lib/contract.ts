// Stable local import path for the shared contract. App code imports "@workspace/contract"
// directly; tests (and any code preferring the short path) import "@/lib/contract" / "./contract".
export * from "@workspace/contract";
