import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  Globe2,
  MonitorDown,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import {
  ContentSection,
  JsonLdScript,
  PageShell,
} from "@/components/marketing/page-shell";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createPublicPageMetadata,
  publicPages,
  softwareJsonLd,
  webPageJsonLd,
} from "@/lib/seo";
import {
  getInstallerDownloads,
  type InstallerDownload,
  type InstallerPlatform,
} from "@/lib/app-downloads";

export const metadata: Metadata = createPublicPageMetadata("download");

const platformIcons = {
  android: Smartphone,
  web: Globe2,
  windows: MonitorDown,
} satisfies Record<InstallerPlatform, typeof Smartphone>;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [softwareJsonLd(), webPageJsonLd("download")],
};

function detectPlatform(userAgent: string): InstallerPlatform {
  const value = userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(value)) {
    return "web";
  }

  if (value.includes("android")) {
    return "android";
  }

  if (value.includes("windows")) {
    return "windows";
  }

  return "web";
}

function orderedDownloads(
  downloads: InstallerDownload[],
  preferredPlatform: InstallerPlatform,
) {
  return [...downloads].sort((left, right) => {
    if (left.platform === preferredPlatform) {
      return -1;
    }

    if (right.platform === preferredPlatform) {
      return 1;
    }

    if (left.platform === "web") {
      return -1;
    }

    if (right.platform === "web") {
      return 1;
    }

    return 0;
  });
}

function InstallerCard({
  download,
  recommended,
}: {
  download: InstallerDownload;
  recommended: boolean;
}) {
  const Icon = platformIcons[download.platform];
  const available = download.status === "available";

  return (
    <article className="flex h-full flex-col rounded-lg border border-white/10 bg-white/60 p-5 shadow-[0_20px_60px_rgba(7,26,61,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="flex min-h-12 min-w-12 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="flex flex-wrap gap-2">
          {recommended ? <Badge>Recommended</Badge> : null}
          <Badge variant={available ? "secondary" : "outline"}>
            {available ? "Available" : "Not published"}
          </Badge>
        </div>
      </div>

      <h2 className="mt-5 font-heading text-xl font-bold tracking-tight">
        {download.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {download.targetDevices}
      </p>

      <dl className="mt-5 grid gap-3 text-sm">
        {[
          ["Version", download.version],
          ["Build", download.buildNumber],
          ["File", download.fileName],
          ["Size", download.fileSize],
          ["Released", download.releaseDate],
          ["Minimum", download.minimumVersion],
        ].map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 rounded-md border border-white/10 bg-background/70 px-3 py-2"
          >
            <dt className="font-semibold text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 rounded-md border border-emerald-500/20 bg-emerald-500/8 p-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <ShieldCheck className="size-4" />
          SHA-256 checksum
        </p>
        <p className="mt-2 break-all font-mono text-xs leading-5 text-muted-foreground">
          {download.checksum}
        </p>
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-sm font-semibold">Install notes</p>
        <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
          {download.installNotes.map((note) => (
            <li key={note} className="flex gap-2">
              <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row">
        {available ? (
          <Button asChild className="min-h-12 w-full sm:w-auto">
            <Link href={download.downloadUrl}>
              {download.platform === "web" ? "Open POSard" : "Download"}
              {download.platform === "web" ? (
                <ExternalLink className="size-4" />
              ) : (
                <Download className="size-4" />
              )}
            </Link>
          </Button>
        ) : (
          <Button disabled className="min-h-12 w-full sm:w-auto">
            Not published yet
          </Button>
        )}
        {download.platform === "web" ? (
          <PwaInstallButton
            label="Install from browser"
            variant="outline"
            className="w-full sm:w-auto"
          />
        ) : null}
      </div>
    </article>
  );
}

export default async function DownloadPage() {
  const headersList = await headers();
  const preferredPlatform = detectPlatform(headersList.get("user-agent") ?? "");
  const downloads = orderedDownloads(getInstallerDownloads(), preferredPlatform);

  return (
    <PageShell
      eyebrow="POSard downloads"
      title="Download POSard for the right device"
      description="Choose Android APK for Android devices, use the browser install path for iPhone, iPad, and web users, and use a Windows installer only when a signed Windows package is published."
    >
      <JsonLdScript data={jsonLd} />

      <div className="mb-8 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-950">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <p>
            Android phones and tablets install APK/AAB-based Android apps. A
            Windows EXE or MSIX is only for Windows devices and is not a mobile
            app installer.
          </p>
        </div>
      </div>

      <section className="grid gap-5 lg:grid-cols-3">
        {downloads.map((download) => (
          <InstallerCard
            key={download.platform}
            download={download}
            recommended={download.platform === preferredPlatform}
          />
        ))}
      </section>

      <ContentSection
        title="Latest release notes"
        description="Release metadata is read from the configured installer artifact settings, so the website can update download details without storing APK, AAB, EXE, or MSIX binaries in git."
      >
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {downloads.map((download) => (
            <article
              key={download.platform}
              className="rounded-lg border border-white/10 bg-white/50 p-5"
            >
              <h3 className="font-heading text-lg font-bold">
                {download.title}
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                {download.releaseNotes.map((note) => (
                  <li key={note} className="flex gap-2">
                    <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </ContentSection>

      <ContentSection title="Need help choosing?">
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          Use Android APK for trusted Android checkout devices. Use the web app
          when an installer is not available or when the device is used for
          admin setup, imports, backups, and reports. For setup help, open the{" "}
          <Link
            href={publicPages.contact.path}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            contact page
          </Link>
          .
        </p>
      </ContentSection>
    </PageShell>
  );
}
