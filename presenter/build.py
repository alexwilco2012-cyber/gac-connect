#!/usr/bin/env python3
"""GAC Connect presenter build.

Assembles the modular source tree into three outputs:

  ../public/presenter.html      the SITE output (what the platform repo deploys):
  ../public/presenter/{vendor,fonts}/
                                a small HTML shell plus separate, cacheable files
                                for the runtime, React and the fonts. Vite copies
                                public/ into dist/ unchanged, so the published URL
                                stays exactly
                                https://alexwilco2012-cyber.github.io/gac-connect/presenter.html
                                (the QR baked into printed materials points there).
                                Override the folder with --site DIR.
  dist/presenter.html           single-file self-extracting bundle -- the offline /
                                "download the deck" copy. Not deployed to the site.
  dev.html                      instant local preview served from THIS folder
                                (python -m http.server, open /dev.html)

Usage:
  python build.py               build all outputs + run self-checks
  python build.py --site DIR    write the site output into DIR instead of ../public
  python build.py --no-site     skip the site output (bundle + dev only)
  python build.py --verify      also diff the bundle against reference/presenter.reference.html
                                (the last promoted build) and report exactly what changed
  python build.py --promote     copy dist/presenter.html over the reference -- do this
                                right after a build has been browser-checked and deployed
  python build.py --watch       rebuild whenever a source file changes

Edit sources, rebuild, never patch outputs. The sources are version-controlled
in the platform repo (git is the record of what changed); --verify/--promote
are optional local aids for the single-file bundle.
"""
import argparse
import base64
import gzip
import hashlib
import html as htmllib
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
# Site output: the platform repo's public/ folder (Vite copies it verbatim into
# the deployed dist/), so presenter.html sits at the site root and its files
# under presenter/. Both paths are RELATIVE in the shell, so the same output
# works at the live root and under any branch-preview base path.
SITE_DEFAULT = ROOT.parent / "public"
SITE_ASSET_DIR = "presenter"
SITE_PATHS = {  # source-tree prefix -> URL prefix relative to presenter.html
    "vendor/": SITE_ASSET_DIR + "/vendor/",
    "assets/fonts/": SITE_ASSET_DIR + "/fonts/",
}
# Fetched before the runtime asks for them: React (loaded by dc-runtime via
# window.__resources) and the two faces used above the fold. Fonts must carry
# `crossorigin` on the preload or the browser fetches them twice. The React
# preloads must carry the SAME integrity + crossorigin the runtime puts on its
# script tags, or the browser refuses to reuse them ("integrity mismatch").
SITE_PRELOAD_SCRIPTS = ["vendor/react.production.min.js", "vendor/react-dom.production.min.js"]
SITE_PRELOAD_FONTS = ["assets/fonts/space-grotesk-latin.woff2", "assets/fonts/inter-variable.woff2"]
# dc-runtime.js pins React with these constants (grep'd at build time so a
# vendor file that no longer matches -- e.g. a CRLF checkout -- fails the
# build here, with a clear message, instead of failing silently in the browser).
RUNTIME_SRI = {"vendor/react.production.min.js": "REACT_SRI",
               "vendor/react-dom.production.min.js": "REACT_DOM_SRI"}
# Last promoted (browser-checked + deployed) build. --verify diffs against it,
# --promote refreshes it. reference/presenter_6.original.html is the v12
# monolith kept for history and is no longer a verify target.
REFERENCE = ROOT / "reference" / "presenter.reference.html"

# Stable asset identity: path in the source tree <-> uuid in the bundle.
# uuids are carried over from the original bundle so rebuilt output stays
# diffable against it. New assets: mint any uuid4 and add a row.
ASSETS = [
    {"path": "vendor/dc-runtime.js", "uuid": "4e63bef7-eaf1-43bb-818b-3fb048141fcf",
     "mime": "application/javascript", "gzip": True},
    {"path": "vendor/react.production.min.js", "uuid": "8ed75e02-b9c5-4119-92d9-9928f31d0e94",
     "mime": "text/javascript", "gzip": True, "ext_id": "reactUmd"},
    {"path": "vendor/react-dom.production.min.js", "uuid": "7c3d5949-c029-4683-b993-a5b626d48e67",
     "mime": "text/javascript", "gzip": True, "ext_id": "reactDomUmd"},
    {"path": "assets/fonts/space-grotesk-vietnamese.woff2", "uuid": "8256e3a6-9d29-4f5d-b0e5-b4af3ebb213a",
     "mime": "font/woff2", "gzip": False},
    {"path": "assets/fonts/space-grotesk-latin-ext.woff2", "uuid": "73623fe9-7311-48c0-af1f-ce9069f5f012",
     "mime": "font/woff2", "gzip": False},
    {"path": "assets/fonts/space-grotesk-latin.woff2", "uuid": "a6df75bd-c2d3-4a8b-8d1d-a31674b7524c",
     "mime": "font/woff2", "gzip": False},
    # Inter variable, body face of the Advantage opening (added 2026-08-15)
    {"path": "assets/fonts/inter-variable.woff2", "uuid": "61abad79-ea20-4061-af65-27ebefbb1209",
     "mime": "font/woff2", "gzip": False},
]

INCLUDE_RE = re.compile(r"@@INCLUDE:([^@]+)@@")
NODE_CANDIDATES = [
    Path(r"C:\Users\wilco\.claude\projects\GAC Connect\.claude\tools\node-v22.16.0-win-x64\node.exe"),
    Path("node"),  # PATH fallback
]


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def write(p: Path, text: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def resolve_includes(text: str, base: Path) -> str:
    """Replace every @@INCLUDE:relpath@@ token with the file's content (recursive).

    One trailing newline is stripped from each included file, so a token that
    sits on its own line behaves as "insert the file's lines here" without
    introducing an extra blank line."""
    def sub(m):
        inc = base / m.group(1).strip()
        content = resolve_includes(read(inc), base)
        return content[:-1] if content.endswith("\n") else content
    return INCLUDE_RE.sub(sub, text)


def props_attr() -> str:
    props = json.loads(read(SRC / "app" / "props.json"))
    return htmllib.escape(json.dumps(props, separators=(", ", ": ")), quote=True)


def xdc_script_of(template: str) -> tuple[int, int, str]:
    """Locate the text/x-dc script block; return (content_start, content_end, content).

    Greedy match: the x-dc script is the document's last script element, so the
    closing tag is the LAST </script>. A non-greedy match would silently stop at
    an embedded '</script>' inside the JS and truncate what the guards inspect."""
    m = re.search(r'(<script type="text/x-dc"[^>]*>)(.*)(</script>)', template, re.S)
    if not m:
        raise SystemExit("build: text/x-dc script block not found in assembled template")
    return m.start(2), m.end(2), m.group(2)


def check_script_sources() -> None:
    """Refuse HTML-dangerous sequences in the raw x-dc source files.

    Checked on the raw files (not the assembled extraction) so an embedded
    '</script>' cannot truncate what this guard sees. The HTML tokenizer ends a
    script element at '</script' in any case, whatever the type attribute."""
    for rel in ("app/data.js", "app/component.js"):
        content = read(SRC / rel).lower()
        for bad in ("</script", "<!--"):
            if bad in content:
                line = content[:content.index(bad)].count("\n") + 1
                raise SystemExit(f"build: forbidden sequence {bad!r} in src/{rel} line {line} -- "
                                 "keep '<' out of string literals (write \\u003c)")


def site_path(src_path: str) -> str:
    """Map a source-tree asset path to its URL relative to the site's presenter.html."""
    for prefix, url in SITE_PATHS.items():
        if src_path.startswith(prefix):
            return url + src_path[len(prefix):]
    raise SystemExit(f"build: no site mapping for asset {src_path!r} (add it to SITE_PATHS)")


def sri(src_path: str) -> str:
    """sha384 integrity of a vendor file, checked against the constant dc-runtime uses."""
    digest = base64.b64encode(hashlib.sha384((ROOT / src_path).read_bytes()).digest()).decode("ascii")
    value = "sha384-" + digest
    const = RUNTIME_SRI.get(src_path)
    if const:
        m = re.search(r'%s = "([^"]+)"' % const, read(ROOT / "vendor" / "dc-runtime.js"))
        if not m:
            raise SystemExit(f"build: {const} not found in vendor/dc-runtime.js")
        if m.group(1) != value:
            raise SystemExit(f"build: {src_path} does not match {const} in dc-runtime.js "
                             f"({value} vs {m.group(1)}) -- the file's bytes changed (line endings?); "
                             "React would fail its integrity check in the browser")
    return value


def resources_script(react: str, react_dom: str) -> str:
    """The window.__resources hook dc-runtime reads to find React (instead of unpkg)."""
    return ('<script>window.__resources = { reactUmd: "%s", reactDomUmd: "%s" };</script>'
            % (react, react_dom))


def compose_template(mode: str) -> str:
    """Assemble the inner document.

    mode: 'dist' -- uuid asset refs, wrapped later into the single-file bundle
          'dev'  -- real paths relative to this folder + local React
          'site' -- paths under presenter/ next to the shell, preload hints, favicon
    """
    # Safety: the x-dc script rides inside an HTML script element (dev/site) and
    # a JSON string (dist) -- refuse sequences that could terminate either early.
    check_script_sources()
    doc = resolve_includes(read(SRC / "index.html"), SRC)
    doc = doc.replace("@@PROPS@@", props_attr())
    if doc.count("@@HEAD@@") != 1:
        raise SystemExit("build: src/index.html must contain exactly one @@HEAD@@ slot")

    if mode == "dist":
        for a in ASSETS:
            doc = doc.replace(a["path"], a["uuid"])
        doc = doc.replace("@@HEAD@@\n", "").replace("@@HEAD@@", "")
    elif mode == "dev":
        doc = doc.replace("@@HEAD@@", resources_script(
            "vendor/react.production.min.js", "vendor/react-dom.production.min.js"))
    elif mode == "site":
        # Every asset reference (runtime script tag, @font-face urls) -> site URL.
        # Done BEFORE the head is inserted: the head already carries site URLs,
        # and a source path is a substring of its site URL.
        for a in ASSETS:
            doc = doc.replace(a["path"], site_path(a["path"]))
        head = ['<link rel="icon" type="image/svg+xml" href="favicon.svg">']
        for p in SITE_PRELOAD_SCRIPTS:
            head.append('<link rel="preload" as="script" href="%s" integrity="%s" crossorigin="anonymous">'
                        % (site_path(p), sri(p)))
        for p in SITE_PRELOAD_FONTS:
            head.append('<link rel="preload" as="font" type="font/woff2" href="%s" crossorigin>' % site_path(p))
        head.append(resources_script(site_path("vendor/react.production.min.js"),
                                     site_path("vendor/react-dom.production.min.js")))
        doc = doc.replace("@@HEAD@@", "\n".join(head))
    else:
        raise ValueError(mode)
    return doc


def json_for_script(value) -> str:
    """JSON that is safe inside a <script> element: ASCII-only, and <, >, & escaped."""
    s = json.dumps(value, ensure_ascii=True, separators=(",", ":"))
    return s.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def build_manifest() -> dict:
    manifest = {}
    for a in ASSETS:
        raw = (ROOT / a["path"]).read_bytes()
        if a["gzip"]:
            payload = gzip.compress(raw, mtime=0)  # mtime=0 -> deterministic output
        else:
            payload = raw
        manifest[a["uuid"]] = {"mime": a["mime"], "compressed": a["gzip"],
                               "data": base64.b64encode(payload).decode("ascii")}
    return manifest


def build_dist() -> str:
    template = compose_template("dist")
    manifest = build_manifest()
    ext_resources = [{"id": a["ext_id"], "uuid": a["uuid"]} for a in ASSETS if a.get("ext_id")]

    wrapper = read(ROOT / "wrapper" / "loader.html")
    for token in ("@@MANIFEST@@", "@@EXT_RESOURCES@@", "@@PAGE_ORDER@@", "@@TEMPLATE@@"):
        if wrapper.count(token) != 1:
            raise SystemExit(f"build: wrapper/loader.html must contain exactly one {token}")
    out = (wrapper
           .replace("@@MANIFEST@@", json_for_script(manifest))
           .replace("@@EXT_RESOURCES@@", json_for_script(ext_resources))
           .replace("@@PAGE_ORDER@@", json_for_script([]))
           .replace("@@TEMPLATE@@", json_for_script(template)))

    # Decode-test both JSON layers, the way BUILD_NOTES prescribes.
    for kind, expected in (("manifest", manifest), ("ext_resources", ext_resources),
                           ("page_order", []), ("template", template)):
        m = re.search(r'<script type="__bundler/%s">\s*(.*?)\s*</script>' % kind, out, re.S)
        if not m or json.loads(m.group(1)) != expected:
            raise SystemExit(f"build: round-trip decode of the {kind} payload failed")

    write(DIST / "presenter.html", out)
    return out


def build_dev() -> str:
    doc = compose_template("dev")
    write(ROOT / "dev.html", doc)
    return doc


def build_site(out_dir: Path) -> str:
    """Write the modular site output: out_dir/presenter.html + out_dir/presenter/{vendor,fonts}/.

    The presenter/ asset folder is recreated from scratch so a renamed or
    removed asset never lingers on the site."""
    doc = compose_template("site")
    asset_root = out_dir / SITE_ASSET_DIR
    if asset_root.exists():
        shutil.rmtree(asset_root)
    for a in ASSETS:
        dest = out_dir / site_path(a["path"])
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / a["path"], dest)
    write(out_dir / "presenter.html", doc)
    # The shell must never reference a source-tree path or a bundle uuid.
    for a in ASSETS:
        if a["uuid"] in doc:
            raise SystemExit(f"build: site shell still references bundle uuid {a['uuid']}")
    for prefix in SITE_PATHS:
        if ('"%s' % prefix) in doc or ("'%s" % prefix) in doc or ("(%s" % prefix) in doc:
            raise SystemExit(f"build: site shell still references source path {prefix!r}")
    return doc


def node_check() -> None:
    """Syntax-check the composed x-dc script with Node when available (never fatal to skip)."""
    _, _, script = xdc_script_of(compose_template("dev"))
    node = next((c for c in NODE_CANDIDATES if c.name == "node" or c.exists()), None)
    probe = ROOT / "dist" / ".xdc-syntax-probe.js"
    # Same wrapping the dc-runtime applies: new Function("DCLogic", ..., src)
    write(probe, "(function(DCLogic, React){\n" + script + "\n});\n")
    try:
        r = subprocess.run([str(node), "--check", str(probe)],
                           capture_output=True, text=True, timeout=30)
        if r.returncode != 0:
            raise SystemExit("build: x-dc script failed node --check:\n" + r.stderr)
        print("  node --check: x-dc script syntax OK")
    except (OSError, subprocess.TimeoutExpired):
        print("  node --check: node not available, skipped (non-fatal)")
    finally:
        try:
            probe.unlink()
        except OSError:
            pass


# ---------------------------------------------------------------- verification

def _payloads(text: str) -> dict:
    out = {}
    for kind in ("manifest", "ext_resources", "page_order", "template"):
        m = re.search(r'(<script type="__bundler/%s">\s*)(.*?)(\s*</script>)' % kind, text, re.S)
        out[kind] = m.group(2) if m else None
    return out


def _mask_payloads(text: str) -> str:
    return re.sub(r'(<script type="__bundler/(?:manifest|ext_resources|page_order|template)">\s*)(.*?)(\s*</script>)',
                  lambda m: m.group(1) + "@@" + m.group(3), text, flags=re.S)


def _first_diff_line(a: str, b: str):
    """(1-based line, reference line, built line) of the first differing line, or None."""
    la, lb = a.split("\n"), b.split("\n")
    for i, (x, y) in enumerate(zip(la, lb), 1):
        if x != y:
            return i, x, y
    if len(la) != len(lb):
        n = min(len(la), len(lb))
        return n + 1, la[n] if n < len(la) else "<end>", lb[n] if n < len(lb) else "<end>"
    return None


def verify(reference: Path) -> None:
    """Diff dist/presenter.html against the last promoted build, payload by
    payload, and say precisely where they differ. Any deliberate change makes
    this fail until --promote; that is the point -- it is a "what changed since
    the build we last checked and shipped" report, not a pass/fail gate."""
    if not reference.exists():
        raise SystemExit(f"verify: reference missing ({reference.name}). Browser-check the current "
                         "build, then run `python build.py --promote` to establish it.")
    built = read(DIST / "presenter.html")
    ref = read(reference)
    if built == ref:
        print(f"verify: dist/presenter.html is byte-identical to reference/{reference.name}")
        return

    print(f"verify: dist differs from reference/{reference.name}:")
    pb, pr = _payloads(built), _payloads(ref)
    if _mask_payloads(built) != _mask_payloads(ref):
        d = _first_diff_line(_mask_payloads(ref), _mask_payloads(built))
        print(f"  wrapper text differs (line {d[0]})" if d else "  wrapper text differs")
    for kind in ("page_order", "ext_resources"):
        if pb[kind] != pr[kind]:
            print(f"  {kind}: {pr[kind]!r} -> {pb[kind]!r}")
    mb, mr = json.loads(pb["manifest"]), json.loads(pr["manifest"])
    for uuid in sorted(set(mb) | set(mr)):
        if uuid not in mr:
            print(f"  manifest: asset {uuid} ADDED ({mb[uuid]['mime']})")
        elif uuid not in mb:
            print(f"  manifest: asset {uuid} REMOVED ({mr[uuid]['mime']})")
        elif mb[uuid] != mr[uuid]:
            print(f"  manifest: asset {uuid} CHANGED ({mb[uuid]['mime']})")
    tb, tr = json.loads(pb["template"]), json.loads(pr["template"])
    if tb != tr:
        d = _first_diff_line(tr, tb)
        print(f"  template: {tr.count(chr(10)) + 1} -> {tb.count(chr(10)) + 1} lines; first difference at line {d[0]}:")
        print(f"     ref  : {d[1][:150]!r}")
        print(f"     built: {d[2][:150]!r}")
    raise SystemExit("verify: dist differs from the reference (see above). If every difference "
                     "is intended, browser-check the build and run --promote.")


def promote() -> None:
    src = DIST / "presenter.html"
    if not src.exists():
        raise SystemExit("promote: build first")
    REFERENCE.parent.mkdir(parents=True, exist_ok=True)
    REFERENCE.write_bytes(src.read_bytes())
    print(f"promoted dist/presenter.html -> reference/{REFERENCE.name} ({src.stat().st_size:,} bytes)")


def source_files():
    yield ROOT / "build.py"
    yield ROOT / "wrapper" / "loader.html"
    for base in (SRC, ROOT / "vendor", ROOT / "assets"):
        for p in base.rglob("*"):
            if p.is_file():
                yield p


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--verify", action="store_true",
                    help="diff dist output against reference/presenter.reference.html (last promoted build)")
    ap.add_argument("--promote", action="store_true",
                    help="after building, copy dist/presenter.html over the reference")
    ap.add_argument("--watch", action="store_true", help="rebuild on source changes")
    ap.add_argument("--site", metavar="DIR", default=str(SITE_DEFAULT),
                    help="folder for the site output (default: the platform repo's public/)")
    ap.add_argument("--no-site", action="store_true", help="skip the site output")
    args = ap.parse_args()
    if args.watch and args.promote:
        ap.error("--promote is a one-off after a browser-checked build; it cannot be combined with --watch")
    site_dir = None if args.no_site else Path(args.site).resolve()

    def run_once():
        out = build_dist()
        build_dev()
        node_check()
        print(f"built dist/presenter.html ({len(out):,} chars) and dev.html")
        if site_dir is not None:
            shell = build_site(site_dir)
            print(f"built site output: {site_dir / 'presenter.html'} ({len(shell):,} chars) "
                  f"+ {site_dir / SITE_ASSET_DIR}/ ({len(ASSETS)} files)")
        # verify BEFORE promote so the change report is always seen when both are given
        if args.verify:
            try:
                verify(REFERENCE)
            except SystemExit as e:
                if not args.promote:
                    raise
                print(e)
                print("  (--promote given: adopting this build as the new reference)")
        if args.promote:
            promote()

    def scan():
        # a file can vanish between rglob and stat (rename/delete mid-scan)
        out = {}
        for p in source_files():
            try:
                out[p] = p.stat().st_mtime
            except OSError:
                pass
        return out

    if not args.watch:
        run_once()
        return
    # watch mode: a verify difference or a broken build must never stop the watcher
    try:
        run_once()
    except (SystemExit, OSError) as e:
        print(f"(still watching) {e}")
    print("watching for changes (Ctrl+C to stop)...")
    stamp = scan()
    while True:
        time.sleep(0.7)
        now = scan()
        if now != stamp:
            stamp = now
            print("\nchange detected -> rebuilding")
            try:
                run_once()
            except (SystemExit, OSError) as e:
                print(f"(still watching) {e}")


if __name__ == "__main__":
    main()
