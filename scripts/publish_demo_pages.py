"""Publish the verified demo ZIP to origin/gh-pages without changing the checkout."""

import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import subprocess
import tempfile
import zipfile


root = Path(__file__).resolve().parent.parent


def git(*args, data=None, env=None):
    return subprocess.check_output(
        ["git", *args], cwd=root, input=data, env=env
    ).decode().strip()


archive = root / "deployments/salamatban-demo.zip"
manifest = json.loads((archive.with_suffix(".json")).read_text())
if hashlib.sha256(archive.read_bytes()).hexdigest() != manifest["sha256"]:
    raise SystemExit("ZIP checksum does not match the deployment manifest")

with zipfile.ZipFile(archive) as bundle:
    files = {}
    for entry in bundle.infolist():
        name = entry.filename
        if entry.is_dir() or name == ".htaccess":
            continue
        if (PurePosixPath(name).is_absolute() or ".." in PurePosixPath(name).parts
                or any(c in name for c in "\n\r\t\\") or name in files):
            raise SystemExit(f"Invalid archive path: {name!r}")
        files[name] = bundle.read(entry)
if not {"index.html", "app.js", "app.css", "sql-wasm.wasm"} <= files.keys():
    raise SystemExit("Demo archive is missing required files")
files[".nojekyll"] = b""

ref = "refs/heads/gh-pages"
previous = git("ls-remote", "origin", ref)
parent = previous.split()[0] if previous else None
if parent:
    git("fetch", "origin", ref)

with tempfile.TemporaryDirectory(prefix="salamatban-pages-") as temp:
    index_env = dict(os.environ, GIT_INDEX_FILE=str(Path(temp) / "index"))
    if parent:
        git("read-tree", parent, env=index_env)
        # Updating the app must preserve the separately published presentation.
        stale = [name for name in git("ls-files", "-z", env=index_env).split("\0") if name and not name.startswith(("showcase/","previews/"))]
        if stale:
            git("update-index", "--force-remove", "-z", "--stdin", data=("\0".join(stale)+"\0").encode(), env=index_env)
    else:
        git("read-tree", "--empty", env=index_env)
    for name, contents in sorted(files.items()):
        blob = git("hash-object", "-w", "--stdin", data=contents)
        git("update-index", "--add", "--cacheinfo", "100644", blob, name, env=index_env)
    tree = git("write-tree", env=index_env)

if parent and tree == git("rev-parse", f"{parent}^{{tree}}"):
    print("origin/gh-pages already contains this demo")
else:
    args = ["commit-tree", tree]
    if parent:
        args.extend(["-p", parent])
    commit = git(*args, data=f"Publish browser demo {manifest['sha256'][:12]}\n".encode())
    git("push", "origin", f"{commit}:{ref}")
    print(f"Published demo files to origin/gh-pages at {commit}")
print("Pages source must be configured as gh-pages / (root) in repository settings.")
