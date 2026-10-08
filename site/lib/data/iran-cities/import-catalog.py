"""Reproduce the checked-in city snapshot from its pinned upstream checkout."""
import csv
import hashlib
import json
import sys
from pathlib import Path

target = Path(__file__).resolve().parent
source = Path(sys.argv[1]) if len(sys.argv) == 2 else None
if source is None:
    raise SystemExit("Usage: python3 import-catalog.py /path/to/iran-cities")
metadata = json.loads((target / "SOURCE.json").read_text())
for item in metadata["files"]:
    actual = hashlib.sha256((source / item["path"]).read_bytes()).hexdigest()
    if actual != item["sha256"]:
        raise SystemExit(f"Source checksum mismatch: {item['path']}")

csv_root = source / "releases/v3.0/csv"
with (csv_root / "shahrestan.csv").open() as stream:
    counties = {row["id"]: row for row in csv.DictReader(stream)}
with (csv_root / "shahr.csv").open() as stream:
    rows = list(csv.DictReader(stream))
items = [dict(sourceId=row["id"], name=row["name"], provinceCode=int(row["ostan"]),
              county=counties[row["shahrestan"]]["name"])
         for row in rows if row["shahr_type"] == "0"]
districts = [row for row in rows if row["id"] in metadata["consolidation"]["sourceDistrictIds"]]
assert len(districts) == 2 and all(row["shahrestan"] == "304" and row["shahr_type"] == "2" for row in districts)
items.append(dict(sourceId="county-304", name=counties["304"]["name"], provinceCode=5, county=counties["304"]["name"]))
assert len(items) == metadata["selectableCityCount"]
output = "[\n" + ",\n".join("  " + json.dumps(item, ensure_ascii=False, separators=(",", ":")) for item in items) + "\n]\n"
assert hashlib.sha256(output.encode()).hexdigest() == metadata["catalogSha256"]
(target / "catalog.json").write_text(output)
print(f"Reproduced {len(items)} cities; source and catalog SHA-256 verified.")
