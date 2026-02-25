// Build-time env from Vite:
const envBase = import.meta.env.VITE_RUNNER_URL;

// Optional runtime override (usually unused; handy for emergency overrides)
const runtimeBase =
  typeof window !== "undefined" && window.__VYNN_API_BASE__;

// Dev fallback
const fallback = "https://api.vynnai.com";

// Normalize and export
export const API_BASE_URL = String(envBase || runtimeBase || fallback).replace(/\/+$/, "");
