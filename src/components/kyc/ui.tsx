"use client";
import React from "react";

// ─── Filled Icon Style ────────────────────────────────────────────────────────
export const FILLED: React.CSSProperties = { fontVariationSettings: "'FILL' 1" };

// ─── ErrorMessage ─────────────────────────────────────────────────────────────
export function ErrorMessage({ message, center }: { message: string; center?: boolean }) {
  if (!message) return null;
  return (
    <p className={`text-xs text-error mt-1.5 ${center ? "text-center" : ""}`}>
      {message}
    </p>
  );
}

// ─── SubmitButton ─────────────────────────────────────────────────────────────
export function SubmitButton({
  loading,
  onClick,
  disabled,
  icon = "arrow_forward",
  children,
}: {
  loading: boolean;
  onClick?: () => void;
  disabled?: boolean;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <button className="btn-primary" onClick={onClick} disabled={disabled || loading}>
      {loading ? (
        <span className="material-symbols-outlined animate-spin text-[20px]">
          progress_activity
        </span>
      ) : (
        <>
          {children}
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </>
      )}
    </button>
  );
}

// ─── StepHeader ───────────────────────────────────────────────────────────────
export function StepHeader({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack?: () => void;
}) {
  return (
    <div>
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-secondary text-sm mb-3 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back
        </button>
      )}
      <h2 className="text-lg font-bold text-on-background">{title}</h2>
      <p className="text-sm text-secondary mt-1">{description}</p>
    </div>
  );
}

// ─── OtpInputGrid ─────────────────────────────────────────────────────────────
export function OtpInputGrid({
  digits,
  onChange,
  onKeyDown,
}: {
  digits: string[];
  onChange: (val: string, idx: number) => void;
  onKeyDown: (e: React.KeyboardEvent, idx: number) => void;
}) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  return (
    <div className="flex justify-center gap-3">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className="otp-box"
          type="tel"
          maxLength={1}
          value={d}
          onChange={(e) => onChange(e.target.value, i)}
          onKeyDown={(e) => onKeyDown(e, i)}
        />
      ))}
    </div>
  );
}

// ─── GovBadge ─────────────────────────────────────────────────────────────────
export function GovBadge({ label = "GOVT. TRUSTED" }: { label?: string }) {
  return (
    <div className="gov-badge">
      <div className="w-1.5 h-full tricolor-strip flex-shrink-0" />
      <span className="px-3 text-label-caps text-on-secondary-fixed-variant">{label}</span>
    </div>
  );
}

// ─── InfoBanner ───────────────────────────────────────────────────────────────
export function InfoBanner({
  color = "neutral",
  icon,
  children,
}: {
  color?: "green" | "red" | "blue" | "neutral";
  icon: string;
  children: React.ReactNode;
}) {
  const colors = {
    green: "bg-green-50 border-green-100 text-green-700",
    red: "bg-red-50 border-red-100 text-red-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    neutral: "bg-surface-container-lowest border-outline-variant/20 text-on-surface-variant",
  };
  const iconColors = {
    green: "text-green-600",
    red: "text-red-600",
    blue: "text-blue-600",
    neutral: "text-primary",
  };

  return (
    <div className={`flex items-center gap-2 p-3 rounded-xl border ${colors[color]}`}>
      <span className={`material-symbols-outlined text-[20px] ${iconColors[color]}`} style={FILLED}>
        {icon}
      </span>
      {children}
    </div>
  );
}

// ─── WarningBanner ────────────────────────────────────────────────────────────
export function WarningBanner({
  title,
  message,
  icon = "warning",
}: {
  title: string;
  message: string;
  icon?: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
      <span className="material-symbols-outlined text-red-600 text-[20px]" style={FILLED}>
        {icon}
      </span>
      <div>
        <p className="text-sm font-bold text-red-700">{title}</p>
        <p className="text-xs text-red-600 mt-1">{message}</p>
      </div>
    </div>
  );
}

// ─── UploadZone ───────────────────────────────────────────────────────────────
export function UploadZone({
  accept,
  onFile,
  label = "Click to upload or drag & drop",
  sublabel = "JPG, PNG, PDF — Max 5MB",
  uploading,
  uploadedName,
}: {
  accept?: string;
  onFile: (file: File) => void;
  label?: string;
  sublabel?: string;
  uploading?: boolean;
  uploadedName?: string;
}) {
  return (
    <label className="upload-zone cursor-pointer block">
      <input
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined animate-spin text-primary text-[36px]">
            progress_activity
          </span>
          <p className="text-sm font-semibold text-on-surface">Uploading...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[36px]">upload_file</span>
          <p className="text-sm font-semibold text-on-surface">{uploadedName || label}</p>
          <p className="text-xs text-on-surface-variant">{sublabel}</p>
        </div>
      )}
      {uploadedName && !uploading && (
        <p className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1 justify-center">
          <span className="material-symbols-outlined text-[16px]" style={FILLED}>check_circle</span>
          {uploadedName}
        </p>
      )}
    </label>
  );
}
